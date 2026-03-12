import { useState, useEffect } from 'react';
import { X, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Banner auto-expires after this UTC timestamp (~7 days from now)
const BANNER_EXPIRES_AT = '2026-03-18T23:59:59Z';
const DISMISS_KEY = 'campaign-update-banner-dismissed-mar2026';

export function CampaignUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const now = new Date();
    const expires = new Date(BANNER_EXPIRES_AT);
    const dismissed = localStorage.getItem(DISMISS_KEY);

    if (now < expires && !dismissed) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-start gap-3">
              <Rocket className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-foreground flex-1">
                <span className="font-semibold">Campaign Performance Update</span>
                {' '}&mdash; Over the past two weeks, Google Ads experienced a Smart Bidding algorithm issue that caused campaigns to severely underspend despite having high daily budgets set. Your budget was fully available &mdash; Google simply wasn&rsquo;t delivering the impressions. Our team identified the root cause, performed a deep audit of every campaign, and applied targeted fixes directly through the Google Ads API. Your campaigns are now fully optimized and scaling back up to their target spend levels. Expect lead volume to ramp significantly over the next few days as the algorithm recalibrates. We appreciate your patience &mdash; reach out to your success manager with any questions.
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
