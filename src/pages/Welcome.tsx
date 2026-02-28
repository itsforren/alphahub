import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { motion } from "framer-motion";
import { Volume2, VolumeX, Crown, LogIn, FileSignature, CreditCard, Phone, MessageSquare, Calendar } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const Welcome = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const VIDEO_URL = "https://vz-72d7dfc8-b4d.b-cdn.net/b7c1adc4-3b42-4635-82ef-9985eed34ade/playlist.m3u8";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hlsInstance: any = null;

    import('hls.js').then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(VIDEO_URL);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(console.error);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = VIDEO_URL;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch(console.error);
        });
      }
    });
    return () => { hlsInstance?.destroy(); };
  }, []);

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

  const onboardingSteps = [
    { icon: LogIn, text: "Sign into Alpha Hub" },
    { icon: FileSignature, text: "Sign your agreement" },
    { icon: CreditCard, text: "Sign into your CRM and activate your subscription and add your payment" },
    
    { icon: MessageSquare, text: "Submit your A2P with the instructions provided to you in the chat" },
    { icon: Calendar, text: "Add your Google Calendar and Zoom to your CRM profile" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6"
            >
              <Crown className="w-5 h-5 text-primary" />
              <span className="text-primary font-medium">Exclusive Access Granted</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Thanks for Joining{" "}
              <span className="text-primary">Alpha Agent</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Welcome to the future of insurance lead generation.
            </p>
          </div>

          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="relative rounded-2xl overflow-hidden shadow-2xl mb-10"
          >
            <video
              ref={videoRef}
              className="w-full aspect-video object-cover"
              autoPlay
              loop
              muted={isMuted}
              playsInline
            />
            
            {/* Mute/Unmute Button */}
            <button
              onClick={isMuted ? handleUnmute : handleMute}
              className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all duration-200"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </motion.div>

          {/* Sign into Alpha Hub CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-center mb-8"
          >
            <Link to="/auth/login">
              <Button size="lg" className="text-lg px-8 py-6 h-auto">
                <LogIn className="w-5 h-5 mr-2" />
                Sign into Alpha Hub to Start Your Onboarding
              </Button>
            </Link>
          </motion.div>

          {/* Onboarding Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8"
          >
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Your Onboarding Steps
            </h2>
            
            <div className="space-y-3">
              {onboardingSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + index * 0.05 }}
                  className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <step.icon className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{step.text}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Alpha Black Box Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-card border border-border rounded-2xl p-6 md:p-8"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="bg-primary/10 p-3 rounded-xl">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Alpha Black Box — By Special Request Only
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Alpha Black Box has been activated exclusively for users spending a 
                  <span className="text-primary font-semibold"> minimum of $10,000/month </span> 
                  in ad spend. This is made possible due to our significantly lowered management costs, 
                  and is only available by special request.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Welcome;
