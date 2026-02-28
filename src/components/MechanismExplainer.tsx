import { motion } from "framer-motion";
import { Megaphone, Filter, LayoutTemplate, FileCheck, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Megaphone,
    title: "Traffic",
    description: "Private Google Ads campaign drives high-intent prospects searching for IUL",
    detail: "Your exclusive campaign, not shared",
  },
  {
    icon: Filter,
    title: "Filtering",
    description: "Pre-qualification questions filter out tire kickers before they reach you",
    detail: "Assets, income, health screening",
  },
  {
    icon: LayoutTemplate,
    title: "Funnel",
    description: "Your branded funnel builds trust and positions you as the expert",
    detail: "Your face, your calendar, your brand",
  },
  {
    icon: FileCheck,
    title: "Submission",
    description: "Qualified prospects land on your calendar ready to submit applications",
    detail: "Pre-sold and ready to sign",
  },
];

const MechanismExplainer = () => {
  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <span className="text-sm font-bold text-primary">THE MECHANISM</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            Why This System Works
            <br />
            <span className="glow-text">When Lead Vendors Fail</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            A 4-step process designed around one metric: cost per submitted application.
          </p>
        </motion.div>

        {/* Process Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20 -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                className="relative z-10"
              >
                <div className="glass-card-hover p-6 h-full flex flex-col">
                  {/* Step number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-glow-sm">
                    {index + 1}
                  </div>
                  
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-center mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm text-center leading-relaxed mb-3 flex-grow">
                    {step.description}
                  </p>
                  
                  {/* Detail badge */}
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {step.detail}
                    </span>
                  </div>
                </div>
                
                {/* Arrow connector for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-4 glass-card border-primary/30">
            <span className="text-muted-foreground">Result:</span>
            <span className="text-xl font-black glow-text">76% Lower Cost Per Application</span>
            <span className="text-muted-foreground">on average</span>
          </div>
        </motion.div>
      </div>
      
      {/* Section divider */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
};

export default MechanismExplainer;
