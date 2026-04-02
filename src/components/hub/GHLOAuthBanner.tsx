import { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Shows a critical red banner when the GHL OAuth connection is broken.
 * Only visible to admins. Polls ghl_oauth_tokens.health_status and
 * subscribes to system_alerts for real-time updates.
 */
export function GHLOAuthBanner() {
  const { isAdmin } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    // Check health_status on mount
    const checkHealth = async () => {
      const { data } = await supabase
        .from('ghl_oauth_tokens' as any)
        .select('health_status')
        .maybeSingle();

      if (data && (data as any).health_status === 'broken') {
        setVisible(true);
      }
    };

    checkHealth();

    // Also check for unacknowledged oauth_failure alerts
    const checkAlerts = async () => {
      const { data } = await supabase
        .from('system_alerts')
        .select('id')
        .eq('alert_type', 'oauth_failure')
        .is('acknowledged_at', null)
        .limit(1)
        .maybeSingle();

      if (data) setVisible(true);
    };

    checkAlerts();

    // Subscribe to system_alerts for real-time
    const channel = supabase
      .channel('oauth-health')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_alerts' },
        (payload: any) => {
          if (payload.new?.alert_type === 'oauth_failure') {
            setVisible(true);
            setDismissed(false);
          }
        }
      )
      .subscribe();

    // Re-check every 5 minutes
    const interval = setInterval(() => {
      checkHealth();
      checkAlerts();
    }, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isAdmin]);

  if (!isAdmin || !visible || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-400">
                GHL OAuth Connection Broken — Lead delivery is DOWN
              </p>
              <p className="text-xs text-red-400/80 mt-0.5">
                Leads are not being injected into agent CRMs. Re-authorize the GHL connection immediately.
              </p>
            </div>
            <a
              href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-oauth-start`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors flex-shrink-0"
            >
              Reconnect Now
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={() => setDismissed(true)}
              className="text-red-400/60 hover:text-red-400 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
