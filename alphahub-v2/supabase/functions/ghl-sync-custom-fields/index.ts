import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Required custom fields to map with keywords for auto-matching
// Note: state and timezone are NATIVE GHL contact fields, not custom fields
const REQUIRED_FIELDS: Record<string, string[]> = {
  savings: ['savings', 'save', 'monthly savings'],
  investments: ['investment', 'invest', 'assets'],
  employment: ['employment', 'employ', 'job', 'income', 'occupation'],
  interest: ['interest', 'goal', 'objective'],
  age: ['age', 'birth', 'year', 'dob'],
  fallback: ['fallback', 'notes', 'details', 'all data', 'lead details', 'full lead'],
};

// Only match text-based fields for compatibility
const TEXT_FIELD_TYPES = ['TEXT', 'SINGLE_LINE', 'LARGE_TEXT', 'TEXTAREA', 'text', 'textbox'];

interface GHLCustomField {
  id: string;
  name: string;
  fieldKey?: string;
  dataType?: string;
  fieldType?: string;
}

interface FieldMapping {
  field_name: string;
  ghl_field_id: string | null;
  ghl_field_name: string | null;
  ghl_field_key: string | null;
  is_auto_matched: boolean;
}

// Find a field by matching keywords in name or key
function findFieldByKeywords(
  fields: GHLCustomField[], 
  keywords: string[]
): GHLCustomField | null {
  for (const field of fields) {
    const fieldType = (field.dataType || field.fieldType || '').toUpperCase();
    
    // Only match text-based fields
    if (!TEXT_FIELD_TYPES.some(t => fieldType.includes(t.toUpperCase()) || fieldType === '')) {
      continue;
    }
    
    const nameLower = (field.name || '').toLowerCase();
    const keyLower = (field.fieldKey || '').toLowerCase();
    
    for (const keyword of keywords) {
      const kwLower = keyword.toLowerCase();
      if (nameLower.includes(kwLower) || keyLower.includes(kwLower)) {
        return field;
      }
    }
  }
  return null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clientId, locationId } = await req.json();
    
    if (!clientId || !locationId) {
      return new Response(
        JSON.stringify({ error: 'Missing clientId or locationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing custom fields for client ${clientId}, location ${locationId}`);

    // Get the OAuth token (includes company_id)
    const { data: tokenData, error: tokenError } = await supabase
      .from('ghl_oauth_tokens')
      .select('access_token, expires_at, refresh_token, company_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      console.error('No GHL OAuth token found:', tokenError);
      return new Response(
        JSON.stringify({ error: 'GHL not connected. Please connect GHL OAuth first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = tokenData.company_id;
    console.log(`Using company_id: ${companyId}`);

    // Get location access token
    const locationTokenResponse = await fetch(
      `${supabaseUrl}/functions/v1/crm-location-token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId, locationId }),
      }
    );

    if (!locationTokenResponse.ok) {
      const errorText = await locationTokenResponse.text();
      console.error('Failed to get location token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get location access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenJson = await locationTokenResponse.json();
    const locationAccessToken =
      tokenJson.locationAccessToken ?? tokenJson.accessToken ?? tokenJson.access_token;

    if (!locationAccessToken) {
      console.error('Location token response missing access token:', tokenJson);
      return new Response(
        JSON.stringify({ error: 'Failed to get location access token (empty token)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch custom fields from GHL
    console.log('Fetching custom fields from GHL...');
    const customFieldsResponse = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${locationAccessToken}`,
          'Version': '2021-07-28',
          'Accept': 'application/json',
        },
      }
    );

    if (!customFieldsResponse.ok) {
      const errorText = await customFieldsResponse.text();
      console.error('Failed to fetch custom fields:', customFieldsResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch custom fields from GHL: ${customFieldsResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customFieldsData = await customFieldsResponse.json();
    const ghlFields: GHLCustomField[] = customFieldsData.customFields || [];
    
    console.log(`Found ${ghlFields.length} custom fields in GHL`);

    // Cache all available fields
    const now = new Date().toISOString();
    
    // Delete old cached fields for this location
    await supabase
      .from('ghl_available_fields')
      .delete()
      .eq('location_id', locationId);

    // Insert new fields
    if (ghlFields.length > 0) {
      const fieldsToInsert = ghlFields.map(f => ({
        location_id: locationId,
        field_id: f.id,
        field_name: f.name,
        field_key: f.fieldKey || null,
        field_type: f.dataType || f.fieldType || null,
        last_synced_at: now,
      }));

      const { error: insertError } = await supabase
        .from('ghl_available_fields')
        .insert(fieldsToInsert);

      if (insertError) {
        console.error('Failed to cache available fields:', insertError);
      }
    }

    // Auto-match fields and build mappings
    const mappings: FieldMapping[] = [];
    const matchLog: string[] = [];

    for (const [fieldName, keywords] of Object.entries(REQUIRED_FIELDS)) {
      const matchedField = findFieldByKeywords(ghlFields, keywords);
      
      if (matchedField) {
        matchLog.push(`✓ Matched '${fieldName}' -> '${matchedField.name}' (${matchedField.id})`);
        mappings.push({
          field_name: fieldName,
          ghl_field_id: matchedField.id,
          ghl_field_name: matchedField.name,
          ghl_field_key: matchedField.fieldKey || null,
          is_auto_matched: true,
        });
      } else {
        matchLog.push(`✗ No match found for '${fieldName}'`);
        mappings.push({
          field_name: fieldName,
          ghl_field_id: null,
          ghl_field_name: null,
          ghl_field_key: null,
          is_auto_matched: false,
        });
      }
    }

    console.log('Auto-match results:', matchLog.join('\n'));

    // Get existing mappings for this client
    const { data: existingMappings } = await supabase
      .from('ghl_custom_field_mappings')
      .select('field_name, ghl_field_id, is_auto_matched')
      .eq('client_id', clientId);

    const existingMap = new Map(existingMappings?.map(m => [m.field_name, m]) || []);

    // Upsert mappings (preserve manual overrides)
    for (const mapping of mappings) {
      const existing = existingMap.get(mapping.field_name);
      
      // If there's an existing manual mapping, keep it
      if (existing && existing.ghl_field_id && !existing.is_auto_matched) {
        console.log(`Preserving manual mapping for ${mapping.field_name}`);
        continue;
      }

      const { error: upsertError } = await supabase
        .from('ghl_custom_field_mappings')
        .upsert({
          client_id: clientId,
          location_id: locationId,
          field_name: mapping.field_name,
          ghl_field_id: mapping.ghl_field_id,
          ghl_field_name: mapping.ghl_field_name,
          ghl_field_key: mapping.ghl_field_key,
          is_auto_matched: mapping.is_auto_matched,
          last_synced_at: now,
          updated_at: now,
        }, {
          onConflict: 'client_id,field_name',
        });

      if (upsertError) {
        console.error(`Failed to upsert mapping for ${mapping.field_name}:`, upsertError);
      }
    }

    // Fetch final mappings to return
    const { data: finalMappings } = await supabase
      .from('ghl_custom_field_mappings')
      .select('*')
      .eq('client_id', clientId);

    // Fetch available fields for dropdown
    const { data: availableFields } = await supabase
      .from('ghl_available_fields')
      .select('*')
      .eq('location_id', locationId)
      .order('field_name');

    const matchedCount = mappings.filter(m => m.ghl_field_id).length;
    const totalRequired = Object.keys(REQUIRED_FIELDS).length;

    console.log(`Sync complete: ${matchedCount}/${totalRequired} fields matched`);

    return new Response(
      JSON.stringify({
        success: true,
        mappings: finalMappings,
        availableFields: availableFields,
        matchedCount,
        totalRequired,
        matchLog,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error syncing custom fields:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
