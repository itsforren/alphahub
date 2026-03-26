import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

interface Account {
  type: string;
  balance: string;
}

interface AccountsInputProps {
  accounts: Account[];
  onChange: (accounts: Account[]) => void;
}

const accountTypes = ['401(K)', 'Roth 401(K)', 'IRA', 'Roth IRA', '403(B)', 'Pension', 'Savings', 'Holding Cash', 'Active Trading', 'Self Directed Brokerage Account', 'Annuity', 'Life Insurance', 'Other'];

export function AccountsInput({ accounts, onChange }: AccountsInputProps) {
  const add = () => onChange([...accounts, { type: '', balance: '' }]);

  const remove = (index: number) => {
    if (accounts.length <= 1) {
      onChange([{ type: '', balance: '' }]);
    } else {
      onChange(accounts.filter((_, i) => i !== index));
    }
  };

  const update = (index: number, field: keyof Account, value: string) => {
    const next = [...accounts];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const formatBalance = (value: string) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return '$' + parseInt(digits, 10).toLocaleString('en-US');
  };

  return (
    <div className="space-y-2">
      {accounts.map((acct, i) => (
        <div key={i} className="flex gap-2">
          <Select value={acct.type} onValueChange={(v) => update(i, 'type', v)}>
            <SelectTrigger className="flex-1 bg-background/50">
              <SelectValue placeholder="Type..." />
            </SelectTrigger>
            <SelectContent>
              {accountTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Balance"
            value={acct.balance}
            onChange={(e) => update(i, 'balance', formatBalance(e.target.value))}
            className="flex-1 bg-background/50"
            inputMode="numeric"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="flex-shrink-0 text-red-400 hover:text-red-300 hover:border-red-500/40"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed text-muted-foreground hover:text-primary hover:border-primary/40"
        onClick={add}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Account
      </Button>
    </div>
  );
}
