import { motion } from "framer-motion";
import { CheckCircle, Volume2, VolumeX, Calendar, Mail, MessageSquare, ArrowRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { Navbar } from "@/components/Navbar";

const CallConfirmed = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const VIDEO_URL = "https://vz-72d7dfc8-b4d.b-cdn.net/0ef3fa2d-225e-4c7e-83ce-614577d4b10e/playlist.m3u8";

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-24 md:pt-28 pb-16 px-4 md:px-8 bg-gradient-radial relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

        <div className="container-custom relative z-10 max-w-4xl mx-auto">
          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 border border-primary/40 mb-6">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-4">
              Your Call is <span className="text-primary">Booked!</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Make sure you confirm your call and show up on time.
            </p>
          </motion.div>

          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative mb-8"
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

              {/* Mute button when playing with sound */}
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

          {/* Confirm Your Call Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="glass-card p-6 border-destructive/50 bg-destructive/10 mb-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🚨</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-destructive mb-3">CONFIRM YOUR CALL OR WE WILL CANCEL</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-destructive">1</span>
                    </div>
                    <p className="text-foreground font-medium">
                      Click <span className="font-black text-destructive">"Confirmed"</span> on the calendar invite
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-destructive">2</span>
                    </div>
                    <p className="text-foreground font-medium">
                      Reply <span className="font-black text-destructive">"CONFIRM"</span> to the text message
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Important Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="glass-card p-6 border-alert/30 bg-alert/5 mb-8"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-alert/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-alert mb-2">Important: No Reschedules</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Due to high call volume, <span className="text-foreground font-semibold">we do not offer reschedules.</span> Please make sure you can attend your scheduled time. If you cannot make it, you may not be able to book another call. We receive hundreds of applications — this is your opportunity to secure your territory.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Confirmation Checklist */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="glass-card p-6 mb-8"
          >
            <h3 className="text-lg font-bold mb-4">Before Your Call:</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Add us to your contacts</p>
                  <p className="text-sm text-muted-foreground">Check your email for the calendar invite</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Set a reminder</p>
                  <p className="text-sm text-muted-foreground">Add a 15-minute reminder before your call</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Prepare your questions</p>
                  <p className="text-sm text-muted-foreground">Think about your territory and goals</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="text-center"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/80 transition-all duration-300"
            >
              Back to Homepage
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default CallConfirmed;
