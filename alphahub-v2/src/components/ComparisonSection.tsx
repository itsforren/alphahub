import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const comparisonRows = [
  {
    category: "Incentive Alignment",
    vendor: "Vendors profit when you buy more leads. You're gambling your money with hopes they give you legit or exclusive leads.",
    alpha: "We win when your submitted applications increase.",
  },
  {
    category: "Lead Intent",
    vendor: "Cheap, shared, low-intent traffic with high competition. It's a slot machine — you never know what you're gonna get.",
    alpha: "Private, filtered, high-intent traffic engineered for submissions.",
  },
  {
    category: "Payment Model",
    vendor: "Pay for volume, not results. 100% risk on you.",
    alpha: "Predictable system fee. You own the funnel, filters, and results.",
  },
  {
    category: "Workload & Burnout",
    vendor: "100 trash leads → 100 wasted dials → burnout.",
    alpha: "20–40 submission-ready prospects → more Commissions",
  },
  {
    category: "Long-Term Outcomes",
    vendor: "Churn & replace. No loyalty. No strategy.",
    alpha: "Long-term partnership, ongoing optimization, and TP scaling.",
  },
];

const ComparisonSection = () => {
  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Background effects */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-card/50 to-transparent" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
            Lead Vendors <span className="text-alert">VS</span>{" "}
            <span className="glow-text">Alpha Agent</span> Private Client System
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            The unfiltered comparison every agent should see before spending another dollar.
          </p>
        </motion.div>

        {/* Two Column Headers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto mb-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-alert/10 flex items-center justify-center border border-alert/30">
              <X className="w-7 h-7 text-alert" />
            </div>
            <div>
              <h3 className="text-xl font-black text-alert">Lead Vendors</h3>
              <p className="text-sm text-muted-foreground">Like a slot machine — you never know what you're gonna get.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 shadow-glow-sm">
              <Check className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black glow-text">Alpha Agent System</h3>
              <p className="text-sm text-muted-foreground">Built to scale YOU — not squeeze you.</p>
            </div>
          </motion.div>
        </div>

        {/* Comparison Rows */}
        <div className="space-y-8 max-w-6xl mx-auto">
          {comparisonRows.map((row, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12"
            >
              {/* Category Label - Mobile */}
              <div className="lg:hidden text-center mb-2">
                <span className="inline-block px-4 py-1.5 rounded-full bg-foreground/5 border border-foreground/10 text-sm font-bold text-foreground">
                  {row.category}
                </span>
              </div>

              {/* Vendor Side */}
              <div className="glass-card p-8 border-alert/20 hover:border-alert/40 transition-all duration-300 relative">
                {/* Category Label - Desktop */}
                <div className="hidden lg:block absolute -top-4 left-6">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-background border border-alert/30 text-sm font-bold text-alert">
                    {row.category}
                  </span>
                </div>
                <div className="flex items-start gap-4 pt-2 lg:pt-4">
                  <div className="w-8 h-8 rounded-full bg-alert/20 flex items-center justify-center flex-shrink-0">
                    <X className="w-4 h-4 text-alert" />
                  </div>
                  <p className="text-foreground/90 text-lg leading-relaxed font-medium">{row.vendor}</p>
                </div>
              </div>

              {/* Alpha Side */}
              <div className="glass-card-hover p-8 relative">
                {/* Category Label - Desktop */}
                <div className="hidden lg:block absolute -top-4 left-6">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-background border border-primary/30 text-sm font-bold text-primary">
                    {row.category}
                  </span>
                </div>
                <div className="flex items-start gap-4 pt-2 lg:pt-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-foreground text-lg leading-relaxed font-medium">{row.alpha}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
