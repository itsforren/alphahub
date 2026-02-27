import { motion } from "framer-motion";
import { Users, TrendingUp, DollarSign, ArrowRight } from "lucide-react";

const benefits = [
  {
    icon: DollarSign,
    title: "10% Recurring Referral",
    description: "Earn 10% of monthly fees for every agent you bring into the system",
  },
  {
    icon: TrendingUp,
    title: "Override Growth",
    description: "Your override grows as your downline submits more premium",
  },
  {
    icon: Users,
    title: "Team Scaling",
    description: "Plug your entire team into a proven system without building from scratch",
  },
];

const AgencyOwnerPathway = () => {
  const scrollToFinalCTA = () => {
    document.querySelector('section:last-of-type')?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="section-padding bg-gradient-dark relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,214,50,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,214,50,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container-custom relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">AGENCY OWNERS</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
              Have a Downline?
              <br />
              <span className="glow-text">Earn Recurring Income</span>
              <br />
              While Scaling Their AP.
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Partner with us and give your team access to a system that actually converts. 
              Earn 10% of every agent's monthly fee — plus watch your override grow as their 
              submitted premium increases.
            </p>

            <motion.button
              onClick={scrollToFinalCTA}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-8 py-4 bg-secondary border border-border text-foreground font-bold rounded-xl hover:border-primary/50 hover:bg-secondary/80 transition-all duration-300"
            >
              LEARN ABOUT PARTNERSHIPS
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>

          {/* Benefits Cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card-hover p-6 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 group-hover:shadow-glow-sm transition-all duration-300">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Stats highlight */}
            <div className="glass-card p-6 border-primary/30 bg-primary/5">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <p className="text-3xl font-black glow-text">10%</p>
                  <p className="text-sm text-muted-foreground">Recurring Commission</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-foreground">∞</p>
                  <p className="text-sm text-muted-foreground">Override Growth</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Section divider */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
};

export default AgencyOwnerPathway;
