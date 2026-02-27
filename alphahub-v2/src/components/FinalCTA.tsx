import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FinalCTA = () => {
  const navigate = useNavigate();

  return (
    <section id="final-cta" className="pt-32 pb-20 md:pt-40 md:pb-32 px-4 md:px-8 bg-background relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/15 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-2xl" />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg mb-8 leading-relaxed"
          >
            This system took over <span className="text-primary font-bold">5 years</span> and{" "}
            <span className="text-primary font-bold">$2M+ in data</span> to perfect.
          </motion.p>

          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Step Into Your
            <br />
            <span className="glow-text">Alpha Version.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Territories are limited due to Google Ad exclusivity.
            <br />
            Lock in your market before another agent does.
          </p>

          {/* Primary CTA */}
          <motion.button
            onClick={() => navigate("/apply")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group inline-flex items-center gap-3 px-12 py-6 bg-primary text-primary-foreground font-bold text-lg rounded-xl shadow-[0_0_60px_rgba(0,214,50,0.4)] hover:shadow-[0_0_80px_rgba(0,214,50,0.6)] transition-all duration-300 animate-glow-pulse"
          >
            CLAIM YOUR TERRITORY
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>

          <p className="mt-8 text-sm text-muted-foreground">
            No commitment required • 24-hour response time
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
