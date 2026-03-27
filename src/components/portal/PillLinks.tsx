import { Globe, CheckCircle, BarChart3, Users, Calendar, MessageSquare, FileText, Rocket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
  icon: LucideIcon | 'google';
  from: string;
  to: string;
}

const LINKS: LinkConfig[] = [
  { key: 'lander', label: 'Landing Page', icon: Globe, from: 'rgba(16,185,129,0.25)', to: 'rgba(5,150,105,0.35)' },
  { key: 'thankyou', label: 'Thank You', icon: CheckCircle, from: 'rgba(34,197,94,0.25)', to: 'rgba(22,163,74,0.35)' },
  { key: 'google', label: 'Google Ads', icon: Rocket, from: 'rgba(66,133,244,0.25)', to: 'rgba(26,115,232,0.35)' },
  { key: 'nfia', label: 'NFIA', icon: BarChart3, from: 'rgba(139,92,246,0.25)', to: 'rgba(124,58,237,0.35)' },
  { key: 'tfwp', label: 'TFWP Profile', icon: Users, from: 'rgba(168,85,247,0.25)', to: 'rgba(147,51,234,0.35)' },
  { key: 'scheduler', label: 'Scheduler', icon: Calendar, from: 'rgba(59,130,246,0.25)', to: 'rgba(37,99,235,0.35)' },
  { key: 'crm', label: 'CRM', icon: MessageSquare, from: 'rgba(249,115,22,0.25)', to: 'rgba(234,88,12,0.35)' },
  { key: 'agreement', label: 'Agreement', icon: FileText, from: 'rgba(107,114,128,0.25)', to: 'rgba(75,85,99,0.35)' },
];

function buildGoogleAdsUrl(googleCampaignId: string): string {
  const campaignId = googleCampaignId.includes(':')
    ? googleCampaignId.split(':')[1]
    : googleCampaignId;
  return `https://ads.google.com/aw/adgroups?campaignId=${campaignId}`;
}

function ensureHttps(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

export function PillLinks({
  nfiaLink, schedulerLink, crmLink, tfwpProfileLink,
  agreementLink, googleCampaignId, landerLink, thankyouLink, className,
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
  if (activeLinks.length === 0) return null;

  return (
    <div className={cn("flex items-center flex-wrap gap-3", className)}>
      {activeLinks.map(({ key, label, icon: Icon, from, to }) => (
        <a
          key={key}
          href={linkValues[key] || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative h-[48px] w-[48px] hover:w-[180px] rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer"
          style={{
            '--gm-from': from,
            '--gm-to': to,
            background: 'rgba(15, 15, 15, 0.9)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          } as React.CSSProperties}
        >
          {/* Gradient background on hover */}
          <span
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500"
            style={{ background: `linear-gradient(135deg, var(--gm-from), var(--gm-to))` }}
          />
          {/* Blur glow underneath */}
          <span
            className="absolute top-[6px] inset-x-0 h-full rounded-full blur-[12px] opacity-0 -z-10 group-hover:opacity-40 transition-all duration-500"
            style={{ background: `linear-gradient(135deg, var(--gm-from), var(--gm-to))` }}
          />

          {/* Icon — visible when collapsed, shrinks on hover */}
          <span className="relative z-10 transition-all duration-500 group-hover:scale-0 group-hover:opacity-0">
            {Icon === 'google' ? (
              <Rocket className="w-5 h-5 text-white/40" />
            ) : (
              <Icon className="w-5 h-5 text-white/40" />
            )}
          </span>

          {/* Label — hidden when collapsed, appears on hover */}
          <span className="absolute z-10 text-white font-semibold uppercase tracking-wider text-[11px] transition-all duration-500 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap">
            {label}
          </span>
        </a>
      ))}
    </div>
  );
}
