import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import PartnerApplicationForm from "./PartnerApplicationForm";

const PartnerHeroSection = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <section className="min-h-[80vh] flex items-center justify-center pt-24 md:pt-28 pb-8 px-4 md:px-8 bg-gradient-radial relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-5xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">FOR AGENCY OWNERS & TEAM LEADERS</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black leading-[1.1] mb-6"
          >
            Turn Your Downline Into a{" "}
            <br className="hidden md:block" />
            <span className="glow-text">Scalable Override Engine.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed"
          >
            We join your team call, show your agents how to lower their cost per application, 
            and you get paid on every agent who plugs into the system —{" "}
            <span className="text-foreground font-semibold">with zero risk to you.</span>
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex flex-col items-center gap-4"
          >
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-primary text-primary-foreground font-bold text-lg rounded-xl shadow-[0_0_60px_rgba(0,214,50,0.4)] hover:shadow-[0_0_80px_rgba(0,214,50,0.6)] transition-all duration-300 w-full sm:w-auto group animate-[pulse_3s_ease-in-out_infinite]"
            >
              APPLY TO PARTNER WITH ALPHA AGENT
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-sm text-muted-foreground">
              No upfront costs. No obligations. We only win when your agents win.
            </p>
          </motion.div>
        </motion.div>
      </div>

      <PartnerApplicationForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
      />
    </section>
  );
};

export default PartnerHeroSection;
