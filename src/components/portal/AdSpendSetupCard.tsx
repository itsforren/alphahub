import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Wallet, Loader2, Info, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { useClientWallet, useCreateOrUpdateWallet } from '@/hooks/useClientWallet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdSpendSetupCardProps {
  clientId: string;
}

export function AdSpendSetupCard({ clientId }: AdSpendSetupCardProps) {
  const { data: wallet, isLoading } = useClientWallet(clientId);
  const updateWallet = useCreateOrUpdateWallet();
  const queryClient = useQueryClient();

  const [monthlyCap, setMonthlyCap] = useState('');
  const [autoChargeAmount, setAutoChargeAmount] = useState('');
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [billingMode, setBillingMode] = useState<'manual' | 'auto_stripe'>('manual');
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRefilling, setIsRefilling] = useState(false);

  useEffect(() => {
    if (wallet) {
      setMonthlyCap(wallet.monthly_ad_spend_cap?.toString() || '');
      setAutoChargeAmount(wallet.auto_charge_amount?.toString() || '');
      setAutoEnabled(wallet.auto_billing_enabled || false);
      setBillingMode((wallet as any).billing_mode || 'manual');
    } else {
      setAutoChargeAmount('250');
      setAutoEnabled(true);
    }
  }, [wallet]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const previousMode = (wallet as any)?.billing_mode || 'manual';
      const switchingToAuto = previousMode === 'manual' && billingMode === 'auto_stripe';

      await updateWallet.mutateAsync({
        client_id: clientId,
        monthly_ad_spend_cap: monthlyCap ? parseFloat(monthlyCap) : null,
        auto_charge_amount: autoChargeAmount ? parseFloat(autoChargeAmount) : null,
        auto_billing_enabled: switchingToAuto ? false : autoEnabled,
        billing_mode: billingMode,
      });

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

        {/* Recharge amount */}
        {autoEnabled && (
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
              Amount charged when wallet drops below threshold (${wallet?.low_balance_threshold ?? 150}).
            </p>
          </div>
        )}

        <Button
          onClick={handleSave}
          size="sm"
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wallet className="w-4 h-4 mr-1" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
