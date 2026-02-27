import { useState, useEffect } from 'react';
import { Calendar, MessageCircle, Pencil, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useSuccessManagerSettings } from '@/hooks/useSuccessManagerSettings';
interface SuccessManagerWidgetProps {
  name: string | null;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  calendarLink?: string | null;
  onChatClick?: () => void;
  onSave?: (data: {
    success_manager_name: string;
    success_manager_email: string;
    success_manager_phone: string;
    success_manager_image_url: string;
  }) => Promise<void>;
  isSaving?: boolean;
  className?: string;
  useFallbackDefaults?: boolean;
}

export function SuccessManagerWidget({
  name,
  email,
  phone,
  imageUrl,
  calendarLink,
  onChatClick,
  onSave,
  isSaving,
  className,
  useFallbackDefaults = false,
}: SuccessManagerWidgetProps) {
  const { data: defaults } = useSuccessManagerSettings();
  
  // Use client-specific values, or fall back to defaults if enabled
  const displayName = name || (useFallbackDefaults ? defaults?.default_success_manager_name : null);
  const displayEmail = email || (useFallbackDefaults ? defaults?.default_success_manager_email : null);
  const displayPhone = phone || (useFallbackDefaults ? defaults?.default_success_manager_phone : null);
  const displayImage = imageUrl || (useFallbackDefaults ? defaults?.default_success_manager_image_url : null);
  const displayCalendarLink = calendarLink || (useFallbackDefaults ? defaults?.default_calendar_link : null);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    success_manager_name: name || '',
    success_manager_email: email || '',
    success_manager_phone: phone || '',
    success_manager_image_url: imageUrl || '',
  });

  // Update form data when props change
  useEffect(() => {
    setFormData({
      success_manager_name: name || '',
      success_manager_email: email || '',
      success_manager_phone: phone || '',
      success_manager_image_url: imageUrl || '',
    });
  }, [name, email, phone, imageUrl]);

  const initials = displayName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SM';

  const handleSave = async () => {
    if (onSave) {
      await onSave(formData);
      setIsEditing(false);
    }
  };

  if (!displayName && !displayEmail && !displayPhone) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-gradient-to-r from-card via-card to-primary/5",
        "border border-border/50",
        "shadow-lg shadow-primary/5",
        "backdrop-blur-sm",
        className
      )}
    >
      {/* Reflective gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <div className="relative p-4">
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <Input
              placeholder="Name"
              value={formData.success_manager_name}
              onChange={(e) => setFormData({ ...formData, success_manager_name: e.target.value })}
              className="h-9 text-sm"
            />
            <Input
              placeholder="Email"
              value={formData.success_manager_email}
              onChange={(e) => setFormData({ ...formData, success_manager_email: e.target.value })}
              className="h-9 text-sm"
            />
            <Input
              placeholder="Phone"
              value={formData.success_manager_phone}
              onChange={(e) => setFormData({ ...formData, success_manager_phone: e.target.value })}
              className="h-9 text-sm"
            />
            <Input
              placeholder="Image URL"
              value={formData.success_manager_image_url}
              onChange={(e) => setFormData({ ...formData, success_manager_image_url: e.target.value })}
              className="h-9 text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left: Avatar and Info */}
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border-2 border-primary/20 ring-2 ring-primary/10 ring-offset-2 ring-offset-card">
                <AvatarImage src={displayImage || undefined} alt={displayName || 'Success Manager'} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Success Manager
                  </span>
                  {onSave && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <h3 className="font-semibold text-foreground">{displayName}</h3>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex gap-2">
              {displayCalendarLink && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  asChild
                >
                  <a href={displayCalendarLink} target="_blank" rel="noopener noreferrer">
                    <Calendar className="w-4 h-4" />
                    Book Call
                  </a>
                </Button>
              )}
              {onChatClick && (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={onChatClick}
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
