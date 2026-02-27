import { Clock } from 'lucide-react';
import { isWithinBusinessHours } from '@/hooks/useChat';

export function BusinessHoursBanner() {
  const isOpen = isWithinBusinessHours();

  if (isOpen) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border/50">
      <Clock className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        Currently offline · Hours: 9AM-5PM EST, Mon-Fri
      </p>
    </div>
  );
}
