import { motion } from "framer-motion";
import { Skull, Rocket } from "lucide-react";

const DetailedComparison = () => {
  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-alert/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="container-custom relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-alert/10 border border-alert/30 mb-6">
            <span className="text-sm font-black text-alert tracking-wider">⚔️ THE FINAL CUT</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            Choose Your <span className="glow-text">Path</span>
          </h2>
        </motion.div>

        {/* Two Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Vendor Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass-card p-10 border-alert/30 hover:border-alert/50 transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-alert/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-alert/10 flex items-center justify-center border border-alert/30 mb-8">
                  <Skull className="w-8 h-8 text-alert" />
                </div>
                <p className="text-xl md:text-2xl text-foreground/90 leading-relaxed font-medium mb-4">
                  Lead vendors profit from your <span className="text-alert font-black">chaos</span>.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  They get richer when you <span className="text-alert font-bold">fail fast</span>.
                </p>
              </div>
            </motion.div>

            {/* Alpha Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="glass-card-hover p-10 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 shadow-glow-sm mb-8">
                  <Rocket className="w-8 h-8 text-primary" />
                </div>
                <p className="text-xl md:text-2xl text-foreground leading-relaxed font-medium mb-4">
                  Alpha Agent profits from your <span className="glow-text font-black">growth</span>.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We get richer when you <span className="text-primary font-bold">succeed longer</span>.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Subtext */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16"
          >
            <p className="text-xl md:text-2xl font-bold text-foreground">
              Pick the model that <span className="glow-text">builds your career</span>,
              <br className="hidden sm:block" /> not <span className="text-alert">bleeds it</span>.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default DetailedComparison;
