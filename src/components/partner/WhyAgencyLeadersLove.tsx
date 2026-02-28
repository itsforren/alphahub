import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const notAsking = [
  "Switch IMOs",
  "Endorse a lead vendor",
  "Take control away from their agents",
];

const areGiving = [
  "Giving agents infrastructure that works",
  "Aligning incentives around real production",
  "Creating a new override stream that compounds monthly",
];

const WhyAgencyLeadersLove = () => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/10 via-background to-muted/10" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Why Agency Leaders Love This
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We've designed this partnership to be completely aligned with your interests.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* What We're NOT Asking */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-background/50 border border-destructive/20"
          >
            <h3 className="text-xl font-bold mb-6 text-destructive flex items-center gap-2">
              <X className="w-6 h-6" />
              What We're NOT Asking
            </h3>
            <ul className="space-y-4">
              {notAsking.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <X className="w-4 h-4 text-destructive" />
                  </div>
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* What We ARE Giving */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-background/50 border border-primary/30"
          >
            <h3 className="text-xl font-bold mb-6 text-primary flex items-center gap-2">
              <Check className="w-6 h-6" />
              What We ARE Giving
            </h3>
            <ul className="space-y-4">
              {areGiving.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhyAgencyLeadersLove;
