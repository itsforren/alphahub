import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneCall, X, MapPin, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  age: string | null;
}

interface NewLeadPopupProps {
  lead: NewLead | null;
  onView: () => void;
  onDismiss: () => void;
}

function toProperCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function NewLeadPopup({ lead, onView, onDismiss }: NewLeadPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lead) {
      setVisible(true);
      // Auto-dismiss after 30 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 30000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [lead?.id]);

  if (!lead) return null;

  const name = toProperCase(
    [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'New Lead'
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 right-4 z-[999] w-[340px] rounded-2xl border border-emerald-500/30 bg-background/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(16,185,129,0.1)] overflow-hidden"
        >
          {/* Gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500 animate-pulse" />

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center">
                  <PhoneCall className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">New Lead</p>
                  <p className="text-base font-bold text-foreground">{name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setVisible(false);
                  setTimeout(onDismiss, 300);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Details */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                  <Phone className="h-3 w-3" /> {lead.phone}
                </a>
              )}
              {lead.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {lead.email}
                </span>
              )}
              {lead.state && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {lead.state}
                </span>
              )}
              {lead.age && <span>Age {lead.age}</span>}
            </div>

            {/* Action */}
            <Button
              onClick={() => {
                setVisible(false);
                onView();
              }}
              className="w-full h-9 font-bold text-sm bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600"
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              View Lead
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
