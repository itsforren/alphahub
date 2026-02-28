import { motion } from "framer-motion";
import { FileText, Phone, Users, UserPlus, DollarSign } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Apply below",
    description: "Short qualification form",
  },
  {
    icon: Phone,
    title: "Book a Partner Strategy Call",
    description: "Quick conversation to align goals",
  },
  {
    icon: Users,
    title: "We schedule your team workshop",
    description: "If approved, we set up your presentation",
  },
  {
    icon: UserPlus,
    title: "Agents onboard at their own pace",
    description: "No pressure, no quotas",
  },
  {
    icon: DollarSign,
    title: "You earn profit share + overrides",
    description: "Monthly recurring income",
  },
];

const PartnerNextSteps = () => {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Next Steps to Become a Partner
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A simple, straightforward process to get started.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/30 to-primary/10 hidden md:block" />
          
          <div className="space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-6 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                  <div className={`inline-flex items-center gap-4 p-5 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 transition-all duration-300 ${
                    index % 2 === 0 ? "md:flex-row-reverse" : "md:flex-row"
                  }`}>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className={index % 2 === 0 ? "md:text-right" : "md:text-left"}>
                      <h3 className="font-bold text-lg">{step.title}</h3>
                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    </div>
                  </div>
                </div>
                
                {/* Step number indicator */}
                <div className="hidden md:flex w-10 h-10 rounded-full bg-primary text-primary-foreground items-center justify-center font-bold text-sm flex-shrink-0 z-10">
                  {index + 1}
                </div>
                
                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerNextSteps;
