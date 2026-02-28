import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaidLinkFlow } from '@/hooks/usePlaidLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, Plus, Building2, User, Pencil, Check, X, Loader2 } from 'lucide-react';

interface BankAccount {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
  account_subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  is_active: boolean;
  last_synced_at: string | null;
  account_category: string;
  account_label: string | null;
}

export default function AdminBanking() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelValue, setLabelValue] = useState('');

  const { initiatePlaidLink, openPlaidLink, isCreatingToken, ready } = usePlaidLinkFlow(() => {
    fetchAccounts();
  });

  const isMasterAdmin = user?.email === 'forren@alphaagent.io';

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('plaid-get-balances');
    // Also fetch from DB directly for full list including inactive
    const { data: dbAccounts } = await supabase
      .from('bank_accounts')
      .select('id, account_name, institution_name, account_type, account_subtype, mask, current_balance, available_balance, is_active, last_synced_at, account_category, account_label')
      .order('institution_name');

    if (dbAccounts) {
      setAccounts(dbAccounts as BankAccount[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isMasterAdmin) fetchAccounts();
    else setLoading(false);
  }, [isMasterAdmin, fetchAccounts]);

  // Open Plaid Link when ready
  useEffect(() => {
    if (ready) openPlaidLink();
  }, [ready, openPlaidLink]);

  if (!isMasterAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Access restricted to master admin.
      </div>
    );
  }

  const handleRefreshBalances = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('plaid-get-balances');
      if (error) throw error;
      toast.success(`Refreshed ${data?.accounts?.length ?? 0} account balances`);
      await fetchAccounts();
    } catch (e: any) {
      toast.error('Failed to refresh balances');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncTransactions = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('plaid-sync-transactions');
      if (error) throw error;
      toast.success(`Synced ${data?.totalSynced ?? 0} transactions`);
    } catch (e: any) {
      toast.error('Failed to sync transactions');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleActive = async (accountId: string, currentlyActive: boolean) => {
    const { error } = await supabase
      .from('bank_accounts')
      .update({ is_active: !currentlyActive } as any)
      .eq('id', accountId);
    if (error) {
      toast.error('Failed to update');
      return;
    }
    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, is_active: !currentlyActive } : a));
    toast.success(!currentlyActive ? 'Account activated' : 'Account deactivated');
  };

  const handleCategoryChange = async (accountId: string, category: string) => {
    const { error } = await supabase
      .from('bank_accounts')
      .update({ account_category: category } as any)
      .eq('id', accountId);
    if (error) {
      toast.error('Failed to update category');
      return;
    }
    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, account_category: category } : a));
    toast.success(`Category set to ${category}`);
  };

  const handleSaveLabel = async (accountId: string) => {
    const { error } = await supabase
      .from('bank_accounts')
      .update({ account_label: labelValue || null } as any)
      .eq('id', accountId);
    if (error) {
      toast.error('Failed to update label');
      return;
    }
    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, account_label: labelValue || null } : a));
    setEditingLabel(null);
    toast.success('Label updated');
  };

  const formatBalance = (val: number | null) => val != null ? `$${val.toFixed(2)}` : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bank Account Management</h1>
          <p className="text-muted-foreground text-sm">Manage Plaid-connected accounts, categories, and sync status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshBalances} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Balances
          </Button>
          <Button variant="outline" size="sm" onClick={handleSyncTransactions} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            Sync Transactions
          </Button>
          <Button size="sm" onClick={() => initiatePlaidLink()} disabled={isCreatingToken}>
            <Plus className="h-4 w-4 mr-1" />
            {isCreatingToken ? 'Connecting...' : 'Connect Account'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No bank accounts connected. Click "Connect Account" to add one via Plaid.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connected Accounts ({accounts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map(a => (
                  <TableRow key={a.id} className={!a.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{a.institution_name}</TableCell>
                    <TableCell>
                      {a.account_name}
                      {a.mask && <span className="text-muted-foreground text-xs ml-1">••••{a.mask}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {a.account_subtype || a.account_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={a.account_category} onValueChange={(v) => handleCategoryChange(a.id, v)}>
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="business">
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Business</span>
                          </SelectItem>
                          <SelectItem value="personal">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> Personal</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {editingLabel === a.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-8 w-[140px] text-sm"
                            value={labelValue}
                            onChange={(e) => setLabelValue(e.target.value)}
                            placeholder="Custom label"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel(a.id)}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveLabel(a.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingLabel(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingLabel(a.id); setLabelValue(a.account_label || ''); }}
                        >
                          {a.account_label || <span className="italic">Add label</span>}
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatBalance(a.current_balance)}</TableCell>
                    <TableCell className="text-right font-mono">{formatBalance(a.available_balance)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.last_synced_at ? new Date(a.last_synced_at).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={a.is_active}
                        onCheckedChange={() => handleToggleActive(a.id, a.is_active)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
