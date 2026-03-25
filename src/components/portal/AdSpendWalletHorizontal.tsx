import { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useClientWallet, useCreateOrUpdateWallet } from '@/hooks/useClientWallet';
import { useComputedWalletBalance } from '@/hooks/useComputedWalletBalance';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, AlertTriangle, Settings, Loader2, TrendingDown, Target, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, parseISO, startOfMonth, subDays } from 'date-fns';

interface AdSpendWalletHorizontalProps {
  clientId: string;
  mtdAdSpend?: number; // Kept for backward compatibility, but we now use computed spend
  isAdmin?: boolean;
}

export function AdSpendWalletHorizontal({ clientId, isAdmin = true }: AdSpendWalletHorizontalProps) {
  const queryClient = useQueryClient();
  const { data: wallet, isLoading: walletLoading } = useClientWallet(clientId);
  const {
    remainingBalance,
    trackingStartDate,
    performancePercentage,
    isLoading: computedLoading,
    refetch: refetchComputedBalance
  } = useComputedWalletBalance(clientId);
  const createOrUpdateWallet = useCreateOrUpdateWallet();

  // Fetch client billing info for monthly cap period calculation
  const { data: clientBilling } = useQuery({
    queryKey: ['client-billing-info', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('billing_cycle_start_at, billing_frequency')
        .eq('id', clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Calculate the 30-day cap period start date
  const capPeriodStart = (() => {
    const cycleStart = clientBilling?.billing_cycle_start_at;
    if (!cycleStart) return format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const cycleDate = parseISO(cycleStart);
    // For bi-weekly, go back 14 days to get the first of the two cycles in the 30-day window
    if (clientBilling?.billing_frequency === 'bi_weekly') {
      return format(subDays(cycleDate, 14), 'yyyy-MM-dd');
    }
    return format(cycleDate, 'yyyy-MM-dd');
  })();

  // Ad spend since cap period start for monthly cap progress
  const { data: capPeriodSpend = 0 } = useQuery({
    queryKey: ['cap-period-spend', clientId, capPeriodStart],
    queryFn: async () => {
      if (!clientId) return 0;
      const { data, error } = await supabase
        .from('ad_spend_daily')
        .select('cost')
        .eq('client_id', clientId)
        .gte('spend_date', capPeriodStart);
      if (error) throw error;
      return data?.reduce((sum, day) => sum + Number(day.cost || 0), 0) ?? 0;
    },
    enabled: !!clientId,
  });

  const monthlyCap = wallet?.monthly_ad_spend_cap ?? null;
  const capPeriodSpendWithFee = capPeriodSpend * (1 + (performancePercentage ?? 0) / 100);
  const monthlyCapPercent = monthlyCap ? Math.min(100, (capPeriodSpendWithFee / monthlyCap) * 100) : 0;
  const capPeriodDaysElapsed = differenceInDays(new Date(), parseISO(capPeriodStart));
  const capPeriodDaysTotal = 30;

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [isAddingCredit, setIsAddingCredit] = useState(false);
  const [threshold, setThreshold] = useState('');
  const [autoCharge, setAutoCharge] = useState('');
  const [editTrackingDate, setEditTrackingDate] = useState('');
  const [monthlyCapInput, setMonthlyCapInput] = useState('');
  const [billingModeInput, setBillingModeInput] = useState<string>('');
  const [isSavingDate, setIsSavingDate] = useState(false);

  const handleAddCredit = async () => {
    const amount = parseFloat(creditAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setIsAddingCredit(true);
    try {
      const desc = creditDescription || 'Ad spend credit';
      const today = new Date().toISOString().split('T')[0];

      // Get client name
      const { data: clientData } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .maybeSingle();

      // Create billing record so it shows in billing details
      const { data: billingRec, error: brError } = await supabase
        .from('billing_records')
        .insert({
          client_id: clientId,
          client_name: clientData?.name || null,
          billing_type: 'ad_spend',
          amount,
          status: 'paid',
          paid_at: new Date().toISOString(),
          due_date: today,
          billing_period_start: today,
          billing_period_end: today,
          notes: `Admin credit: ${desc}`,
          is_recurring_parent: false,
          recurrence_type: 'one_time',
          source: 'admin_credit',
        })
        .select('id')
        .single();

      if (brError) throw brError;

      // Get or create wallet
      let walletId: string;
      const { data: existingWallet } = await supabase
        .from('client_wallets')
        .select('id')
        .eq('client_id', clientId)
        .maybeSingle();

      if (existingWallet) {
        walletId = existingWallet.id;
      } else {
        const { data: newWallet, error: wErr } = await supabase
          .from('client_wallets')
          .insert({ client_id: clientId, ad_spend_balance: 0, tracking_start_date: today })
          .select('id')
          .single();
        if (wErr) throw wErr;
        walletId = newWallet.id;
      }

      // Create wallet transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: walletId,
          client_id: clientId,
          transaction_type: 'adjustment',
          amount,
          balance_after: 0,
          description: desc,
          billing_record_id: billingRec.id,
        });

      if (txError) throw txError;

      // If client was in safe mode, clear it and restore campaign budgets
      const { data: rechargeState } = await supabase
        .from('recharge_state')
        .select('safe_mode_active')
        .eq('client_id', clientId)
        .maybeSingle();

      if (rechargeState?.safe_mode_active) {
        // Clear safe_mode_active + set grace period
        const gracePeriodUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
        await supabase.from('recharge_state').upsert({
          client_id: clientId,
          safe_mode_active: false,
          safe_mode_activated_at: null,
          grace_period_until: gracePeriodUntil,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });

        // Restore campaign budgets from snapshot
        const { data: snapshot } = await supabase
          .from('campaign_budget_snapshots')
          .update({ restored_at: new Date().toISOString(), restored_by: 'admin_credit' })
          .eq('client_id', clientId)
          .eq('snapshot_type', 'safe_mode_entry')
          .is('restored_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .select('id, campaign_budgets')
          .maybeSingle();

        if (snapshot?.campaign_budgets) {
          const budgets = snapshot.campaign_budgets as Array<{ campaign_id: string; daily_budget: number; campaign_name?: string }>;
          for (const budget of budgets) {
            if (!budget.daily_budget || budget.daily_budget <= 0.01) continue;
            // Restore via edge function
            await supabase.functions.invoke('update-google-ads-budget', {
              body: {
                clientId,
                campaignRowId: budget.campaign_id,
                newDailyBudget: budget.daily_budget,
                changeSource: 'safe_mode_exit',
                changeReason: 'Wallet refilled via admin credit',
              },
            });
            // Clear safe mode flags on campaign
            await supabase.from('campaigns').update({
              safe_mode: false,
              safe_mode_reason: null,
              safe_mode_triggered_at: null,
              safe_mode_budget_used: null,
              pre_safe_mode_budget: null,
              current_daily_budget: budget.daily_budget,
              last_budget_change_at: new Date().toISOString(),
              last_budget_change_by: 'SAFE_MODE_EXIT',
              updated_at: new Date().toISOString(),
            }).eq('id', budget.campaign_id);
          }
          toast.success('Safe mode cleared — campaign budgets restored');
        }
      }

      queryClient.invalidateQueries({ queryKey: ['computed-wallet-balance', clientId] });
      queryClient.invalidateQueries({ queryKey: ['billing-records', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-wallet', clientId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', clientId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      refetchComputedBalance();
      toast.success(`$${amount.toLocaleString()} credit added to wallet`);
      setCreditModalOpen(false);
      setCreditAmount('');
      setCreditDescription('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add credit');
    } finally {
      setIsAddingCredit(false);
    }
  };

  const isLoading = walletLoading || computedLoading;
  const lowThreshold = wallet?.low_balance_threshold ?? 150;
  const isLowBalance = remainingBalance <= lowThreshold;
  const isNegative = remainingBalance < 0;

  const handleSaveSettings = async () => {
    try {
      await createOrUpdateWallet.mutateAsync({
        client_id: clientId,
        low_balance_threshold: parseFloat(threshold) || 150,
        auto_charge_amount: autoCharge ? parseFloat(autoCharge) : null,
        monthly_ad_spend_cap: monthlyCapInput ? parseFloat(monthlyCapInput) : null,
        ...(billingModeInput && { billing_mode: billingModeInput as 'manual' | 'auto_stripe' }),
      });

      if (editTrackingDate && editTrackingDate !== trackingStartDate) {
        setIsSavingDate(true);
        const { error } = await supabase
          .from('client_wallets')
          .update({ tracking_start_date: editTrackingDate })
          .eq('client_id', clientId);

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['client-wallet', clientId] });
        queryClient.invalidateQueries({ queryKey: ['client-wallet-tracking', clientId], exact: false });
        queryClient.invalidateQueries({ queryKey: ['wallet-deposits', clientId], exact: false });
        queryClient.invalidateQueries({ queryKey: ['tracked-ad-spend', clientId], exact: false });
        queryClient.invalidateQueries({ queryKey: ['ad-spend-daily', clientId] });
        queryClient.invalidateQueries({ queryKey: ['campaigns'], exact: false });
        queryClient.invalidateQueries({ queryKey: ['command-center-stats'], exact: false });
        refetchComputedBalance();
      }

      toast.success('Wallet settings updated');
      setSettingsModalOpen(false);
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsSavingDate(false);
    }
  };

  const openSettings = () => {
    setThreshold(wallet?.low_balance_threshold?.toString() || '150');
    setAutoCharge(wallet?.auto_charge_amount?.toString() || '');
    setMonthlyCapInput((wallet as any)?.monthly_ad_spend_cap?.toString() || '');
    setBillingModeInput(wallet?.billing_mode || 'manual');
    setEditTrackingDate(trackingStartDate || '');
    setSettingsModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="frosted-card">
        <div className="p-6">
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  // If no tracking has started yet
  if (!trackingStartDate) {
    return (
      <Card className="frosted-card overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-muted/50 via-muted/25 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Ad Spend Wallet</p>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? 'Tracking starts when the first ad spend invoice is marked as paid'
                  : 'Ad spend tracking has not started yet'}
              </p>
            </div>
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={openSettings} className="h-9 w-9">
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Settings Modal */}
        <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Wallet Settings
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Low Balance Threshold</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="1"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="pl-7"
                    placeholder="150"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Auto-Charge Amount (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="1"
                    value={autoCharge}
                    onChange={(e) => setAutoCharge(e.target.value)}
                    className="pl-7"
                    placeholder="500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tracking Start Date (Optional)</Label>
                <Input
                  type="date"
                  value={editTrackingDate}
                  onChange={(e) => setEditTrackingDate(e.target.value)}
                  placeholder="Set manually to start tracking"
                />
                <p className="text-xs text-muted-foreground">
                  Set this to manually start tracking from a specific date
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSettings} disabled={createOrUpdateWallet.isPending || isSavingDate}>
                {(createOrUpdateWallet.isPending || isSavingDate) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  const rechargeAmount = wallet?.auto_charge_amount ?? 0;

  return (
    <>
      <Card className={cn(
        'frosted-card overflow-hidden',
        isNegative && 'ring-2 ring-red-500/50',
        isLowBalance && !isNegative && 'ring-2 ring-orange-500/50'
      )}>
        {/* Single Row: Balance + Monthly Max Bar + Pills + Settings */}
        <div className={cn(
          'px-6 py-5',
          isNegative
            ? 'bg-gradient-to-r from-red-500/15 via-red-500/5 to-transparent'
            : isLowBalance
              ? 'bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent'
              : 'bg-gradient-to-r from-muted/30 via-transparent to-transparent'
        )}>
          <div className="flex items-center justify-between gap-4">
            {/* Left: Icon + Balance */}
            <div className="flex items-center gap-4 shrink-0">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                isNegative ? 'bg-red-500/20' : isLowBalance ? 'bg-orange-500/20' : 'bg-blue-500/20'
              )}>
                <Wallet className={cn(
                  'w-6 h-6',
                  isNegative ? 'text-red-400' : isLowBalance ? 'text-orange-400' : 'text-blue-400'
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Wallet Balance</p>
                <div className={cn(
                  'text-3xl font-bold',
                  isNegative ? 'text-red-400' : isLowBalance ? 'text-orange-400' : 'text-foreground'
                )}>
                  {isNegative && '-'}${Math.abs(remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {isNegative && (
                  <div className="flex items-center gap-1 text-red-400 text-xs mt-0.5">
                    <TrendingDown className="w-3 h-3" />
                    Needs deposit
                  </div>
                )}
                {isLowBalance && !isNegative && (
                  <div className="flex items-center gap-1 text-orange-400 text-xs mt-0.5">
                    <AlertTriangle className="w-3 h-3" />
                    Low balance
                  </div>
                )}
              </div>
            </div>

            {/* Middle: Monthly Max Progress (inline) */}
            {monthlyCap && monthlyCap > 0 && (
              <div className="hidden sm:flex flex-col gap-1.5 flex-1 min-w-0 max-w-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-400" />
                    <span className="text-muted-foreground font-medium">Monthly Max</span>
                  </div>
                  <span className={cn(
                    'font-semibold',
                    monthlyCapPercent >= 90 ? 'text-red-400' : monthlyCapPercent >= 75 ? 'text-orange-400' : 'text-violet-400'
                  )}>
                    ${capPeriodSpendWithFee.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    <span className="text-muted-foreground font-normal"> / ${monthlyCap.toLocaleString()}</span>
                  </span>
                </div>
                <div className="relative">
                  <Progress
                    value={monthlyCapPercent}
                    className={cn(
                      'h-4 rounded-full',
                      monthlyCapPercent >= 90 ? '[&>div]:bg-red-500' : monthlyCapPercent >= 75 ? '[&>div]:bg-orange-500' : '[&>div]:bg-violet-500'
                    )}
                  />
                  {capPeriodDaysElapsed <= capPeriodDaysTotal && (
                    <div
                      className="absolute top-0 h-4 border-r-2 border-white/40"
                      style={{ left: `${Math.min(100, (capPeriodDaysElapsed / capPeriodDaysTotal) * 100)}%` }}
                      title={`Day ${capPeriodDaysElapsed} of ${capPeriodDaysTotal}`}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>${Math.max(0, monthlyCap - capPeriodSpendWithFee).toLocaleString('en-US', { maximumFractionDigits: 0 })} remaining</span>
                  <span>Day {Math.min(capPeriodDaysElapsed, capPeriodDaysTotal)} of {capPeriodDaysTotal}</span>
                </div>
              </div>
            )}

            {/* Right: Threshold + Recharge + Settings */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-center px-4 py-2 bg-muted/50 rounded-lg">
                  <div className="text-lg font-semibold text-foreground">${lowThreshold}</div>
                  <div className="text-xs text-muted-foreground">Threshold</div>
                </div>
                {rechargeAmount > 0 && (
                  <div className="text-center px-4 py-2 bg-muted/50 rounded-lg">
                    <div className="text-lg font-semibold text-foreground">${rechargeAmount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Recharge</div>
                  </div>
                )}
              </div>
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreditModalOpen(true)}
                    className="h-9 gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Credit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openSettings}
                    className="h-9 w-9"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Add Credit Modal */}
      <Dialog open={creditModalOpen} onOpenChange={setCreditModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              Add Wallet Credit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Credit Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="pl-7"
                  placeholder="500.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                placeholder="Ad spend credit — reason..."
                rows={2}
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              This credit will be added directly to the wallet balance as an adjustment.
              Current balance: <span className="font-medium text-foreground">${remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              {creditAmount && parseFloat(creditAmount) > 0 && (
                <> → <span className="font-medium text-emerald-500">${(remainingBalance + parseFloat(creditAmount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddCredit}
              disabled={isAddingCredit || !creditAmount || parseFloat(creditAmount) <= 0}
            >
              {isAddingCredit && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Wallet Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Low Balance Threshold</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="1"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="pl-7"
                  placeholder="150"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Auto-Charge Amount (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="1"
                  value={autoCharge}
                  onChange={(e) => setAutoCharge(e.target.value)}
                  className="pl-7"
                  placeholder="500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Monthly Ad Spend Cap</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="100"
                  value={monthlyCapInput}
                  onChange={(e) => setMonthlyCapInput(e.target.value)}
                  className="pl-7"
                  placeholder="4000"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Max total ad spend per 30-day billing cycle. Leave empty for no cap.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Billing Mode</Label>
              <Select value={billingModeInput} onValueChange={setBillingModeInput}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="auto_stripe">Auto Stripe</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto Stripe automatically charges the card on file when balance is low.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tracking Start Date</Label>
              <Input
                type="date"
                value={editTrackingDate}
                onChange={(e) => setEditTrackingDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ad spend from this date forward counts against the wallet
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={createOrUpdateWallet.isPending || isSavingDate}>
              {(createOrUpdateWallet.isPending || isSavingDate) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
