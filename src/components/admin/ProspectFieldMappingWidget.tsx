import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Save, Link2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FieldMapping {
  id?: string;
  internal_field_name: string;
  ghl_field_id: string | null;
  ghl_field_key: string | null;
  ghl_field_name: string | null;
  is_enabled: boolean;
}

interface AvailableField {
  id: string;
  field_id: string;
  field_key: string;
  field_name: string;
  field_type: string | null;
}

const GHL_PROSPECT_LOCATION_ID = "wDoj91sbkfxZnMbow2G5";

// Internal fields that need to be mapped to GHL custom fields
const REQUIRED_FIELDS = [
  { name: "prospect_id", label: "Prospect ID", category: "Identity" },
  { name: "visitor_id", label: "Visitor ID", category: "Identity" },
  { name: "stage", label: "Stage", category: "Stage" },
  { name: "qualified_path", label: "Qualified Path", category: "Stage" },
  { name: "utm_source", label: "UTM Source", category: "Attribution" },
  { name: "utm_medium", label: "UTM Medium", category: "Attribution" },
  { name: "utm_campaign", label: "UTM Campaign", category: "Attribution" },
  { name: "utm_content", label: "UTM Content", category: "Attribution" },
  { name: "utm_term", label: "UTM Term", category: "Attribution" },
  { name: "utm_id", label: "UTM ID", category: "Attribution" },
  { name: "g_clid", label: "Google Click ID (gclid)", category: "Attribution" },
  { name: "fb_clid", label: "Facebook Click ID (fbclid)", category: "Attribution" },
  { name: "tt_clid", label: "TikTok Click ID (ttclid)", category: "Attribution" },
  { name: "referrer_url", label: "Referrer URL", category: "Attribution" },
  { name: "first_referrer_url", label: "First Referrer URL", category: "Attribution" },
  { name: "referring_agent_id", label: "Referring Agent ID", category: "Referral" },
  { name: "referral_code", label: "Referral Code", category: "Referral" },
  { name: "licensed_status", label: "Licensed Status", category: "Qualification" },
  { name: "states_licensed", label: "States Licensed", category: "Qualification" },
  { name: "monthly_budget_range", label: "Monthly Budget Range", category: "Qualification" },
  { name: "payment_plan_interest", label: "Payment Plan Interest", category: "Qualification" },
  { name: "credit_available", label: "Payment Plan Credit Available ($4,000+)", category: "Qualification" },
  { name: "meets_minimum_budget", label: "Meets Minimum Budget ($2,500+)", category: "Qualification" },
  { name: "desired_timeline", label: "Desired Start Timeline", category: "Application" },
  { name: "current_bottleneck", label: "Current Bottleneck", category: "Application" },
  { name: "manual_source", label: "Self-reported Source", category: "Application" },
  { name: "manual_referrer_agent_name", label: "Manual Referrer Agent Name", category: "Application" },
];

export default function ProspectFieldMappingWidget() {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, { ghl_field_id: string; ghl_field_key: string; ghl_field_name: string }>>({});
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    setIsLoading(true);
    try {
      // Load existing mappings
      const { data: existingMappings, error: mappingsError } = await supabase
        .from("prospect_field_mappings")
        .select("*")
        .eq("location_id", GHL_PROSPECT_LOCATION_ID);

      if (mappingsError) throw mappingsError;

      // Load available fields
      const { data: fields, error: fieldsError } = await supabase
        .from("prospect_available_fields")
        .select("*")
        .eq("location_id", GHL_PROSPECT_LOCATION_ID)
        .order("field_name");

      if (fieldsError) throw fieldsError;

      setMappings(existingMappings || []);
      setAvailableFields(fields || []);

      // Get last sync time from the most recent field
      if (fields && fields.length > 0) {
        const mostRecent = fields.reduce((a, b) => 
          new Date(a.updated_at) > new Date(b.updated_at) ? a : b
        );
        setLastSyncedAt(mostRecent.updated_at);
      }
    } catch (error) {
      console.error("Error loading mappings:", error);
      toast.error("Failed to load field mappings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-sync-custom-fields", {
        body: { location_id: GHL_PROSPECT_LOCATION_ID }
      });

      if (error) throw error;

      toast.success(`Synced ${data?.fields_count || 0} custom fields from GHL`);
      await loadMappings();
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync fields from GHL");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFieldChange = (internalField: string, ghlFieldId: string) => {
    const selectedField = availableFields.find((f) => f.field_id === ghlFieldId);
    if (selectedField) {
      setPendingChanges((prev) => ({
        ...prev,
        [internalField]: {
          ghl_field_id: selectedField.field_id,
          ghl_field_key: selectedField.field_key,
          ghl_field_name: selectedField.field_name,
        },
      }));
    } else if (ghlFieldId === "__none__") {
      setPendingChanges((prev) => ({
        ...prev,
        [internalField]: {
          ghl_field_id: "",
          ghl_field_key: "",
          ghl_field_name: "",
        },
      }));
    }
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    setIsSaving(true);
    try {
      for (const [internalField, ghlData] of Object.entries(pendingChanges)) {
        const { error } = await supabase
          .from("prospect_field_mappings")
          .upsert({
            location_id: GHL_PROSPECT_LOCATION_ID,
            internal_field_name: internalField,
            ghl_field_id: ghlData.ghl_field_id || null,
            ghl_field_key: ghlData.ghl_field_key || null,
            ghl_field_name: ghlData.ghl_field_name || null,
            is_enabled: true,
          }, {
            onConflict: "location_id,internal_field_name"
          });

        if (error) throw error;
      }

      toast.success("Field mappings saved successfully");
      setPendingChanges({});
      await loadMappings();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save field mappings");
    } finally {
      setIsSaving(false);
    }
  };

  const getMappingForField = (internalField: string): FieldMapping | undefined => {
    return mappings.find(m => m.internal_field_name === internalField);
  };

  const getSelectedValue = (internalField: string): string => {
    // Check pending changes first
    if (pendingChanges[internalField]) {
      return pendingChanges[internalField].ghl_field_id || "__none__";
    }
    // Then check saved mappings
    const mapping = getMappingForField(internalField);
    return mapping?.ghl_field_id || "__none__";
  };

  const getStatusBadge = (internalField: string) => {
    if (pendingChanges[internalField]) {
      return <Badge variant="outline" className="text-warning border-warning">Pending</Badge>;
    }
    const mapping = getMappingForField(internalField);
    if (!mapping || !mapping.ghl_field_id) {
      return <Badge variant="outline" className="text-destructive border-destructive">Unmapped</Badge>;
    }
    return <Badge variant="outline" className="text-primary border-primary">Mapped</Badge>;
  };

  // Group fields by category
  const groupedFields = REQUIRED_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof REQUIRED_FIELDS>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Prospect Custom Field Mapping
          </CardTitle>
          <CardDescription className="mt-1">
            Map application form fields to GHL custom fields for the prospect subaccount
          </CardDescription>
          {lastSyncedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last synced: {new Date(lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync GHL Fields
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {availableFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No GHL fields found.</p>
            <p className="text-sm text-muted-foreground">Click "Sync GHL Fields" to fetch custom fields from the subaccount.</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedFields).map(([category, fields]) => (
              <div key={category} className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  {category}
                </h4>
                <div className="space-y-2">
                  {fields.map((field) => (
                    <div
                      key={field.name}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{field.label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{field.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Select
                          value={getSelectedValue(field.name)}
                          onValueChange={(value) => handleFieldChange(field.name, value)}
                        >
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Select GHL field" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">-- Not mapped --</span>
                            </SelectItem>

                            {availableFields.map((ghlField) => (
                              <SelectItem key={ghlField.field_id} value={ghlField.field_id}>
                                {ghlField.field_name}
                                {ghlField.field_type && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({ghlField.field_type})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {getStatusBadge(field.name)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(pendingChanges).length > 0 && (
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes ({Object.keys(pendingChanges).length})
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
