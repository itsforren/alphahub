import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Settings2, Loader2, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientWithWallet {
  id: string;
  name: string;
  low_balance_threshold: number | null;
  safe_mode_threshold: number | null;
  auto_charge_amount: number | null;
  monthly_ad_spend_cap: number | null;
}

export function BulkThresholdUpdate() {
  const queryClient = useQueryClient();

  // Fetch all auto_stripe clients with auto_billing_enabled
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['bulk-threshold-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_wallets')
        .select('client_id, low_balance_threshold, safe_mode_threshold, auto_charge_amount, monthly_ad_spend_cap')
        .eq('billing_mode', 'auto_stripe')
        .eq('auto_billing_enabled', true);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get client names
      const clientIds = data.map((w: any) => w.client_id);
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      const nameMap = new Map(clientData?.map((c: any) => [c.id, c.name]) || []);

      return data.map((w: any) => ({
        id: w.client_id,
        name: nameMap.get(w.client_id) || w.client_id,
        low_balance_threshold: w.low_balance_threshold,
        safe_mode_threshold: w.safe_mode_threshold,
        auto_charge_amount: w.auto_charge_amount,
        monthly_ad_spend_cap: w.monthly_ad_spend_cap,
      })) as ClientWithWallet[];
    },
  });

  // Selection state
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Field values
  const [chargeThreshold, setChargeThreshold] = useState('150');
  const [safeModeThreshold, setSafeModeThreshold] = useState('100');
  const [autoChargeAmount, setAutoChargeAmount] = useState('250');
  const [monthlyCap, setMonthlyCap] = useState('');

  // Field toggles (only checked fields are applied)
  const [updateChargeThreshold, setUpdateChargeThreshold] = useState(false);
  const [updateSafeModeThreshold, setUpdateSafeModeThreshold] = useState(false);
  const [updateAutoChargeAmount, setUpdateAutoChargeAmount] = useState(false);
  const [updateMonthlyCap, setUpdateMonthlyCap] = useState(false);

  // UI state
  const [showConfirm, setShowConfirm] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchQuery) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, searchQuery]);

  const hasFieldSelected = updateChargeThreshold || updateSafeModeThreshold || updateAutoChargeAmount || updateMonthlyCap;
  const canApply = selectedClients.size > 0 && hasFieldSelected;

  // Collect labels of fields being updated for confirmation dialog
  const updatingFieldNames = [
    updateChargeThreshold && 'Charge Threshold',
    updateSafeModeThreshold && 'Safe Mode Threshold',
    updateAutoChargeAmount && 'Recharge Amount',
    updateMonthlyCap && 'Monthly Cap',
  ].filter(Boolean);

  // Threshold validation
  const thresholdError =
    updateChargeThreshold &&
    updateSafeModeThreshold &&
    parseFloat(safeModeThreshold) >= parseFloat(chargeThreshold)
      ? 'Safe mode threshold must be lower than charge threshold.'
      : null;

  const toggleClient = (id: string) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedClients(new Set(filteredClients.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedClients(new Set());
  };

  const handleApply = async () => {
    setShowConfirm(false);
    setIsApplying(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let successCount = 0;

      for (const clientId of selectedClients) {
        const updates: Record<string, any> = {};
        if (updateChargeThreshold) updates.low_balance_threshold = parseFloat(chargeThreshold);
        if (updateSafeModeThreshold) updates.safe_mode_threshold = parseFloat(safeModeThreshold);
        if (updateAutoChargeAmount) updates.auto_charge_amount = parseFloat(autoChargeAmount);
        if (updateMonthlyCap) updates.monthly_ad_spend_cap = monthlyCap ? parseFloat(monthlyCap) : null;

        // Get current values for audit trail
        const { data: currentWallet } = await supabase
          .from('client_wallets')
          .select('low_balance_threshold, safe_mode_threshold, auto_charge_amount, monthly_ad_spend_cap')
          .eq('client_id', clientId)
          .maybeSingle();

        // Apply updates
        const { error: updateError } = await supabase
          .from('client_wallets')
          .update(updates)
          .eq('client_id', clientId);

        if (updateError) {
          console.error(`Failed to update client ${clientId}:`, updateError);
          continue;
        }

        // Write audit trail entries per client per changed field
        const auditEntries = Object.entries(updates).map(([field, newValue]) => ({
          client_id: clientId,
          changed_by: user?.id || null,
          change_source: 'bulk_update',
          field_name: field,
          old_value: (currentWallet as any)?.[field]?.toString() || null,
          new_value: newValue?.toString() || null,
        }));

        if (auditEntries.length > 0) {
          await supabase.from('billing_settings_audit').insert(auditEntries);
        }

        successCount++;
      }

      toast.success(`Updated ${successCount} client${successCount === 1 ? '' : 's'}`);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['client-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['billing-audit-log'] });
      queryClient.invalidateQueries({ queryKey: ['billing-audit-inline'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-threshold-clients'] });

      // Reset selection
      setSelectedClients(new Set());
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply bulk update');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="w-4 h-4 text-primary" />
            Bulk Threshold Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client selection */}
          <div className="space-y-2">
            <Label>Select Clients</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll} className="text-xs">
                Deselect All
              </Button>
              <span className="text-xs text-muted-foreground self-center ml-auto">
                {selectedClients.size} selected
              </span>
            </div>

            {clientsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : !filteredClients || filteredClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No auto-billing clients found.
              </p>
            ) : (
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-1">
                  {filteredClients.map((client) => (
                    <label
                      key={client.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={() => toggleClient(client.id)}
                      />
                      <span className="text-sm flex-1 truncate">{client.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        ${client.low_balance_threshold ?? 150} / ${client.safe_mode_threshold ?? 100}
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Threshold fields with per-field toggles */}
          <div className="space-y-3 border-t pt-3">
            <Label className="text-xs text-muted-foreground">Check fields to update:</Label>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="update-charge"
                  checked={updateChargeThreshold}
                  onCheckedChange={(v) => setUpdateChargeThreshold(!!v)}
                />
                <Label htmlFor="update-charge" className="text-sm flex-1 cursor-pointer">Charge Threshold ($)</Label>
                <Input
                  type="number"
                  min="50"
                  step="25"
                  value={chargeThreshold}
                  onChange={(e) => setChargeThreshold(e.target.value)}
                  disabled={!updateChargeThreshold}
                  className="h-8 w-24"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="update-safemode"
                  checked={updateSafeModeThreshold}
                  onCheckedChange={(v) => setUpdateSafeModeThreshold(!!v)}
                />
                <Label htmlFor="update-safemode" className="text-sm flex-1 cursor-pointer">Safe Mode Threshold ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="25"
                  value={safeModeThreshold}
                  onChange={(e) => setSafeModeThreshold(e.target.value)}
                  disabled={!updateSafeModeThreshold}
                  className="h-8 w-24"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="update-recharge"
                  checked={updateAutoChargeAmount}
                  onCheckedChange={(v) => setUpdateAutoChargeAmount(!!v)}
                />
                <Label htmlFor="update-recharge" className="text-sm flex-1 cursor-pointer">Recharge Amount ($)</Label>
                <Input
                  type="number"
                  min="50"
                  step="50"
                  value={autoChargeAmount}
                  onChange={(e) => setAutoChargeAmount(e.target.value)}
                  disabled={!updateAutoChargeAmount}
                  className="h-8 w-24"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="update-cap"
                  checked={updateMonthlyCap}
                  onCheckedChange={(v) => setUpdateMonthlyCap(!!v)}
                />
                <Label htmlFor="update-cap" className="text-sm flex-1 cursor-pointer">Monthly Cap ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="No cap"
                  value={monthlyCap}
                  onChange={(e) => setMonthlyCap(e.target.value)}
                  disabled={!updateMonthlyCap}
                  className="h-8 w-24"
                />
              </div>
            </div>

            {thresholdError && (
              <p className="text-xs text-red-500 font-medium">{thresholdError}</p>
            )}
          </div>

          <Button
            onClick={() => setShowConfirm(true)}
            size="sm"
            disabled={!canApply || isApplying || !!thresholdError}
            className="w-full"
          >
            {isApplying ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Settings2 className="w-4 h-4 mr-1" />
            )}
            Apply to {selectedClients.size} client{selectedClients.size === 1 ? '' : 's'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Update</AlertDialogTitle>
            <AlertDialogDescription>
              Update <strong>{updatingFieldNames.join(', ')}</strong> for{' '}
              <strong>{selectedClients.size}</strong> client{selectedClients.size === 1 ? '' : 's'}?
              <br />
              <br />
              This action will be recorded in the audit log as a bulk update.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply}>Apply Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
