import { motion } from "framer-motion";
import { TrendingUp, Users, Heart, Quote } from "lucide-react";

const proofPoints = [
  {
    icon: TrendingUp,
    stat: "Higher Target Premium",
    description: "Agents using this system are submitting higher target premium with fewer conversations.",
  },
  {
    icon: Heart,
    stat: "Improved Retention",
    description: "Agency leaders report improved retention and morale when agents stop gambling on leads.",
  },
  {
    icon: Users,
    stat: "520+ Active Agents",
    description: "Join the growing network of producers and teams already using the system.",
  },
];

const PartnerSocialProof = () => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Results That Speak for Themselves
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Real outcomes from agency leaders who partnered with Alpha Agent.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {proofPoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/30 transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <point.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-primary">{point.stat}</h3>
              <p className="text-muted-foreground">{point.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto p-8 rounded-2xl bg-muted/30 border border-border/50 relative"
        >
          <Quote className="absolute top-4 left-4 w-8 h-8 text-primary/20" />
          <p className="text-lg md:text-xl text-center italic text-foreground/90 leading-relaxed px-8">
            "My agents finally have infrastructure that makes sense. They're not fighting over the same recycled leads — they're building real books of business."
          </p>
          <p className="text-center mt-4 text-muted-foreground">
            — Agency Owner, 15+ Agents
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PartnerSocialProof;
