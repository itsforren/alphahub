import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import PartnerApplicationForm from "./PartnerApplicationForm";

interface PartnerInlineCTAProps {
  headline?: string;
  subtext?: string;
}

const PartnerInlineCTA = ({ 
  headline = "Zero Risk. Maximum Upside.",
  subtext = "Your team gets infrastructure. You get recurring income."
}: PartnerInlineCTAProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="py-16 px-4 relative"
    >
      {/* Subtle section dividers */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      
      <div className="max-w-3xl mx-auto text-center">
        <h3 className="text-2xl md:text-3xl font-black mb-4 leading-tight">
          {headline}
        </h3>
        <p className="text-muted-foreground mb-8 text-lg leading-relaxed">{subtext}</p>
        
        <motion.button
          onClick={() => setIsFormOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-10 py-5 bg-primary text-primary-foreground font-bold text-lg rounded-xl shadow-[0_0_60px_rgba(0,214,50,0.4)] hover:shadow-[0_0_80px_rgba(0,214,50,0.6)] transition-all duration-300"
        >
          APPLY TO PARTNER
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>

      <PartnerApplicationForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
      />
    </motion.div>
  );
};

export default PartnerInlineCTA;
