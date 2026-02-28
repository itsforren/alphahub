import { motion } from "framer-motion";
import { Users, TrendingUp, AlertCircle, DollarSign } from "lucide-react";

const criteria = [
  {
    icon: Users,
    text: "Have agents struggling with shared leads, vendor churn, or inconsistent production",
  },
  {
    icon: TrendingUp,
    text: "Want cleaner business, higher target premium, and stronger carrier overrides",
  },
  {
    icon: AlertCircle,
    text: "Are tired of pushing tools that don't actually help their downline write policies",
  },
  {
    icon: DollarSign,
    text: "Want a simple way to monetize their influence without selling anything",
  },
];

const WhoThisIsFor = () => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            This Is For Agency Owners Who:
          </h2>
        </motion.div>

        <div className="grid gap-4 md:gap-6">
          {criteria.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 p-5 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-lg text-foreground/90 leading-relaxed pt-2">
                {item.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoThisIsFor;
