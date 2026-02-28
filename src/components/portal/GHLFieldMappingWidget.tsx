import { useState, useEffect } from 'react';
import { RefreshCw, Check, AlertTriangle, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FieldMapping {
  id: string;
  client_id: string;
  location_id: string;
  field_name: string;
  ghl_field_id: string | null;
  ghl_field_name: string | null;
  ghl_field_key: string | null;
  is_auto_matched: boolean;
  last_synced_at: string;
}

interface AvailableField {
  id: string;
  location_id: string;
  field_id: string;
  field_name: string;
  field_key: string | null;
  field_type: string | null;
}

interface GHLFieldMappingWidgetProps {
  clientId: string;
  locationId: string | null;
  extraHeaderActions?: React.ReactNode;
}

// Note: State and Timezone are native GHL contact fields - no mapping needed
const REQUIRED_FIELDS = [
  { name: 'savings', label: 'Savings', description: 'Monthly savings amount' },
  { name: 'investments', label: 'Investments', description: 'Investment interests' },
  { name: 'employment', label: 'Employment', description: 'Employment status/income' },
  { name: 'interest', label: 'Interest', description: 'Goals and interests' },
  { name: 'age', label: 'Age', description: 'Contact\'s age' },
  { name: 'fallback', label: 'Fallback', description: 'Complete lead data backup' },
];

export function GHLFieldMappingWidget({ clientId, locationId, extraHeaderActions }: GHLFieldMappingWidgetProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [bulkSyncProgress, setBulkSyncProgress] = useState(0);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Load existing mappings on mount
  useEffect(() => {
    if (clientId) {
      loadMappings();
    }
  }, [clientId]);

  const loadMappings = async () => {
    setIsLoading(true);
    try {
      // Fetch mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('ghl_custom_field_mappings')
        .select('*')
        .eq('client_id', clientId);

      if (mappingsError) throw mappingsError;
      setMappings(mappingsData || []);

      if (mappingsData && mappingsData.length > 0) {
        setLastSyncedAt(mappingsData[0].last_synced_at);
        
        // Fetch available fields for the location
        const { data: fieldsData } = await supabase
          .from('ghl_available_fields')
          .select('*')
          .eq('location_id', mappingsData[0].location_id)
          .order('field_name');

        setAvailableFields(fieldsData || []);
      }
    } catch (error) {
      console.error('Failed to load mappings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!locationId) {
      toast.error('No subaccount ID configured for this client');
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghl-sync-custom-fields', {
        body: { clientId, locationId },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setMappings(data.mappings || []);
      setAvailableFields(data.availableFields || []);
      setLastSyncedAt(new Date().toISOString());
      setPendingChanges({});

      toast.success(`Synced ${data.matchedCount}/${data.totalRequired} fields matched`);
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast.error(error.message || 'Failed to sync custom fields');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBulkSync = async () => {
    setIsBulkSyncing(true);
    setBulkSyncProgress(0);

    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, subaccount_id')
        .not('subaccount_id', 'is', null)
        .neq('subaccount_id', '')
        .order('name');

      if (error) throw error;

      if (!clients || clients.length === 0) {
        toast.info('No clients have a Subaccount ID configured');
        return;
      }

      let successCount = 0;

      for (let i = 0; i < clients.length; i++) {
        const c = clients[i];
        setBulkSyncProgress(Math.round(((i + 1) / clients.length) * 100));

        const { data, error: syncError } = await supabase.functions.invoke('ghl-sync-custom-fields', {
          body: { clientId: c.id, locationId: c.subaccount_id },
        });

        if (!syncError && !data?.error) successCount++;
      }

      toast.success(`Bulk sync complete: ${successCount}/${clients.length} clients`);
    } catch (error: any) {
      console.error('Bulk sync failed:', error);
      toast.error(error.message || 'Bulk sync failed');
    } finally {
      setIsBulkSyncing(false);
      setBulkSyncProgress(0);
    }
  };

  const handleFieldChange = (fieldName: string, ghlFieldId: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [fieldName]: ghlFieldId,
    }));
  };

  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    setIsLoading(true);
    try {
      for (const [fieldName, ghlFieldId] of Object.entries(pendingChanges)) {
        const selectedField = availableFields.find(f => f.field_id === ghlFieldId);
        
        const { error } = await supabase
          .from('ghl_custom_field_mappings')
          .upsert({
            client_id: clientId,
            location_id: locationId!,
            field_name: fieldName,
            ghl_field_id: ghlFieldId === 'none' ? null : ghlFieldId,
            ghl_field_name: selectedField?.field_name || null,
            ghl_field_key: selectedField?.field_key || null,
            is_auto_matched: false,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'client_id,field_name',
          });

        if (error) throw error;
      }

      setPendingChanges({});
      await loadMappings();
      toast.success('Field mappings saved');
    } catch (error: any) {
      console.error('Failed to save mappings:', error);
      toast.error('Failed to save mappings');
    } finally {
      setIsLoading(false);
    }
  };

  const getMappingForField = (fieldName: string): FieldMapping | undefined => {
    return mappings.find(m => m.field_name === fieldName);
  };

  const getSelectedValue = (fieldName: string): string => {
    if (pendingChanges[fieldName]) {
      return pendingChanges[fieldName];
    }
    const mapping = getMappingForField(fieldName);
    return mapping?.ghl_field_id || 'none';
  };

  const getStatusBadge = (fieldName: string) => {
    const mapping = getMappingForField(fieldName);
    const hasPendingChange = pendingChanges[fieldName];

    if (hasPendingChange) {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Settings2 className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }

    if (!mapping || !mapping.ghl_field_id) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Not Mapped
        </Badge>
      );
    }

    if (mapping.is_auto_matched) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <Check className="w-3 h-3 mr-1" />
          Auto
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
        <Settings2 className="w-3 h-3 mr-1" />
        Manual
      </Badge>
    );
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;
  const unmappedCount = REQUIRED_FIELDS.filter(f => !getMappingForField(f.name)?.ghl_field_id).length;

  if (!locationId) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-sm font-medium">CRM Custom Field Mapping</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure a Subaccount ID first to enable custom field mapping.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-medium">CRM Custom Field Mapping</h3>
            <p className="text-xs text-muted-foreground">
              Map lead fields to GHL custom fields for this agent's CRM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {extraHeaderActions}
          {unmappedCount > 0 && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              {unmappedCount} unmapped
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkSync}
            disabled={isBulkSyncing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1.5", isBulkSyncing && "animate-spin")} />
            Bulk Sync
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1.5", isSyncing && "animate-spin")} />
            {mappings.length === 0 ? 'Sync Fields' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Bulk Sync Progress */}
      {isBulkSyncing && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Bulk syncing all clients… {bulkSyncProgress}%</p>
          <Progress value={bulkSyncProgress} />
        </div>
      )}

      {/* Last Synced */}
      {lastSyncedAt && (
        <p className="text-xs text-muted-foreground">
          Last synced: {new Date(lastSyncedAt).toLocaleString()}
        </p>
      )}

      {/* Mapping Table */}
      {mappings.length > 0 || availableFields.length > 0 ? (
        <div className="space-y-3">
          {REQUIRED_FIELDS.map((field) => (
            <div
              key={field.name}
              className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{field.label}</span>
                  {getStatusBadge(field.name)}
                </div>
                <p className="text-xs text-muted-foreground truncate">{field.description}</p>
              </div>
              <Select
                value={getSelectedValue(field.name)}
                onValueChange={(value) => handleFieldChange(field.name, value)}
              >
                <SelectTrigger className="w-[220px] h-8 text-xs">
                  <SelectValue placeholder="Select GHL field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Not mapped</span>
                  </SelectItem>
                  {availableFields.map((f) => (
                    <SelectItem key={f.field_id} value={f.field_id}>
                      <div className="flex items-center gap-2">
                        <span>{f.field_name}</span>
                        {f.field_type && (
                          <span className="text-[10px] text-muted-foreground">
                            ({f.field_type})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Save Button */}
          {hasPendingChanges && (
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1.5" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <Settings2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            No fields synced yet. Click "Sync Fields" to fetch custom fields from GHL.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1.5", isSyncing && "animate-spin")} />
            Sync Fields Now
          </Button>
        </div>
      )}
    </div>
  );
}
