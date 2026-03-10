import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TicketImageGalleryProps {
  urls: string[];
  className?: string;
}

const MAX_VISIBLE = 4;

export function TicketImageGallery({ urls, className }: TicketImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (urls.length === 0) return null;

  const visibleUrls = urls.slice(0, MAX_VISIBLE);
  const overflow = urls.length - MAX_VISIBLE;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % urls.length);
    }
  };

  const goPrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + urls.length) % urls.length);
    }
  };

  return (
    <>
      <div className={cn('grid grid-cols-4 gap-2', className)}>
        {visibleUrls.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => openLightbox(i)}
            className="relative aspect-square overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            {i === MAX_VISIBLE - 1 && overflow > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                +{overflow}
              </div>
            )}
          </button>
        ))}
      </div>

      <Dialog open={lightboxIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {lightboxIndex !== null && (
            <div className="relative flex items-center justify-center">
              {urls.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goPrev}
                  className="absolute left-2 z-10 rounded-full bg-black/40 text-white hover:bg-black/60"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <img
                src={urls[lightboxIndex]}
                alt=""
                className="max-h-[80vh] rounded-lg object-contain"
              />
              {urls.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goNext}
                  className="absolute right-2 z-10 rounded-full bg-black/40 text-white hover:bg-black/60"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
