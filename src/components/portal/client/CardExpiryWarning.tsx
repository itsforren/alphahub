import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CardExpiryWarningProps {
  expMonth: number | null;
  expYear: number | null;
}

export function CardExpiryWarning({ expMonth, expYear }: CardExpiryWarningProps) {
  if (expMonth == null || expYear == null) return null;

  // Last day of the expiry month (card is valid through end of exp month)
  const expiryDate = new Date(expYear, expMonth, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isExpired = expiryDate < today;

  if (isExpired) {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0 h-5 gap-1"
      >
        <AlertTriangle className="w-3 h-3" />
        Expired
      </Badge>
    );
  }

  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const isExpiringSoon = expiryDate <= thirtyDaysFromNow;

  if (isExpiringSoon) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 h-5 gap-1"
      >
        <AlertTriangle className="w-3 h-3" />
        Expiring Soon
      </Badge>
    );
  }

  return null;
}
