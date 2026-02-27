import { motion } from "framer-motion";
import { CheckCircle2, Clock, Phone, ArrowRight, Loader2, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getVisitorId } from "@/lib/tracking";

const ScheduleOnboarding = () => {
  const [searchParams] = useSearchParams();
  const [calendarLoaded, setCalendarLoaded] = useState(false);

  // Get all params from URL
  const prospectId = searchParams.get('prospect_id') || '';
  const urlVisitorId = searchParams.get('visitor_id') || '';
  const firstName = searchParams.get('first_name') || '';
  const lastName = searchParams.get('last_name') || '';
  const phone = searchParams.get('phone') || '';
  const email = searchParams.get('email') || '';
  const referralCode = searchParams.get('referral_code') || '';

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

  const buildCalendarUrl = () => {
    const baseUrl = "https://url.alphaagent.io/widget/booking/6BoC3GIPKgOKzZKGy6Jl";
    
    const params = new URLSearchParams();
    
    // Pass prospect_id for linking
    if (prospectId) {
      params.set("prospect_id", prospectId);
      console.log("[Onboarding Calendar] Passing prospect_id:", prospectId);
    }
    
    // Pass visitor_id for attribution
    const visitorId = urlVisitorId || getVisitorId();
    if (visitorId) {
      params.set("visitor_id", visitorId);
      console.log("[Onboarding Calendar] Passing visitor_id:", visitorId);
    }
    
    // Pass prospect data for calendar autofill
    if (firstName) {
      params.set("first_name", firstName);
      console.log("[Onboarding Calendar] Passing first_name:", firstName);
    }
    if (lastName) {
      params.set("last_name", lastName);
      console.log("[Onboarding Calendar] Passing last_name:", lastName);
    }
    if (phone) {
      params.set("phone", phone);
      console.log("[Onboarding Calendar] Passing phone:", phone);
    }
    if (email) {
      params.set("email", email);
      console.log("[Onboarding Calendar] Passing email:", email);
    }
    if (referralCode) {
      params.set("referral_code", referralCode);
      console.log("[Onboarding Calendar] Passing referral_code:", referralCode);
    }
    
    const finalUrl = `${baseUrl}?${params.toString()}`;
    console.log("[Onboarding Calendar] Built URL:", finalUrl);
    
    return finalUrl;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

      <div className="container-custom relative z-10 py-6 md:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-3xl mx-auto mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"
          >
            <Calendar className="w-6 h-6 text-primary" />
          </motion.div>

          <h1 className="text-2xl md:text-3xl font-black mb-1">
            Schedule Your <span className="glow-text">Onboarding Call</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Let's get you set up and running. Pick a time that works best for you.
          </p>
        </motion.div>

        {/* Calendar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto mb-6"
        >
          <div className="glass-card p-3 md:p-5">
            <div className="relative rounded-xl overflow-hidden min-h-[650px]">
              {!calendarLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/50 z-10">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-muted-foreground text-sm">Loading calendar...</p>
                </div>
              )}
              <iframe
                src={buildCalendarUrl()}
                style={{ width: "100%", border: "none", overflow: "hidden", minHeight: "650px" }}
                scrolling="no"
                id="onboarding-calendar-embed"
                onLoad={() => setCalendarLoaded(true)}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>30-45 min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>Video Call</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                <span>Full System Setup</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* What Happens Next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <h3 className="text-center text-sm font-bold mb-3 text-muted-foreground">What Happens During Onboarding</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { step: "1", title: "Account Review" },
              { step: "2", title: "Platform Setup" },
              { step: "3", title: "Campaign Config" },
              { step: "4", title: "Go Live!" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border">
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-xs font-bold text-primary">
                  {item.step}
                </div>
                <span className="text-sm font-medium">{item.title}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ScheduleOnboarding;
