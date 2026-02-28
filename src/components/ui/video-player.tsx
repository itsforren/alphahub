import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string | null;
  type?: 'hls' | 'iframe' | 'auto';
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
  showCornerAccents?: boolean;
  fallbackMessage?: string;
}

export function VideoPlayer({
  src,
  type = 'auto',
  autoPlay = false,
  loop = false,
  muted = true,
  className,
  showCornerAccents = true,
  fallbackMessage = 'No video available',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(muted);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  // Determine video type
  const resolvedType = type === 'auto' 
    ? (src?.includes('iframe') || src?.includes('embed') || src?.includes('bunny') ? 'iframe' : 'hls')
    : type;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || resolvedType === 'iframe') return;

    let hlsInstance: any = null;

    if (src.includes('.m3u8')) {
      import('hls.js').then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          hlsInstance = new Hls();
          hlsInstance.loadSource(src);
          hlsInstance.attachMedia(video);
          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            if (autoPlay) video.play().catch(() => {});
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = src;
          if (autoPlay) video.play().catch(() => {});
        }
      });
    } else {
      video.src = src;
      if (autoPlay) video.play().catch(() => {});
    }

    return () => { hlsInstance?.destroy(); };
  }, [src, autoPlay, resolvedType]);

  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Build responsive Bunny URL for iframes - converts /play/ to /embed/ and adds required params
  const getResponsiveEmbedUrl = (url: string) => {
    let processedUrl = url;
    
    // Convert Bunny /play/ endpoint to /embed/ endpoint for responsive behavior
    if (processedUrl.includes('mediadelivery.net/play/')) {
      processedUrl = processedUrl.replace('/play/', '/embed/');
    }
    
    // Build query params
    const params = new URLSearchParams();
    params.set('responsive', 'true');
    if (autoPlay) params.set('autoplay', 'true');
    if (muted) params.set('muted', 'true');
    if (loop) params.set('loop', 'true');
    
    const separator = processedUrl.includes('?') ? '&' : '?';
    return `${processedUrl}${separator}${params.toString()}`;
  };

  if (!src) {
    return (
      <div className={cn('glass-card aspect-video relative overflow-hidden', className)}>
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/20">
          <p className="text-muted-foreground">{fallbackMessage}</p>
        </div>
        {showCornerAccents && <CornerAccents />}
      </div>
    );
  }

  if (resolvedType === 'iframe') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={cn('glass-card aspect-video relative overflow-hidden', className)}
      >
        <iframe
          src={getResponsiveEmbedUrl(src)}
          className="absolute inset-0 w-full h-full"
          style={{ border: 'none' }}
          allowFullScreen
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        />
        {showCornerAccents && <CornerAccents />}
      </motion.div>
    );
  }

  // Native video player (HLS or direct)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn('glass-card aspect-video relative overflow-hidden', className)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover rounded-xl"
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        loop={loop}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Play overlay for non-autoplay videos */}
      {!isPlaying && !autoPlay && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm cursor-pointer group"
        >
          <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:bg-primary transition-all duration-300 group-hover:scale-110 shadow-glow">
            <Play className="w-8 h-8 text-primary-foreground ml-1" />
          </div>
        </motion.button>
      )}

      {/* Unmute overlay for autoplay muted videos */}
      {isMuted && isPlaying && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleUnmute}
          className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm cursor-pointer group"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:bg-primary transition-all duration-300 group-hover:scale-110 shadow-glow">
              <VolumeX className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-foreground font-bold text-lg tracking-wide">🔊 TAP FOR SOUND</span>
          </div>
        </motion.button>
      )}

      {/* Mute button when playing with sound */}
      {!isMuted && (
        <button
          onClick={handleMute}
          className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-all duration-300 z-10"
        >
          <Volume2 className="w-5 h-5 text-foreground" />
        </button>
      )}

      {showCornerAccents && <CornerAccents />}
    </motion.div>
  );
}

function CornerAccents() {
  return (
    <>
      <div className="absolute top-0 left-0 w-10 h-10 border-l-2 border-t-2 border-primary/50 rounded-tl-xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-10 h-10 border-r-2 border-t-2 border-primary/50 rounded-tr-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-10 h-10 border-l-2 border-b-2 border-primary/50 rounded-bl-xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-10 h-10 border-r-2 border-b-2 border-primary/50 rounded-br-xl pointer-events-none" />
    </>
  );
}
