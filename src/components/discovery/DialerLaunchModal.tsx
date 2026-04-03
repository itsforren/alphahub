import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneCall, Zap, Target, TrendingUp, Rocket } from 'lucide-react';

const DISMISS_KEY = 'dialer-launch-seen-v1';

export function DialerLaunchModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-primary/20 bg-gradient-to-b from-background to-background/95">
        {/* Header glow */}
        <div className="relative px-8 pt-8 pb-4 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Rocket className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Your Lead Dialer is Live
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              A brand new way to connect with your leads — faster, smarter, and all in one place.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="px-8 pb-2 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
              <PhoneCall className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">All Your Leads, One Dashboard</p>
              <p className="text-xs text-muted-foreground">Every lead we've delivered to you is ready to dial. Click, call, and track your progress in real-time.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 flex-shrink-0">
              <Target className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Smart Priority Queue</p>
              <p className="text-xs text-muted-foreground">Fresh leads surface first. Callbacks are tracked. Strategy calls are booked directly into your calendar.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Live Leaderboard & Stats</p>
              <p className="text-xs text-muted-foreground">See your connection rate, booking rate, and how you stack up. Gamify your grind.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Synced to Your CRM</p>
              <p className="text-xs text-muted-foreground">Every call outcome, callback, and booked meeting syncs directly to your CRM. No manual entry.</p>
            </div>
          </div>
        </div>

        {/* Partner credit + CTA */}
        <div className="px-8 pt-4 pb-6 space-y-4">
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground/60">
              Powered by our technology partner <span className="text-primary font-semibold">Welthra</span> — a taste of what's coming with their full CRM launch. We're proud to be their partners.
            </p>
          </div>

          <Button
            onClick={handleClose}
            className="w-full gap-2 text-base py-5 bg-primary hover:bg-primary/90"
          >
            <PhoneCall className="w-4 h-4" />
            Start Dialing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
