import { useState } from 'react';
import { useClientWallet, useCreateOrUpdateWallet } from '@/hooks/useClientWallet';
import { useComputedWalletBalance } from '@/hooks/useComputedWalletBalance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, AlertTriangle, TrendingDown, Settings, DollarSign, Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MIN_MONTHLY_CAP = 1000;
interface AdSpendWalletWidgetProps {
  clientId: string;
  mtdAdSpend?: number; // Kept for backward compatibility but no longer used
}

// Inline editable monthly cap display
function MonthlyCapDisplay({ wallet, clientId }: { wallet: any; clientId: string }) {
  const [editing, setEditing] = useState(false);
  const [capValue, setCapValue] = useState('');
  const createOrUpdateWallet = useCreateOrUpdateWallet();

  const currentCap = wallet?.monthly_ad_spend_cap;

  const startEdit = () => {
    setCapValue(currentCap?.toString() || '1000');
    setEditing(true);
  };

  const saveCapValue = async () => {
    const val = parseFloat(capValue);
    if (!val || val < MIN_MONTHLY_CAP) {
      toast.error(`Minimum monthly cap is $${MIN_MONTHLY_CAP.toLocaleString()}`);
      return;
    }
    try {
      await createOrUpdateWallet.mutateAsync({
        client_id: clientId,
        monthly_ad_spend_cap: val,
      });
      toast.success('Monthly cap updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update cap');
    }
  };

  if (editing) {
    return (
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <div className="flex items-center gap-1 justify-center">
          <span className="text-xs text-muted-foreground">$</span>
          <Input
            type="number"
            min={MIN_MONTHLY_CAP}
            value={capValue}
            onChange={(e) => setCapValue(e.target.value)}
            className="h-7 w-20 text-center text-sm px-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveCapValue();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        </div>
        <div className="flex items-center justify-center gap-1 mt-1">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={saveCapValue} disabled={createOrUpdateWallet.isPending}>
            <Check className="w-3 h-3 text-emerald-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditing(false)}>
            <X className="w-3 h-3 text-muted-foreground" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-muted/50 rounded-lg p-3 text-center cursor-pointer hover:bg-muted/70 transition-colors group"
      onClick={startEdit}
    >
      <TrendingDown className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
      <div className="text-lg font-semibold flex items-center justify-center gap-1">
        ${currentCap ? currentCap.toLocaleString() : '\u2014'}
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-xs text-muted-foreground">Monthly Cap</div>
    </div>
  );
}

export function AdSpendWalletWidget({ clientId }: AdSpendWalletWidgetProps) {
  const { data: wallet, isLoading: walletLoading } = useClientWallet(clientId);
  const {
    totalDeposits,
    displayedSpend,
    remainingBalance,
    isLoading: computedLoading
  } = useComputedWalletBalance(clientId);
  const createOrUpdateWallet = useCreateOrUpdateWallet();

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [threshold, setThreshold] = useState('');
  const [autoCharge, setAutoCharge] = useState('');

  const isLoading = walletLoading || computedLoading;
  const lowThreshold = wallet?.low_balance_threshold ?? 150;
  const isLowBalance = remainingBalance <= lowThreshold;
  const balancePercent = totalDeposits > 0
    ? Math.max(0, Math.min(100, (remainingBalance / totalDeposits) * 100))
    : 0;

  const handleSaveSettings = async () => {
    try {
      await createOrUpdateWallet.mutateAsync({
        client_id: clientId,
        low_balance_threshold: parseFloat(threshold) || 150,
        auto_charge_amount: autoCharge ? parseFloat(autoCharge) : null,
      });
      toast.success('Wallet settings updated');
      setSettingsModalOpen(false);
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const openSettings = () => {
    setThreshold(wallet?.low_balance_threshold?.toString() || '150');
    setAutoCharge(wallet?.auto_charge_amount?.toString() || '');
    setSettingsModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="frosted-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        'frosted-card overflow-hidden',
        isLowBalance && 'ring-2 ring-red-500/50'
      )}>
        {/* Gradient Header */}
        <div className={cn(
          'px-5 py-4',
          isLowBalance
            ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20'
            : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                isLowBalance ? 'bg-red-500/20' : 'bg-blue-500/20'
              )}>
                <Wallet className={cn('w-5 h-5', isLowBalance ? 'text-red-400' : 'text-blue-400')} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Ad Spend Wallet</h3>
                <p className="text-xs text-muted-foreground">
                  {isLowBalance ? 'Low balance - needs attention' : 'Balance tracking'}
                </p>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={openSettings} className="h-8 w-8">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Balance Display */}
          <div className="text-center py-3">
            <div className="text-xs text-muted-foreground mb-1">Remaining Balance</div>
            <div className={cn(
              'text-4xl font-bold',
              isLowBalance ? 'text-red-400' : 'text-foreground'
            )}>
              {remainingBalance < 0 && '-'}${Math.abs(remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {isLowBalance && (
              <div className="flex items-center justify-center gap-1 mt-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Below ${lowThreshold} threshold
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tracked Spend: ${displayedSpend.toFixed(2)}</span>
              <span>Deposited: ${totalDeposits.toFixed(2)}</span>
            </div>
            <Progress
              value={balancePercent}
              className={cn(
                'h-2',
                isLowBalance ? '[&>div]:bg-red-500' : '[&>div]:bg-blue-500'
              )}
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <TrendingDown className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-lg font-semibold">${displayedSpend.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Tracked Spend</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <DollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-lg font-semibold">${lowThreshold}</div>
              <div className="text-xs text-muted-foreground">Threshold</div>
            </div>
            <MonthlyCapDisplay
              wallet={wallet}
              clientId={clientId}
            />
          </div>
        </CardContent>
      </Card>

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
              <p className="text-xs text-muted-foreground">
                Alert when balance falls below this amount
              </p>
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
              <p className="text-xs text-muted-foreground">
                Suggested charge amount when balance is low
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={createOrUpdateWallet.isPending}>
              {createOrUpdateWallet.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
