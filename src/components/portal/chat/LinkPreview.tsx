import { useState, useEffect } from 'react';
import { ExternalLink, Globe, ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

interface LinkPreviewProps {
  url: string;
  cachedPreview?: LinkPreviewData | null;
  messageId?: string;
  className?: string;
}

export function LinkPreview({ url, cachedPreview, messageId, className }: LinkPreviewProps) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(cachedPreview || null);
  const [loading, setLoading] = useState(!cachedPreview);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (cachedPreview) {
      setPreview(cachedPreview);
      setLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase.functions.invoke('fetch-link-preview', {
          body: { url, messageId },
        });

        if (fetchError) throw fetchError;
        if (data) {
          setPreview(data);
        }
      } catch (err) {
        console.error('Failed to fetch link preview:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url, cachedPreview, messageId]);

  if (error || (!loading && !preview?.title)) {
    return null; // Don't show anything if we couldn't get preview data
  }

  if (loading) {
    return (
      <div className={cn("mt-2 rounded-lg border border-border/50 overflow-hidden max-w-md", className)}>
        <div className="p-3 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    );
  }

  const hostname = new URL(url).hostname.replace('www.', '');

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-2 block rounded-lg border border-border/50 overflow-hidden max-w-md hover:border-border transition-colors group",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Image */}
      {preview?.image && !imageError && (
        <div className="relative aspect-video bg-muted overflow-hidden max-h-40">
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-1.5 bg-muted/30">
        {/* Site name / URL */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {preview?.favicon ? (
            <img src={preview.favicon} alt="" className="w-4 h-4 rounded" onError={(e) => e.currentTarget.style.display = 'none'} />
          ) : (
            <Globe className="w-3 h-3" />
          )}
          <span className="truncate">{preview?.siteName || hostname}</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Title */}
        {preview?.title && (
          <h4 className="font-medium text-sm line-clamp-2 text-foreground">
            {preview.title}
          </h4>
        )}

        {/* Description */}
        {preview?.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
