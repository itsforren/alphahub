import { motion } from "framer-motion";
import { TrendingUp, Users, CheckCircle, Star } from "lucide-react";

const badges = [
  {
    icon: TrendingUp,
    text: "Over $2M in Ad Spend Optimized",
  },
  {
    icon: Users,
    text: "520+ Agents Served",
  },
  {
    icon: CheckCircle,
    text: "5+ Years in Business",
  },
  {
    icon: Star,
    text: "4.9★ Client Rating",
  },
];

const CredibilityStrip = () => {
  return (
    <section className="py-8 px-4 bg-card/50 border-y border-border/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-4 md:gap-8"
        >
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (index + 1) * 0.1 }}
              className="flex items-center gap-3 px-4 py-2 rounded-full bg-background/50 border border-border/50"
            >
              <badge.icon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                {badge.text}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default CredibilityStrip;
