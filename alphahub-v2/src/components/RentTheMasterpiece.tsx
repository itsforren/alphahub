import { motion } from "framer-motion";
import { Search, User, Filter, DollarSign } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Private Google Ads",
    description: "Not shared. Your campaigns, backed by $2M+ in proven ad data. We manage, you profit.",
  },
  {
    icon: User,
    title: "Branded Funnel",
    description: "Your face. Your calendar. Your brand. Prospects think they found YOU, not a vendor.",
  },
  {
    icon: Filter,
    title: "The Alpha Filter",
    description: "Pre-qualify by assets & income before they hit your calendar. No tire kickers.",
  },
  {
    icon: DollarSign,
    title: "Flat Monthly Fee",
    description: "No per-lead markups. No surprises. One predictable investment, unlimited upside.",
  },
];

const RentTheMasterpiece = () => {
  return (
    <section className="section-padding bg-gradient-dark relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            Don't Build From Scratch.
            <br />
            <span className="glow-text">Rent The Masterpiece.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Why spend months and thousands building your own system when you can plug into one
            that's already generating results for 520+ agents?
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index, duration: 0.6 }}
              className="glass-card-hover p-8 group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:shadow-glow-sm transition-all duration-300">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Visual accent */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">Built by a licensed agent</span>
            </span>
            <span className="w-px h-4 bg-border" />
            <span className="text-sm text-muted-foreground">For licensed agents</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default RentTheMasterpiece;
