import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting cleanup of archived clients older than 5 days...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date 5 days ago
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    // Find clients that were archived more than 5 days ago
    const { data: clientsToDelete, error: fetchError } = await supabase
      .from('clients')
      .select('id, name, email, deleted_at')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', fiveDaysAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching archived clients:', fetchError);
      throw fetchError;
    }

    if (!clientsToDelete || clientsToDelete.length === 0) {
      console.log('No archived clients older than 5 days found');
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: 'No clients to clean up' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${clientsToDelete.length} archived clients to permanently delete`);

    // Delete each client and their related data
    const deletedClients: string[] = [];
    const errors: string[] = [];

    for (const client of clientsToDelete) {
      try {
        // Delete related records first (cascade should handle most, but be explicit)
        // Delete billing records
        await supabase.from('billing_records').delete().eq('client_id', client.id);
        
        // Delete wallet
        await supabase.from('client_wallets').delete().eq('client_id', client.id);
        
        // Delete onboarding tasks
        await supabase.from('onboarding_tasks').delete().eq('client_id', client.id);
        
        // Delete onboarding checklist
        await supabase.from('onboarding_checklist').delete().eq('client_id', client.id);
        
        // Delete chat conversations and messages
        const { data: conversation } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('client_id', client.id)
          .maybeSingle();
        
        if (conversation) {
          await supabase.from('chat_messages').delete().eq('conversation_id', conversation.id);
          await supabase.from('chat_conversations').delete().eq('id', conversation.id);
        }

        // Finally delete the client
        const { error: deleteError } = await supabase
          .from('clients')
          .delete()
          .eq('id', client.id);

        if (deleteError) {
          console.error(`Error deleting client ${client.name}:`, deleteError);
          errors.push(`${client.name}: ${deleteError.message}`);
        } else {
          console.log(`Permanently deleted client: ${client.name} (${client.email})`);
          deletedClients.push(client.name);
        }
      } catch (err) {
        console.error(`Error processing client ${client.name}:`, err);
        errors.push(`${client.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedClients.length,
        deletedClients,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
