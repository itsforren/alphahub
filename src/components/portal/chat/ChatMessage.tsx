import { format, isToday, isYesterday, isSameYear } from 'date-fns';
import { Check, CheckCheck, FileText, Download, ImageOff } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { parseMessageWithLinks, extractUrls } from '@/lib/parseLinks';
import { LinkPreview } from './LinkPreview';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwnMessage: boolean;
}

// Helper function for smart date formatting
const formatMessageDate = (date: Date) => {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`;
  if (isSameYear(date, new Date())) return format(date, 'MMM d') + ' at ' + format(date, 'h:mm a');
  return format(date, 'MMM d, yyyy') + ' at ' + format(date, 'h:mm a');
};

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  const [imageError, setImageError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const initials = message.sender_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasAttachment = message.attachment_url;
  const isImage = message.attachment_type === 'image';
  
  // Extract URLs from message for link previews
  const urls = useMemo(() => {
    if (!message.message) return [];
    return extractUrls(message.message);
  }, [message.message]);
  
  // Parse message content with clickable links
  const parsedMessage = useMemo(() => {
    if (!message.message || message.message.startsWith('Sent ')) return null;
    return parseMessageWithLinks(message.message);
  }, [message.message]);

  return (
    <div className="flex gap-3 hover:bg-muted/30 px-2 py-1.5 -mx-2 rounded-lg transition-colors">
      {/* Avatar */}
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-medium overflow-hidden',
          message.sender_role === 'admin'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {message.sender_avatar_url && !avatarError ? (
          <img
            src={message.sender_avatar_url}
            alt={message.sender_name}
            className="w-9 h-9 rounded-lg object-cover"
            onError={() => setAvatarError(true)}
          />
        ) : (
          initials
        )}
      </div>

      {/* Message content - inline style like Slack */}
      <div className="flex-1 min-w-0">
        {/* Header row: name, role badge, timestamp */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">
            {message.sender_name}
          </span>
          {message.sender_role === 'admin' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
              ASM
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {formatMessageDate(new Date(message.created_at))}
          </span>
          {isOwnMessage && (
            <span className={cn(
              "flex items-center",
              message.read_at ? "text-blue-500" : "text-muted-foreground/50"
            )}>
              {message.read_at ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </span>
          )}
        </div>

        {/* Message text with clickable links */}
        {parsedMessage && (
          <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words mt-0.5">
            {parsedMessage}
          </p>
        )}

        {/* Link previews */}
        {urls.length > 0 && (
          <div className="space-y-2">
            {urls.slice(0, 3).map((url, idx) => (
              <LinkPreview 
                key={`${message.id}-${idx}`} 
                url={url} 
                messageId={message.id}
                cachedPreview={(message as any).link_preview}
              />
            ))}
          </div>
        )}

        {/* Attachment */}
        {hasAttachment && (
          <div className="mt-2">
            {isImage && !imageError ? (
              <a 
                href={message.attachment_url!} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={message.attachment_url!}
                  alt={message.attachment_name || 'Image'}
                  className="max-w-[320px] max-h-[240px] object-cover rounded-lg border border-border/50 hover:border-border transition-colors"
                  onError={() => setImageError(true)}
                />
              </a>
            ) : isImage && imageError ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50 max-w-[280px]">
                <ImageOff className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Image failed to load</span>
              </div>
            ) : (
              <a
                href={message.attachment_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors max-w-[280px]"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {message.attachment_name || 'File'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click to download
                  </p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
