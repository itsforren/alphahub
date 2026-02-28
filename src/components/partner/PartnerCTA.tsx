import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield } from "lucide-react";
import PartnerApplicationForm from "./PartnerApplicationForm";

const PartnerCTA = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-background to-background" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            {/* Shield icon */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8"
            >
              <Shield className="w-10 h-10 text-primary" />
            </motion.div>

            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
              Ready to Create a New
              <br />
              <span className="glow-text">Revenue Stream?</span>
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              This partnership is selective. We only work with agency leaders who want to 
              elevate their team's production — not churn agents through lead vendors.
            </p>

            <motion.button
              onClick={() => setIsFormOpen(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-3 px-12 py-6 bg-primary text-primary-foreground font-bold text-xl rounded-xl shadow-[0_0_80px_rgba(0,214,50,0.5)] hover:shadow-[0_0_100px_rgba(0,214,50,0.7)] transition-all duration-300 group"
            >
              APPLY TO BECOME AN ALPHA PARTNER
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <p className="mt-6 text-sm text-muted-foreground">
              No upfront costs • No risk • 10% lifetime profit share
            </p>
          </motion.div>
        </div>
      </section>

      <PartnerApplicationForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
      />
    </>
  );
};

export default PartnerCTA;
