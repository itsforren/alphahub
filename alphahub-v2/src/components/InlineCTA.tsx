import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InlineCTAProps {
  headline?: string;
  subtext?: string;
  variant?: "primary" | "secondary";
}

const InlineCTA = ({ 
  headline = "Ready to Make the Switch?",
  subtext = "Join 520+ agents who've escaped the lead vendor trap.",
  variant = "primary"
}: InlineCTAProps) => {
  const navigate = useNavigate();

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
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            onClick={() => navigate("/apply")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-10 py-5 bg-primary text-primary-foreground font-bold text-lg rounded-xl shadow-[0_0_60px_rgba(0,214,50,0.4)] hover:shadow-[0_0_80px_rgba(0,214,50,0.6)] transition-all duration-300"
          >
            CLAIM YOUR TERRITORY
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          
        </div>
      </div>
    </motion.div>
  );
};

export default InlineCTA;
