import { 
  ExternalLink, 
  FileText, 
  Calendar, 
  Users, 
  Globe, 
  MousePointerClick,
  Megaphone
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickLinksProps {
  // Agent-visible links
  nfiaLink?: string | null;
  tfwpProfileLink?: string | null;
  schedulerLink?: string | null;
  crmLink?: string | null;
  // Admin-only links
  landerLink?: string | null;
  thankyouLink?: string | null;
  adsLink?: string | null;
  isAdmin?: boolean;
  className?: string;
  variant?: 'default' | 'compact';
}

interface LinkConfig {
  key: string;
  label: string;
  shortLabel: string;
  icon: typeof ExternalLink;
  adminOnly?: boolean;
  variant?: 'default' | 'primary' | 'secondary';
}

const LINKS: LinkConfig[] = [
  { key: 'nfiaLink', label: 'NFIA Dashboard', shortLabel: 'NFIA', icon: FileText },
  { key: 'tfwpProfileLink', label: 'TFWP Profile', shortLabel: 'Profile', icon: Users },
  { key: 'schedulerLink', label: 'TFWP Scheduler', shortLabel: 'Scheduler', icon: Calendar },
  { key: 'crmLink', label: 'Alpha CRM', shortLabel: 'CRM', icon: Users, variant: 'primary' },
  // Admin-only links
  { key: 'landerLink', label: 'Landing Page', shortLabel: 'Lander', icon: Globe, adminOnly: true, variant: 'secondary' },
  { key: 'thankyouLink', label: 'Thank You Page', shortLabel: 'Thank You', icon: MousePointerClick, adminOnly: true, variant: 'secondary' },
  { key: 'adsLink', label: 'Google Ads', shortLabel: 'Ads', icon: Megaphone, adminOnly: true, variant: 'secondary' },
];

export function QuickLinks({ 
  nfiaLink, 
  tfwpProfileLink,
  schedulerLink, 
  crmLink, 
  landerLink,
  thankyouLink,
  adsLink,
  isAdmin = false,
  className,
  variant = 'default'
}: QuickLinksProps) {
  const linkValues: Record<string, string | null | undefined> = {
    nfiaLink,
    tfwpProfileLink,
    schedulerLink,
    crmLink,
    landerLink,
    thankyouLink,
    adsLink,
  };

  // Filter links: show agent-visible links, and admin-only links if isAdmin
  const activeLinks = LINKS.filter(link => {
    const hasValue = linkValues[link.key];
    if (!hasValue) return false;
    if (link.adminOnly && !isAdmin) return false;
    return true;
  });

  if (activeLinks.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-1", className)}>
          {activeLinks.map(({ key, label, icon: Icon }) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  asChild
                >
                  <a 
                    href={linkValues[key] || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {activeLinks.map(({ key, label, shortLabel, icon: Icon, variant: linkVariant, adminOnly }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <Button
                variant={linkVariant === 'primary' ? 'default' : linkVariant === 'secondary' ? 'secondary' : 'outline'}
                size="sm"
                className={cn(
                  "gap-2",
                  adminOnly && "opacity-80"
                )}
                asChild
              >
                <a 
                  href={linkValues[key] || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{shortLabel}</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}{adminOnly ? ' (Admin)' : ''}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
