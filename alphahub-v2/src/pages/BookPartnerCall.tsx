import { motion } from "framer-motion";
import { Clock, Video, ArrowRight, Loader2, FileText, Users, UserPlus, DollarSign, Handshake, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import LiveNotifications from "@/components/LiveNotifications";

const steps = [
  {
    icon: FileText,
    title: "Apply",
    description: "Short qualification form",
    completed: true,
  },
  {
    icon: Video,
    title: "Schedule Strategy Call",
    description: "Video Zoom call to align goals",
    completed: false,
  },
  {
    icon: Users,
    title: "Team Workshop Scheduled",
    description: "If approved, we set up your presentation",
    completed: false,
  },
  {
    icon: UserPlus,
    title: "Agents Onboard",
    description: "Your team joins at their own pace",
    completed: false,
  },
  {
    icon: DollarSign,
    title: "Earn Profit Share",
    description: "Monthly recurring income + overrides",
    completed: false,
  },
];

const BookPartnerCall = () => {
  const [calendarLoaded, setCalendarLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://url.alphaagent.io/js/form_embed.js";
    script.type = "text/javascript";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

      {/* Shared Live Notifications */}
      <LiveNotifications />

      <div className="container-custom relative z-10 py-10 md:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-3xl mx-auto mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"
          >
            <Handshake className="w-8 h-8 text-primary" />
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-black mb-3">
            Schedule Your <span className="glow-text">Partner Strategy Call</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Let's see if we're a good fit. Book a quick call to discuss how the partner program can work for your agency.
          </p>
        </motion.div>

        {/* Process Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mb-10"
        >
          <h3 className="text-center text-sm font-bold mb-4 text-muted-foreground uppercase tracking-wider">
            The Partner Process
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className={`relative flex flex-col items-center text-center p-4 rounded-xl border transition-colors ${
                  step.completed 
                    ? 'bg-primary/10 border-primary/50' 
                    : 'bg-secondary/30 border-border hover:border-primary/30'
                }`}
              >
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  step.completed 
                    ? 'bg-green-500 text-white' 
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {step.completed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 mt-2 ${
                  step.completed ? 'bg-green-500/20' : 'bg-primary/10'
                }`}>
                  <step.icon className={`w-5 h-5 ${step.completed ? 'text-green-500' : 'text-primary'}`} />
                </div>
                <h4 className="font-bold text-sm mb-1">{step.title}</h4>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Calendar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <div className="glass-card p-4 md:p-6">
            <div className="relative rounded-xl overflow-hidden min-h-[650px]">
              {!calendarLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/50 z-10">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-muted-foreground text-sm">Loading calendar...</p>
                </div>
              )}
              <iframe
                src="https://url.alphaagent.io/widget/booking/XDEgBx07U6LQeYGd1582"
                style={{ width: "100%", border: "none", overflow: "hidden", minHeight: "650px" }}
                scrolling="no"
                id="partner-booking-calendar"
                onLoad={() => setCalendarLoaded(true)}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>20-30 min</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-primary" />
                <span>Video Zoom Call</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <span>Custom partnership plan</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* What to Expect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <h3 className="text-lg font-bold mb-4">What We'll Discuss</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <p className="font-semibold text-sm">Your Agency</p>
              <p className="text-xs text-muted-foreground mt-1">Team size, current production, and growth goals</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <p className="font-semibold text-sm">Partnership Fit</p>
              <p className="text-xs text-muted-foreground mt-1">How our system integrates with your operation</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <p className="font-semibold text-sm">Revenue Model</p>
              <p className="text-xs text-muted-foreground mt-1">Profit share structure and earning potential</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BookPartnerCall;