import { X, Calendar, Clock, Shield } from 'lucide-react';
import { useClient } from '@/hooks/useClientData';
import { useEffect, useRef } from 'react';

interface ScheduleCallModalProps {
  open: boolean;
  onClose: () => void;
}

const SIERRA_IMAGE_URL = 'https://qcunascacayiiuufjtaq.supabase.co/storage/v1/object/public/media/profile-photos/1766368659922-oq4x14.jpg';
const CALENDAR_EMBED_URL = 'https://url.alphaagent.io/widget/booking/CpThmN7QPM7JjbSJSMvH';

export function ScheduleCallModal({ open, onClose }: ScheduleCallModalProps) {
  const { data: client } = useClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstName = client?.name?.split(' ')[0] || '';

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-muted/80 hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={SIERRA_IMAGE_URL}
                alt="Sierra Reigh"
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-card" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-primary font-medium tracking-wide uppercase">
                Client Strategy Call
              </p>
              <h2 className="text-xl font-bold text-foreground mt-0.5">
                {firstName ? `${firstName}, let's talk strategy` : 'Schedule Your Call'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                with <span className="text-foreground font-medium">Sierra Reigh</span> - Client Success Manager
              </p>
            </div>
          </div>

          {/* Value props */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>15 min</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Pick any time</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>1-on-1 private</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-6" />

        {/* Calendar embed */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <iframe
            src={CALENDAR_EMBED_URL}
            className="w-full border-none"
            style={{ minHeight: '550px', height: '100%' }}
            scrolling="no"
          />
        </div>
      </div>
    </div>
  );
}
