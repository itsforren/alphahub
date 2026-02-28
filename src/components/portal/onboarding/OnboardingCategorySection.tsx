import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingChecklistItem } from '@/hooks/useOnboardingChecklist';
import { OnboardingChecklistItemRow } from './OnboardingChecklistItemRow';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface OnboardingCategorySectionProps {
  category: string;
  label: string;
  items: OnboardingChecklistItem[];
  userId?: string;
  clientId: string;
  onIssueFound: (item: OnboardingChecklistItem) => void;
}

export function OnboardingCategorySection({
  category,
  label,
  items,
  userId,
  clientId,
  onIssueFound,
}: OnboardingCategorySectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const completed = items.filter(item => item.status === 'yes').length;
  const issues = items.filter(item => item.status === 'no').length;
  const total = items.length;

  const getStatusIcon = () => {
    if (issues > 0) {
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
    if (completed === total && total > 0) {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
    if (completed > 0) {
      return <Circle className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />;
    }
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusBadge = () => {
    if (issues > 0) {
      return <Badge variant="destructive" className="text-xs">{issues} issue{issues > 1 ? 's' : ''}</Badge>;
    }
    if (completed === total && total > 0) {
      return <Badge className="bg-green-600 text-xs">Complete</Badge>;
    }
    if (completed > 0) {
      return <Badge variant="secondary" className="text-xs">{completed}/{total}</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Not started</Badge>;
  };

  if (items.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            {getStatusIcon()}
            <span className="font-medium">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 ml-4 border-l-2 border-muted pl-4 space-y-1">
          {items.map(item => (
            <OnboardingChecklistItemRow
              key={item.id}
              item={item}
              userId={userId}
              onIssueFound={onIssueFound}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
