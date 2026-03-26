import { Button } from '@/components/ui/button';
import { PhoneOff, Ban, AlertTriangle, Voicemail, PhoneMissed } from 'lucide-react';

interface BadNumberHandlerProps {
  onSelect: (reason: string) => void;
  onBack: () => void;
}

const reasons = [
  { value: 'disconnected', label: 'Disconnected', icon: PhoneOff },
  { value: 'no_ring', label: "Doesn't Ring", icon: PhoneMissed },
  { value: 'wrong_number', label: 'Wrong Number', icon: AlertTriangle },
  { value: 'not_in_service', label: 'Not In Service', icon: Ban },
  { value: 'straight_to_vm', label: 'Straight to VM', icon: Voicemail },
];

export function BadNumberHandler({ onSelect, onBack }: BadNumberHandlerProps) {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm font-bold text-muted-foreground">What's wrong with the number?</p>
      <div className="flex flex-col gap-2 max-w-xs mx-auto">
        {reasons.map((r) => {
          const Icon = r.icon;
          return (
            <Button
              key={r.value}
              variant="outline"
              className="justify-start gap-3 h-11 border-border hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5"
              onClick={() => onSelect(r.value)}
            >
              <Icon className="h-4 w-4" />
              {r.label}
            </Button>
          );
        })}
      </div>
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        Back
      </Button>
    </div>
  );
}
