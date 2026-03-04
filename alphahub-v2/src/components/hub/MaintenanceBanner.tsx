import { useState, useEffect } from 'react';
import { X, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Banner will auto-expire after this UTC timestamp (24 hours from deployment)
const BANNER_EXPIRES_AT = '2026-03-04T12:00:00Z';
const DISMISS_KEY = 'maintenance-banner-dismissed-mar2026';

export function MaintenanceBanner() {
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
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-start gap-3">
              <Wrench className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground flex-1">
                <span className="font-semibold">Maintenance Update</span>
                {' '}&mdash; Over the past few days, Alpha Hub underwent planned maintenance to improve your experience. During this period, support responses may have been delayed and ad spend was temporarily scaled back to protect your budget and prevent any data loss. All systems are now fully operational &mdash; your campaigns are being ramped back up to optimal spend levels. If you have any questions, reach out to your success manager. Thank you for your patience.
              </p>
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
