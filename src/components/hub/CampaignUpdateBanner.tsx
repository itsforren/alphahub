import { useState, useEffect } from 'react';
import { Rocket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

const POPUP_EXPIRES_AT = '2026-03-18T23:59:59Z';
const DISMISS_KEY = 'campaign-update-popup-dismissed-mar2026';

export function CampaignUpdateBanner() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    const now = new Date();
    const expires = new Date(POPUP_EXPIRES_AT);
    const dismissed = localStorage.getItem(DISMISS_KEY);

    if (now < expires && !dismissed) {
      // Small delay so the dashboard loads first
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 rounded-2xl shadow-2xl">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-6 pt-8 pb-12 text-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
          <Rocket className="w-8 h-8 text-white/90 mx-auto mb-3 relative z-10" />
          <DialogTitle className="text-white text-xl font-bold relative z-10 tracking-tight">
            Campaign Performance Update
          </DialogTitle>
        </div>

        {/* Avatar overlapping the header */}
        <div className="flex justify-center -mt-8 relative z-20">
          <Avatar className="h-16 w-16 ring-4 ring-background shadow-lg">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={fullName} />
            ) : null}
            <AvatarFallback className="text-lg font-semibold bg-emerald-100 text-emerald-700">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Body */}
        <div className="px-6 pt-3 pb-6 space-y-4">
          <p className="text-base font-semibold text-foreground text-center">
            Hey {fullName},
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you very much for your patience. We discovered a major issue within Google Ads&rsquo; Smart Bidding algorithm that was causing campaigns to severely underspend &mdash; despite having high daily budgets set. Your budget was fully available the entire time; Google simply was not delivering the impressions.
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Our team performed a deep audit of every campaign and applied targeted fixes directly through the Google Ads API. Your campaigns are now fully optimized and scaling back up to their target spend levels. Expect lead volume to ramp significantly over the next few days as the algorithm recalibrates.
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you for your patience. We value your business extremely, and we value your business more than you know.
          </p>

          <div className="pt-2 space-y-0.5">
            <p className="text-sm text-foreground">
              Looking forward to massive results together,
            </p>
            <p className="text-sm text-foreground mt-2">
              Sincerely yours,
            </p>
            <p className="text-base font-bold text-foreground mt-1">
              Alvader
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Got it, {firstName}!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
