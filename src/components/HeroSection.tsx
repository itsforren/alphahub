import { motion } from "framer-motion";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";

import agent1 from "@/assets/agent-1.png";
import agent2 from "@/assets/agent-2.png";
import agent3 from "@/assets/agent-3.png";
import agent4 from "@/assets/agent-4.png";

const HeroSection = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const VIDEO_URL = "https://vz-72d7dfc8-b4d.b-cdn.net/4e90bfe5-5d02-4976-96d6-64fc8cc65858/playlist.m3u8";

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
          video.play().catch(() => {});
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = VIDEO_URL;
        video.play().catch(() => {});
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

  const scrollToCalculator = () => {
    document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-[90vh] flex items-center justify-center pt-24 md:pt-28 pb-8 px-4 md:px-8 bg-gradient-radial relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-5xl mx-auto"
        >
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black leading-[1.1] mb-4"
          >
            <motion.span 
              className="relative inline-block"
              animate={{ 
                textShadow: [
                  "0 0 0px hsl(var(--alert))",
                  "0 0 20px hsl(var(--alert) / 0.5)",
                  "0 0 0px hsl(var(--alert))"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              STOP BUYING{" "}
              <span className="relative">
                <span className="text-muted-foreground/40">SH*T LEADS</span>
                <span className="absolute left-0 right-0 top-1/2 h-1 bg-alert -rotate-3" />
              </span>
            </motion.span>
            <br />
            <span className="glow-text">RENT</span> THE IUL SYSTEM
            <br />
            <span className="text-primary">THAT WORKS.</span>
          </motion.h1>

          {/* Badge - moved below headline */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">FOR LICENSED INSURANCE AGENTS ONLY</span>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-5 leading-relaxed"
          >
            The only flat-fee, agent-branded ecosystem built by a licensed agent.
            <br className="hidden md:block" />
            <span className="text-foreground font-medium">We build the funnel. We manage the ads. You own the assets.</span>
          </motion.p>

          {/* VSL Video Player */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="relative max-w-4xl mx-auto mb-5"
          >
            <div className="glass-card aspect-video relative overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover rounded-xl"
                autoPlay
                muted
                playsInline
                loop
              />
              
              {/* Unmute overlay */}
              {isMuted && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleUnmute}
                  className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm cursor-pointer group"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:bg-primary transition-all duration-300 group-hover:scale-110 shadow-[0_0_40px_rgba(0,214,50,0.5)]">
                      <VolumeX className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <span className="text-foreground font-bold text-lg tracking-wide">🔊 TAP FOR SOUND</span>
                  </div>
                </motion.button>
              )}

              {/* Mute/Unmute button when playing with sound */}
              {!isMuted && (
                <button
                  onClick={handleMute}
                  className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-all duration-300"
                >
                  <Volume2 className="w-5 h-5 text-foreground" />
                </button>
              )}

              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-10 h-10 border-l-2 border-t-2 border-primary/50 rounded-tl-xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-10 h-10 border-r-2 border-t-2 border-primary/50 rounded-tr-xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-l-2 border-b-2 border-primary/50 rounded-bl-xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-r-2 border-b-2 border-primary/50 rounded-br-xl pointer-events-none" />
            </div>
          </motion.div>

          {/* CTA Buttons with hierarchy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex flex-col items-center gap-4"
          >
            <button
              onClick={() => navigate("/apply")}
              className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-primary text-primary-foreground font-bold text-lg rounded-xl shadow-[0_0_60px_rgba(0,214,50,0.4)] hover:shadow-[0_0_80px_rgba(0,214,50,0.6)] transition-all duration-300 w-full sm:w-auto group animate-[pulse_3s_ease-in-out_infinite]"
            >
              SEE IF YOU QUALIFY
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Star Rating Widget */}
            <div className="flex flex-col items-center gap-2 mt-2">
              {/* Agent Avatars */}
              <div className="flex items-center">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                    <img src={agent1} alt="Agent" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                    <img src={agent2} alt="Agent" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                    <img src={agent3} alt="Agent" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                    <img src={agent4} alt="Agent" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  </div>
                </div>
              </div>
              
              {/* Stars - 4.9 stars */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-5 h-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    {star === 5 ? (
                      <defs>
                        <linearGradient id="partialStar">
                          <stop offset="90%" stopColor="currentColor" />
                          <stop offset="90%" stopColor="currentColor" stopOpacity="0.4" />
                        </linearGradient>
                      </defs>
                    ) : null}
                    <path 
                      fill={star === 5 ? "url(#partialStar)" : "currentColor"}
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" 
                    />
                  </svg>
                ))}
                <span className="text-sm font-semibold text-foreground ml-1">4.9</span>
              </div>
              
              {/* Text */}
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Used by 520+ agents</span> across the U.S.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;