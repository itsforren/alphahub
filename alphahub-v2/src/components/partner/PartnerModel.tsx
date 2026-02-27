import { motion } from "framer-motion";
import { Users, Rocket, Wallet, CheckCircle } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Users,
    title: "You invite us onto your team call",
    bullets: [
      "We run a short, high-impact workshop (20–30 minutes)",
      "We educate agents on cost per application, not cost per lead",
    ],
  },
  {
    number: "02",
    icon: Rocket,
    title: "Your agents choose to plug into the system",
    bullets: [
      "Private Google Ads campaign",
      "Private funnel with their face, name, and calendar",
      "Full CRM, tracking, and application-focused optimization",
    ],
  },
  {
    number: "03",
    icon: Wallet,
    title: "You get paid automatically",
    bullets: [
      "10% lifetime profit share on the management fee of every agent you refer",
      "Increased carrier overrides as your team submits higher-quality business",
      "No billing, no fulfillment, no support required from you",
    ],
  },
];

const PartnerModel = () => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            How the Alpha Agent Partner Model Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Three simple steps to create a new revenue stream for your agency.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative p-6 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/40 transition-all duration-300 group"
            >
              {/* Step number */}
              <div className="absolute -top-4 -left-2 text-6xl font-black text-primary/10 group-hover:text-primary/20 transition-colors">
                {step.number}
              </div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                
                <h3 className="text-xl font-bold mb-4 leading-tight">
                  {step.title}
                </h3>
                
                <ul className="space-y-2">
                  {step.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-muted-foreground text-sm">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Callout Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto p-8 rounded-2xl bg-primary/5 border-2 border-primary/30 text-center"
        >
          <p className="text-xl md:text-2xl font-bold leading-relaxed">
            <span className="text-primary">You take zero risk.</span>
            <br />
            You don't sell anything.
            <br />
            <span className="text-muted-foreground font-normal">You simply open the door — we handle everything else.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PartnerModel;
