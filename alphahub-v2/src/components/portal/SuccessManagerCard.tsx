import { Phone, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSuccessManagerSettings } from '@/hooks/useSuccessManagerSettings';

interface SuccessManagerCardProps {
  name: string | null;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  useFallbackDefaults?: boolean;
}

export function SuccessManagerCard({ 
  name, 
  email, 
  phone, 
  imageUrl,
  useFallbackDefaults = true 
}: SuccessManagerCardProps) {
  const { data: defaults } = useSuccessManagerSettings();

  // Use provided values or fallback to defaults
  const displayName = name || (useFallbackDefaults ? defaults?.default_success_manager_name : null);
  const displayEmail = email || (useFallbackDefaults ? defaults?.default_success_manager_email : null);
  const displayPhone = phone || (useFallbackDefaults ? defaults?.default_success_manager_phone : null);
  const displayImage = imageUrl || (useFallbackDefaults ? defaults?.default_success_manager_image_url : null);

  // Don't render if no manager assigned (and no defaults)
  if (!displayName && !displayEmail && !displayPhone) {
    return null;
  }

  const finalName = displayName || 'Your Success Manager';
  const initials = finalName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl border border-border/50 bg-card p-5 shadow-sm"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-primary mb-4">
        Alpha Success Manager
      </p>
      
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16 border-2 border-primary/20">
          <AvatarImage src={displayImage || undefined} alt={finalName} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{finalName}</h3>
          <p className="text-sm text-muted-foreground">Here to help you succeed</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {displayPhone && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-left"
            asChild
          >
            <a href={`tel:${displayPhone}`}>
              <Phone className="w-4 h-4 text-primary" />
              <span className="truncate">{displayPhone}</span>
            </a>
          </Button>
        )}
        
        {displayEmail && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-left"
            asChild
          >
            <a href={`mailto:${displayEmail}`}>
              <Mail className="w-4 h-4 text-primary" />
              <span className="truncate">{displayEmail}</span>
            </a>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
