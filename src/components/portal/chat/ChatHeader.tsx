import { useState } from 'react';
import { X, Minus, Maximize2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isWithinBusinessHours } from '@/hooks/useChat';
import { FeatureRequestModal } from '@/components/hub/FeatureRequestModal';

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onExpand?: () => void;
  showExpand?: boolean;
}

export function ChatHeader({
  title = 'Chat with Support',
  subtitle,
  onClose,
  onMinimize,
  onExpand,
  showExpand = false,
}: ChatHeaderProps) {
  const isOpen = isWithinBusinessHours();
  const [featureModalOpen, setFeatureModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-muted/50 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs sm:text-sm font-bold text-primary">SM</span>
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-background ${
                isOpen ? 'bg-emerald-500' : 'bg-muted-foreground'
              }`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{title}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {subtitle || (isOpen ? 'Online now' : 'Away - Back 9AM EST')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFeatureModalOpen(true)}
            className="h-8 w-8 text-amber-400 hover:text-amber-300"
            title="Request a Feature"
          >
            <Lightbulb className="w-4 h-4" />
          </Button>
          {showExpand && onExpand && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onExpand}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
          {onMinimize && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMinimize}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Minus className="w-4 h-4" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <FeatureRequestModal open={featureModalOpen} onOpenChange={setFeatureModalOpen} />
    </>
  );
}
