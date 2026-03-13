import { useState, useEffect } from 'react';
import { Zap, Target, CreditCard, Lightbulb, Gift, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/hooks/useClientData';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

const POPUP_EXPIRES_AT = '2026-03-28T23:59:59Z';
const DISMISS_KEY = 'platform-update-popup-dismissed-mar13-2026';
const TRACKING_KEY = 'platform_update_mar13_seen';

const ONBOARDING_STATUSES = ['pending', 'in_progress'];

export function PlatformUpdateBanner() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const { data: client } = useClient();

  useEffect(() => {
    if (!client) return;
    const now = new Date();
    const expires = new Date(POPUP_EXPIRES_AT);

    if (ONBOARDING_STATUSES.includes(client.onboarding_status ?? '')) return;

    const stageMessages = (client as any).stage_messages_sent as Record<string, string> | null;
    const forceShow = stageMessages?.force_show_platform_update === 'true';
    const dismissed = localStorage.getItem(DISMISS_KEY);

    if (forceShow || (now < expires && !dismissed)) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [client]);

  useEffect(() => {
    if (!open || !client?.id) return;

    const trackView = async () => {
      try {
        const stageMessages = (client as any).stage_messages_sent as Record<string, string> | null ?? {};
        const updated = { ...stageMessages, [TRACKING_KEY]: new Date().toISOString() };
        delete (updated as any).force_show_platform_update;
        await supabase
          .from('clients')
          .update({ stage_messages_sent: updated })
          .eq('id', client.id);
      } catch (e) {
        console.error('Failed to track popup view:', e);
      }
    };
    trackView();
  }, [open, client?.id]);

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
      <DialogContent className="max-w-[92vw] sm:max-w-lg max-h-[88vh] overflow-y-auto p-0 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl bg-background/95">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-800 px-5 sm:px-6 pt-6 sm:pt-8 pb-10 sm:pb-12 text-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
          <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 mx-auto mb-2 sm:mb-3 relative z-10" />
          <DialogTitle className="text-white text-lg sm:text-xl font-bold relative z-10 tracking-tight">
            Platform Updates
          </DialogTitle>
          <p className="text-white/50 text-xs mt-1 relative z-10">March 2026</p>
        </div>

        {/* Avatar */}
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
        <div className="px-5 sm:px-6 pt-2 sm:pt-3 pb-5 sm:pb-6 space-y-4 sm:space-y-5">
          <p className="text-base font-semibold text-foreground text-center">
            Hey {firstName}, here's what's new.
          </p>

          {/* Section: Campaign Optimization */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">Smarter Ad Targeting</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We just added a massive wave of negative keywords across all campaigns. Think of it this way: every time someone clicks your ad, you pay for that click. Some of those clicks were from people who would never buy a policy. We've now blocked those wasteful clicks so your budget goes straight toward the people who are actually looking for what you offer.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Here's where it gets powerful: we're using data from <span className="text-foreground font-medium">every agent's campaign on our platform</span> to figure out what's working and what isn't. That collective intelligence gets applied directly to your campaign, so you're benefiting from the insights of the entire Alpha Agent network.
            </p>
            <p className="text-xs text-muted-foreground/70 italic">
              If your campaign spend has been lower than expected, know that we're working on it deeply to get the best results possible.
            </p>
          </div>

          {/* Section: Billing */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">Billing System Upgrade</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We're revamping the entire billing system to make it as clean and easy to understand as possible on your end. No more guesswork — you'll always know exactly what you're being charged, when, and why. New billing features are rolling out over the coming days.
            </p>
          </div>

          {/* Section: Feature Requests */}
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">Feature Requests — Live Today</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can now request features directly inside Alpha Hub. Open your chat, tap the <span className="inline-flex items-center align-text-bottom"><Lightbulb className="w-3.5 h-3.5 text-amber-400 mx-0.5" /></span> icon at the top, and tell us what would make the platform work better for you. We read every single request and use them to decide what to build next. Your ideas shape the product.
            </p>
          </div>

          {/* Section: Referral */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">Refer & Save</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every agent you refer saves you <span className="text-foreground font-semibold">10% off your management fee</span> for the life of their account. Get 15 agents on the system and <span className="text-foreground font-semibold">you don't pay a penny for management — ever</span>.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Want help spreading the word? Just let us know in the chat. We'll help you create an email and text campaign inside your CRM to reach every agent you know. It takes 5 minutes to set up.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleClose}
            className="w-full mt-1 sm:mt-2 bg-gradient-to-r from-emerald-900 to-teal-800 hover:from-emerald-950 hover:to-teal-900 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Let's go, {firstName}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
