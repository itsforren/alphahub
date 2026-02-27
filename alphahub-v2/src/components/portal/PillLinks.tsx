import { ExternalLink, BarChart3, Calendar, Users, MessageSquare, FileText, Globe, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PillLinksProps {
  nfiaLink?: string | null;
  schedulerLink?: string | null;
  crmLink?: string | null;
  tfwpProfileLink?: string | null;
  agreementLink?: string | null;
  googleCampaignId?: string | null;
  landerLink?: string | null;
  thankyouLink?: string | null;
  className?: string;
}

interface LinkConfig {
  key: string;
  label: string;
  icon: typeof ExternalLink | 'google';
  color: string;
}

const LINKS: LinkConfig[] = [
  { key: 'lander', label: 'Landing Page', icon: Globe, color: 'bg-cyan-500/15 text-cyan-600 hover:bg-cyan-500/25 border-cyan-500/30' },
  { key: 'thankyou', label: 'Thank You', icon: CheckCircle, color: 'bg-green-500/15 text-green-600 hover:bg-green-500/25 border-green-500/30' },
  { key: 'google', label: 'Google Ads', icon: 'google', color: 'bg-[#4285F4]/15 text-[#4285F4] hover:bg-[#4285F4]/25 border-[#4285F4]/30' },
  { key: 'nfia', label: 'NFIA', icon: BarChart3, color: 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/30' },
  { key: 'tfwp', label: 'TFWP Profile', icon: Users, color: 'bg-purple-500/15 text-purple-600 hover:bg-purple-500/25 border-purple-500/30' },
  { key: 'scheduler', label: 'Scheduler', icon: Calendar, color: 'bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/30' },
  { key: 'crm', label: 'CRM', icon: MessageSquare, color: 'bg-orange-500/15 text-orange-600 hover:bg-orange-500/25 border-orange-500/30' },
  { key: 'agreement', label: 'Agreement', icon: FileText, color: 'bg-slate-500/15 text-slate-600 hover:bg-slate-500/25 border-slate-500/30' },
];

// Google "G" logo SVG component
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function buildGoogleAdsUrl(googleCampaignId: string): string {
  // Format is "customerId:campaignId" - extract just the campaign ID
  const campaignId = googleCampaignId.includes(':') 
    ? googleCampaignId.split(':')[1] 
    : googleCampaignId;
  return `https://ads.google.com/aw/adgroups?campaignId=${campaignId}`;
}

function ensureHttps(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function PillLinks({ 
  nfiaLink, 
  schedulerLink, 
  crmLink, 
  tfwpProfileLink,
  agreementLink,
  googleCampaignId,
  landerLink,
  thankyouLink,
  className 
}: PillLinksProps) {
  const linkValues: Record<string, string | null | undefined> = {
    lander: ensureHttps(landerLink),
    thankyou: ensureHttps(thankyouLink),
    google: googleCampaignId ? buildGoogleAdsUrl(googleCampaignId) : null,
    nfia: ensureHttps(nfiaLink),
    tfwp: ensureHttps(tfwpProfileLink),
    scheduler: ensureHttps(schedulerLink),
    crm: ensureHttps(crmLink),
    agreement: ensureHttps(agreementLink),
  };

  const activeLinks = LINKS.filter(link => linkValues[link.key]);

  if (activeLinks.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center flex-wrap gap-2", className)}>
      {activeLinks.map(({ key, label, icon: Icon, color }) => (
        <a
          key={key}
          href={linkValues[key] || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            "border transition-all duration-200 shadow-sm",
            "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
            color
          )}
        >
          {Icon === 'google' ? (
            <GoogleIcon className="w-4 h-4" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
          {label}
        </a>
      ))}
    </div>
  );
}
