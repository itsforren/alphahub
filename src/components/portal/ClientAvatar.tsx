import { cn } from '@/lib/utils';
import defaultAvatar from '@/assets/default-agent-avatar.png';

interface ClientAvatarProps {
  src?: string | null;
  imageUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Optional cache-busting token (e.g. updated_at). */
  cacheKey?: string | number | null;
}

function withCacheKey(url: string, cacheKey?: string | number | null) {
  if (!cacheKey) return url;
  try {
    // If it's a relative path (like imported asset), leave it alone.
    if (!/^https?:\/\//i.test(url)) return url;

    const u = new URL(url);
    u.searchParams.set('v', String(cacheKey));
    return u.toString();
  } catch {
    // Fallback for weird URLs
    const joiner = url.includes('?') ? '&' : '?';
    return `${url}${joiner}v=${encodeURIComponent(String(cacheKey))}`;
  }
}

export default function ClientAvatar({ src, imageUrl, name, size = 'md', className, cacheKey }: ClientAvatarProps) {
  const rawSrc = src || imageUrl || defaultAvatar;
  const resolvedSrc = withCacheKey(rawSrc, cacheKey);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  return (
    <img
      src={resolvedSrc}
      alt={name}
      loading="lazy"
      onError={(e) => {
        // Fallback to default avatar if remote image fails / is blocked.
        const img = e.currentTarget;
        if (img.src !== defaultAvatar) {
          img.src = defaultAvatar;
        }
      }}
      className={cn('rounded-full object-cover aspect-square ring-1 ring-white/[0.08]', sizeClasses[size], className)}
    />
  );
}
