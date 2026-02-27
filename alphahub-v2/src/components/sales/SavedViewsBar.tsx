import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, Users, PhoneOff, HelpCircle, Briefcase, UserPlus } from 'lucide-react';
import { ProspectWithAttribution } from '@/hooks/useSalesPipeline';

export type SavedView = 
  | 'all' 
  | 'overdue' 
  | 'no_show_recovery' 
  | 'unqualified' 
  | 'my_leads'
  | 'setter_queue'
  | 'closer_pipeline'
  | 'referrals';

interface ViewConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  filter: (prospects: ProspectWithAttribution[], currentUserId?: string) => ProspectWithAttribution[];
}

export const SAVED_VIEWS: Record<SavedView, ViewConfig> = {
  all: {
    label: 'All',
    icon: Users,
    filter: (prospects) => prospects,
  },
  overdue: {
    label: 'Overdue Actions',
    icon: AlertTriangle,
    filter: (prospects) => prospects.filter(
      (p) => p.next_action_due_at && new Date(p.next_action_due_at) < new Date()
    ),
  },
  no_show_recovery: {
    label: 'No-Show Recovery',
    icon: PhoneOff,
    filter: (prospects) => prospects.filter((p) => p.appointment_status === 'no_show'),
  },
  unqualified: {
    label: 'Needs Review',
    icon: HelpCircle,
    filter: (prospects) => prospects.filter((p) => p.qual_status === 'unreviewed'),
  },
  referrals: {
    label: 'Referrals',
    icon: UserPlus,
    filter: (prospects) => prospects.filter(
      (p) => p.lead_source === 'Referral' || 
             p.attribution?.referral_code || 
             p.attribution?.first_touch_source === 'referral'
    ),
  },
  my_leads: {
    label: 'My Leads',
    icon: Briefcase,
    filter: (prospects, currentUserId) => 
      currentUserId ? prospects.filter((p) => p.owner_user_id === currentUserId) : prospects,
  },
  setter_queue: {
    label: 'Setter Queue',
    icon: Clock,
    filter: (prospects) => prospects.filter((p) => p.owner_role === 'setter'),
  },
  closer_pipeline: {
    label: 'Closer Pipeline',
    icon: Briefcase,
    filter: (prospects) => prospects.filter((p) => p.owner_role === 'closer'),
  },
};

interface SavedViewsBarProps {
  selectedView: SavedView;
  onSelectView: (view: SavedView) => void;
  prospects: ProspectWithAttribution[];
  currentUserId?: string;
}

export function SavedViewsBar({ 
  selectedView, 
  onSelectView, 
  prospects,
  currentUserId 
}: SavedViewsBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      {(Object.entries(SAVED_VIEWS) as [SavedView, ViewConfig][]).map(([key, config]) => {
        const Icon = config.icon;
        const count = config.filter(prospects, currentUserId).length;
        const isActive = selectedView === key;
        const isWarning = key === 'overdue' && count > 0;

        return (
          <button
            key={key}
            onClick={() => onSelectView(key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
              isActive
                ? isWarning
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
                : isWarning
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {config.label}
            {count > 0 && key !== 'all' && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "ml-1 px-1.5 py-0 h-4 text-[10px]",
                  isActive ? "bg-white/20 text-white" : ""
                )}
              >
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
