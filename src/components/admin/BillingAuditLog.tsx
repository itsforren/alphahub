import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Loader2 } from 'lucide-react';
import { useBillingAuditLog } from '@/hooks/useBillingAuditLog';
import { format } from 'date-fns';

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

const sourceBadgeColors: Record<string, string> = {
  admin: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  system: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  bulk_update: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
};

function formatValue(fieldName: string, value: string | null): string {
  if (value === null || value === '') return 'none';
  if (fieldName === 'auto_billing_enabled') return value === 'true' ? 'enabled' : 'disabled';
  if (currencyFields.has(fieldName)) return `$${value}`;
  return value;
}

interface BillingAuditLogProps {
  clientId?: string;
  limit?: number;
}

export function BillingAuditLog({ clientId, limit = 50 }: BillingAuditLogProps) {
  const { data: entries, isLoading } = useBillingAuditLog(clientId, limit);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4 text-primary" />
          Billing Settings Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !entries || entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No settings changes recorded yet.
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {entry.client_name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${sourceBadgeColors[entry.change_source] || ''}`}
                      >
                        {entry.change_source}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/80">
                      <span className="font-medium">{fieldLabels[entry.field_name] || entry.field_name}</span>
                      {': '}
                      <span className="text-muted-foreground">
                        {formatValue(entry.field_name, entry.old_value)}
                      </span>
                      {' -> '}
                      <span className="text-foreground">
                        {formatValue(entry.field_name, entry.new_value)}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                    {format(new Date(entry.created_at), 'MMM d, h:mma')}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
