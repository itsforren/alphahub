import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Phone, MessageSquare, Mail, Calendar, RefreshCw, 
  PhoneForwarded, CheckCircle, FileText, CreditCard, 
  ClipboardList, Rocket, Clock 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type NextActionType = 
  | 'call_to_qualify'
  | 'call_now' 
  | 'text_now' 
  | 'email_now' 
  | 'book_call' 
  | 'reschedule_call' 
  | 'follow_up_call' 
  | 'prepare_for_call'
  | 'send_proposal'
  | 'close_now' 
  | 'send_contract' 
  | 'collect_payment' 
  | 'schedule_onboarding'
  | 'onboarding_call'
  | 'check_in_call'
  | 'onboarding_schedule' 
  | 'launch_campaign' 
  | 'nurture'
  | 'nurture_sequence';

interface NextActionConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const NEXT_ACTION_CONFIG: Record<NextActionType, NextActionConfig> = {
  call_to_qualify: { label: 'Qualify Call', icon: Phone, color: 'text-destructive' },
  call_now: { label: 'Call Now', icon: Phone, color: 'text-destructive' },
  text_now: { label: 'Text Now', icon: MessageSquare, color: 'text-primary' },
  email_now: { label: 'Email Now', icon: Mail, color: 'text-primary' },
  book_call: { label: 'Book Call', icon: Calendar, color: 'text-warning' },
  reschedule_call: { label: 'Reschedule Call', icon: RefreshCw, color: 'text-warning' },
  follow_up_call: { label: 'Follow-up Call', icon: PhoneForwarded, color: 'text-muted-foreground' },
  prepare_for_call: { label: 'Prep Call', icon: ClipboardList, color: 'text-warning' },
  send_proposal: { label: 'Send Proposal', icon: FileText, color: 'text-primary' },
  close_now: { label: 'Close Now', icon: CheckCircle, color: 'text-success' },
  send_contract: { label: 'Send Contract', icon: FileText, color: 'text-primary' },
  collect_payment: { label: 'Collect Payment', icon: CreditCard, color: 'text-success' },
  schedule_onboarding: { label: 'Schedule Onboarding', icon: ClipboardList, color: 'text-primary' },
  onboarding_call: { label: 'Onboarding Call', icon: Calendar, color: 'text-primary' },
  check_in_call: { label: 'Check-in Call', icon: PhoneForwarded, color: 'text-muted-foreground' },
  onboarding_schedule: { label: 'Schedule Onboarding', icon: ClipboardList, color: 'text-primary' },
  launch_campaign: { label: 'Launch Campaign', icon: Rocket, color: 'text-success' },
  nurture: { label: 'Nurture', icon: Clock, color: 'text-muted-foreground' },
  nurture_sequence: { label: 'Nurture Sequence', icon: Clock, color: 'text-muted-foreground' },
};

interface NextActionSelectorProps {
  actionType: NextActionType | null;
  dueAt: string;
  onActionTypeChange: (type: NextActionType | null) => void;
  onDueAtChange: (date: string) => void;
  className?: string;
}

export function NextActionSelector({
  actionType,
  dueAt,
  onActionTypeChange,
  onDueAtChange,
  className,
}: NextActionSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <Label className="text-sm">Next Action</Label>
        <Select
          value={actionType || ''}
          onValueChange={(v) => onActionTypeChange(v as NextActionType || null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select next action..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(NEXT_ACTION_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", config.color)} />
                    {config.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm">Due Date & Time</Label>
        <Input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => onDueAtChange(e.target.value)}
        />
      </div>
    </div>
  );
}

interface NextActionBadgeProps {
  actionType: NextActionType;
  dueAt: string | null;
  className?: string;
}

export function NextActionBadge({ actionType, dueAt, className }: NextActionBadgeProps) {
  const config = NEXT_ACTION_CONFIG[actionType];
  if (!config) return null;

  const Icon = config.icon;
  const isOverdue = dueAt && new Date(dueAt) < new Date();

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
      isOverdue ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted",
      className
    )}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
}
