import { useState, useEffect } from 'react';
import { Rocket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/hooks/useClientData';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

const POPUP_EXPIRES_AT = '2026-03-18T23:59:59Z';
const DISMISS_KEY = 'campaign-update-popup-dismissed-mar2026';

const ONBOARDING_STATUSES = ['pending', 'in_progress'];

export function CampaignUpdateBanner() {
  const [open, setOpen] = useState(false);
  const { profile, isAdmin } = useAuth();
  const { data: client } = useClient();

  useEffect(() => {
    const now = new Date();
    const expires = new Date(POPUP_EXPIRES_AT);
    const dismissed = localStorage.getItem(DISMISS_KEY);

    // Don't show to onboarding clients
    if (client && ONBOARDING_STATUSES.includes(client.onboarding_status ?? '')) return;

    if (now < expires && !dismissed) {
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [client]);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  const firstName = profile?.name?.split(' ')[0] || 'there';
  const fullName = profile?.name || 'Agent';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[92vw] sm:max-w-md max-h-[85vh] overflow-y-auto p-0 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl bg-background/80">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 px-5 sm:px-6 pt-6 sm:pt-8 pb-10 sm:pb-12 text-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
          <Rocket className="w-7 h-7 sm:w-8 sm:h-8 text-white/90 mx-auto mb-2 sm:mb-3 relative z-10" />
          <DialogTitle className="text-white text-lg sm:text-xl font-bold relative z-10 tracking-tight">
            Campaign Performance Update
          </DialogTitle>
        </div>

        {/* Avatar overlapping the header */}
        <div className="flex justify-center -mt-7 sm:-mt-8 relative z-20">
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-4 ring-background/80 shadow-lg">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={firstName} />
            ) : null}
            <AvatarFallback className="text-base sm:text-lg font-semibold bg-emerald-950 text-emerald-300">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 pt-2 sm:pt-3 pb-5 sm:pb-6 space-y-3 sm:space-y-4">
          <p className="text-base font-semibold text-foreground text-center">
            Hey {firstName},
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you very much for your patience. We discovered a major issue within Google Ads' Smart Bidding algorithm that was causing campaigns to severely underspend, despite having high daily budgets set. Your budget was fully available the entire time. Google simply was not delivering the impressions.
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Our team performed a deep audit of every campaign and applied targeted fixes directly through the Google Ads API. Your campaigns are now fully optimized and scaling back up to their target spend levels. Expect lead volume to ramp significantly over the next few days as the algorithm recalibrates.
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            We appreciate your patience and your trust. Your success is what drives everything we do here.
          </p>

          <div className="pt-1 sm:pt-2 space-y-0.5">
            <p className="text-sm text-foreground">
              Looking forward to massive results together,
            </p>
            <p className="text-sm text-foreground mt-2">
              Sincerely yours,
            </p>
            <p className="text-base font-bold text-foreground mt-1">
              Alpha Agent
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full mt-1 sm:mt-2 bg-gradient-to-r from-emerald-900 to-teal-800 hover:from-emerald-950 hover:to-teal-900 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Got it, {firstName}!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
