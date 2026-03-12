import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProfilePhotoUploadProps {
  currentImageUrl: string | null;
  name: string;
  clientId: string;
  onUpload: (url: string) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  cacheKey?: string | null;
}

export function ProfilePhotoUpload({
  currentImageUrl,
  name,
  clientId,
  onUpload,
  size = 'md',
  className,
  cacheKey,
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      // Stable path used everywhere (NFIA + Hub): media/agent-headshots/{clientId}.{ext}
      const filePath = `agent-headshots/${clientId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { upsert: true }); // upsert replaces existing file

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // Keep URL stationary; UI will cache-bust with clients.headshot_updated_at
      await onUpload(publicUrl);
      toast.success('Photo updated successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={cn("relative group", className)}>
      <Avatar className={cn(sizeClasses[size], "border-2 border-primary/20")}>
        <AvatarImage
          src={currentImageUrl ? `${currentImageUrl}${currentImageUrl.includes('?') ? '&' : '?'}v=${cacheKey || ''}` : undefined}
          alt={name}
        />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      {/* Upload Overlay */}
      <Button
        variant="secondary"
        size="icon"
        className={cn(
          "absolute inset-0 w-full h-full rounded-full",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "bg-black/50 hover:bg-black/60"
        )}
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        ) : (
          <Camera className="w-5 h-5 text-white" />
        )}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
