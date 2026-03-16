import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Wallet, Loader2, Info, Zap, RefreshCw, AlertCircle, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useClientWallet, useCreateOrUpdateWallet } from '@/hooks/useClientWallet';
import { useRechargeState } from '@/hooks/useRechargeState';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdSpendSetupCardProps {
  clientId: string;
}

// Field display name mapping for audit history
const fieldLabels: Record<string, string> = {
  low_balance_threshold: 'Charge Threshold',
  safe_mode_threshold: 'Safe Mode Threshold',
  auto_charge_amount: 'Recharge Amount',
  monthly_ad_spend_cap: 'Monthly Cap',
  auto_billing_enabled: 'Auto-Billing',
  billing_mode: 'Billing Mode',
};

const currencyFields = new Set([
  'low_balance_threshold',
  'safe_mode_threshold',
  'auto_charge_amount',
  'monthly_ad_spend_cap',
]);

function formatAuditValue(fieldName: string, value: string | null): string {
  if (value === null || value === '') return 'none';
  if (fieldName === 'auto_billing_enabled') return value === 'true' ? 'enabled' : 'disabled';
  if (currencyFields.has(fieldName)) return `$${value}`;
  return value;
}

/** Inline audit history for a single client */
function AuditHistoryInline({ clientId }: { clientId: string }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['billing-audit-inline', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_settings_audit')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2 text-center">
        No settings changes recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-1 pt-2 max-h-48 overflow-y-auto">
      {entries.map((entry: any) => (
        <div key={entry.id} className="text-xs text-muted-foreground flex items-start gap-1.5">
          <span className="shrink-0 text-muted-foreground/70">
            {format(new Date(entry.created_at), 'MMM d, h:mma')}
          </span>
          <span className="text-foreground/80">
            {fieldLabels[entry.field_name] || entry.field_name}:{' '}
            {formatAuditValue(entry.field_name, entry.old_value)} {'->'}  {formatAuditValue(entry.field_name, entry.new_value)}
          </span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
            {entry.change_source}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function AdSpendSetupCard({ clientId }: AdSpendSetupCardProps) {
  const { data: wallet, isLoading } = useClientWallet(clientId);
  const { data: rechargeState } = useRechargeState(clientId);
  const updateWallet = useCreateOrUpdateWallet();
  const queryClient = useQueryClient();

  const [monthlyCap, setMonthlyCap] = useState('');
  const [autoChargeAmount, setAutoChargeAmount] = useState('');
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [billingMode, setBillingMode] = useState<'manual' | 'auto_stripe'>('manual');
  const [chargeThreshold, setChargeThreshold] = useState('150');
  const [safeModeThreshold, setSafeModeThreshold] = useState('100');
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRefilling, setIsRefilling] = useState(false);

  useEffect(() => {
    if (wallet) {
      setMonthlyCap(wallet.monthly_ad_spend_cap?.toString() || '');
      setAutoChargeAmount(wallet.auto_charge_amount?.toString() || '');
      setAutoEnabled(wallet.auto_billing_enabled || false);
      setBillingMode((wallet as any).billing_mode || 'manual');
      setChargeThreshold(wallet.low_balance_threshold?.toString() || '150');
      setSafeModeThreshold((wallet as any).safe_mode_threshold?.toString() || '100');
    } else {
      setAutoChargeAmount('250');
      setAutoEnabled(true);
    }
  }, [wallet]);

  // Threshold validation
  const thresholdError =
    autoEnabled &&
    chargeThreshold &&
    safeModeThreshold &&
    parseFloat(safeModeThreshold) >= parseFloat(chargeThreshold)
      ? 'Safe mode threshold must be lower than charge threshold.'
      : null;

  const handleSave = async () => {
    if (thresholdError) {
      toast.error(thresholdError);
      return;
    }

    setIsSaving(true);
    try {
      const previousMode = (wallet as any)?.billing_mode || 'manual';
      const switchingToAuto = previousMode === 'manual' && billingMode === 'auto_stripe';

      // Build changes list for audit trail (before the save)
      const changes: Array<{ field_name: string; old_value: string | null; new_value: string | null }> = [];

      if (wallet?.low_balance_threshold?.toString() !== chargeThreshold) {
        changes.push({
          field_name: 'low_balance_threshold',
          old_value: wallet?.low_balance_threshold?.toString() || null,
          new_value: chargeThreshold || null,
        });
      }
      if ((wallet as any)?.safe_mode_threshold?.toString() !== safeModeThreshold) {
        changes.push({
          field_name: 'safe_mode_threshold',
          old_value: (wallet as any)?.safe_mode_threshold?.toString() || null,
          new_value: safeModeThreshold || null,
        });
      }
      if (wallet?.auto_charge_amount?.toString() !== autoChargeAmount) {
        changes.push({
          field_name: 'auto_charge_amount',
          old_value: wallet?.auto_charge_amount?.toString() || null,
          new_value: autoChargeAmount || null,
        });
      }
      if (wallet?.monthly_ad_spend_cap?.toString() !== (monthlyCap || '')) {
        changes.push({
          field_name: 'monthly_ad_spend_cap',
          old_value: wallet?.monthly_ad_spend_cap?.toString() || null,
          new_value: monthlyCap || null,
        });
      }
      const effectiveAutoEnabled = switchingToAuto ? false : autoEnabled;
      if (wallet?.auto_billing_enabled?.toString() !== effectiveAutoEnabled.toString()) {
        changes.push({
          field_name: 'auto_billing_enabled',
          old_value: wallet?.auto_billing_enabled?.toString() || 'false',
          new_value: effectiveAutoEnabled.toString(),
        });
      }
      if (((wallet as any)?.billing_mode || 'manual') !== billingMode) {
        changes.push({
          field_name: 'billing_mode',
          old_value: (wallet as any)?.billing_mode || 'manual',
          new_value: billingMode,
        });
      }

      await updateWallet.mutateAsync({
        client_id: clientId,
        monthly_ad_spend_cap: monthlyCap ? parseFloat(monthlyCap) : null,
        auto_charge_amount: autoChargeAmount ? parseFloat(autoChargeAmount) : null,
        auto_billing_enabled: switchingToAuto ? false : autoEnabled,
        billing_mode: billingMode,
        low_balance_threshold: chargeThreshold ? parseFloat(chargeThreshold) : 150,
        safe_mode_threshold: safeModeThreshold ? parseFloat(safeModeThreshold) : 100,
      });

      // Write audit trail entries for each changed field
      if (changes.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('billing_settings_audit').insert(
          changes.map((c) => ({
            client_id: clientId,
            changed_by: user?.id || null,
            change_source: 'admin',
            ...c,
          }))
        );
        // Refresh inline history if visible
        queryClient.invalidateQueries({ queryKey: ['billing-audit-inline', clientId] });
        queryClient.invalidateQueries({ queryKey: ['billing-audit-log'] });
      }

      if (switchingToAuto) {
        await supabase
          .from('clients')
          .update({ billing_cycle_start_at: new Date().toISOString() })
          .eq('id', clientId);
        toast.success('Billing mode set to Auto — client will need to complete payment setup');
      } else {
        toast.success('Ad spend settings saved');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-to-auto-billing', {
        body: { client_id: clientId },
      });

      if (error) throw error;

      switch (data.status) {
        case 'migrated':
          toast.success('Successfully migrated to auto-billing! Card and subscription are on file.');
          queryClient.invalidateQueries({ queryKey: ['client-wallet', clientId] });
          queryClient.invalidateQueries({ queryKey: ['payment-methods', clientId] });
          break;
        case 'needs_ad_spend_card':
          toast.error('No ad spend card on file. The client needs to add a payment card through the payment setup flow.');
          break;
        case 'needs_management_subscription':
          toast.error('No active management subscription found. The client needs to set up their management fee subscription first.');
          break;
        case 'needs_full_setup':
          toast.error('No card or subscription on file. The client needs to go through the full payment setup.');
          break;
        default:
          toast.error(data.error || 'Migration failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to migrate billing');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRefill = async () => {
    setIsRefilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('manual-wallet-refill', {
        body: { client_id: clientId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Wallet refilled — $${data.amount_charged} charged successfully`);
        queryClient.invalidateQueries({ queryKey: ['client-wallet', clientId] });
        queryClient.invalidateQueries({ queryKey: ['billing-records', clientId] });
        queryClient.invalidateQueries({ queryKey: ['wallet-transactions', clientId] });
      } else {
        toast.error(data.error || 'Refill failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to refill wallet');
    } finally {
      setIsRefilling(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isManual = billingMode === 'manual';
  const isAuto = billingMode === 'auto_stripe';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="w-4 h-4 text-primary" />
          Ad Spend Auto-Recharge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* RECH-02: Charging status indicator */}
        {rechargeState && autoEnabled && (
          <div className="flex items-center gap-2 flex-wrap">
            {rechargeState.state === 'charging' && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Charging...
              </Badge>
            )}
            {rechargeState.state === 'failed' && (
              <Badge variant="outline" className="border-red-500 text-red-600">
                Retry pending (attempt {rechargeState.attempt_number}/2)
              </Badge>
            )}
            {rechargeState.state === 'succeeded' && (
              <Badge variant="outline" className="border-green-500 text-green-600">
                Last charge succeeded
              </Badge>
            )}
            {rechargeState.safe_mode_active && (
              <Badge variant="destructive">
                Safe Mode Active
              </Badge>
            )}
          </div>
        )}

        {/* Migration banner for manual clients */}
        {isManual && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-200">Manual Billing Mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This client is on manual billing. If they already have a card and subscription on file, you can migrate them instantly.
                </p>
              </div>
            </div>
            <Button
              onClick={handleMigrate}
              size="sm"
              disabled={isMigrating}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isMigrating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              Migrate to Auto-Billing
            </Button>
          </div>
        )}

        {/* Refill button for auto clients */}
        {isAuto && (
          <Button
            onClick={handleRefill}
            variant="outline"
            size="sm"
            disabled={isRefilling}
            className="w-full"
          >
            {isRefilling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Refill Wallet Now
          </Button>
        )}

        {/* Billing Mode */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            Billing Mode
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">Manual: admin marks invoices paid. Auto: Stripe charges saved card automatically.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select value={billingMode} onValueChange={(v) => setBillingMode(v as any)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (Admin marks paid)</SelectItem>
              <SelectItem value="auto_stripe">Auto (Stripe charges card)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Monthly Cap */}
        <div className="space-y-1.5">
          <Label>Monthly Ad Spend Cap ($)</Label>
          <Input
            type="number"
            min="0"
            step="100"
            placeholder="e.g. 4000"
            value={monthlyCap}
            onChange={(e) => setMonthlyCap(e.target.value)}
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">Max total ad spend charges per month. Leave empty for no cap.</p>
        </div>

        {/* Auto-recharge toggle */}
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">Enable Auto-Recharge</Label>
          <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
        </div>

        {/* Auto-recharge settings (only when enabled) */}
        {autoEnabled && (
          <>
            {/* Recharge amount */}
            <div className="space-y-1.5">
              <Label>Recharge Amount ($)</Label>
              <Input
                type="number"
                min="50"
                step="50"
                placeholder="e.g. 500"
                value={autoChargeAmount}
                onChange={(e) => setAutoChargeAmount(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Amount charged when wallet drops below the charge threshold.
              </p>
            </div>

            {/* Charge Threshold */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Charge Threshold ($)
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px]">
                      <p className="text-xs">When wallet balance drops to this amount, the system attempts to auto-charge. Default: $150.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                min="50"
                step="25"
                placeholder="150"
                value={chargeThreshold}
                onChange={(e) => setChargeThreshold(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Balance level that triggers an automatic charge attempt.
              </p>
            </div>

            {/* Safe Mode Threshold */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Safe Mode Threshold ($)
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px]">
                      <p className="text-xs">When wallet balance drops to this amount, campaigns are set to $0.01 budgets to prevent overspend. Must be lower than charge threshold. Default: $100.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="number"
                min="0"
                step="25"
                placeholder="100"
                value={safeModeThreshold}
                onChange={(e) => setSafeModeThreshold(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Balance level that triggers campaign budget protection.
              </p>
              {thresholdError && (
                <p className="text-xs text-red-500 font-medium">
                  {thresholdError}
                </p>
              )}
            </div>
          </>
        )}

        <Button
          onClick={handleSave}
          size="sm"
          disabled={isSaving || !!thresholdError}
          className="w-full"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wallet className="w-4 h-4 mr-1" />}
          Save Settings
        </Button>

        {/* Inline audit history */}
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full text-xs text-muted-foreground"
          >
            <History className="w-3 h-3 mr-1" />
            {showHistory ? 'Hide' : 'Show'} Change History
            {showHistory ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
          {showHistory && <AuditHistoryInline clientId={clientId} />}
        </div>
      </CardContent>
    </Card>
  );
}
