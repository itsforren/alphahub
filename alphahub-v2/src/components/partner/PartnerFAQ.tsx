import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How does the 10% profit share work?",
    answer: "You earn 10% of the lifetime profit on the management fee for every agent you refer who plugs into the system. This is calculated monthly and paid automatically. As long as they stay active, you get paid — no caps, no limits.",
  },
  {
    question: "What's the onboarding timeline for my team?",
    answer: "After approval, we schedule a 20-30 minute workshop with your team. Agents who want to join can onboard within 24-48 hours. Most agents are fully set up and running campaigns within a week.",
  },
  {
    question: "Is there a minimum team size requirement?",
    answer: "We work best with teams of 5+ agents, but we evaluate each partnership individually. If you have a smaller team with high production potential, we're open to discussing options.",
  },
  {
    question: "Do I need to switch IMOs or carriers?",
    answer: "Absolutely not. Alpha Agent is infrastructure, not an IMO. Your agents keep their existing contracts, carriers, and upline structure. We simply provide the lead generation and client acquisition system.",
  },
  {
    question: "What if my agents don't like the system?",
    answer: "There's no long-term commitment. Agents can cancel their subscription at any time. But with an average cost per application that beats shared leads by 40-60%, most agents don't want to go back.",
  },
  {
    question: "Do I have to sell anything to my team?",
    answer: "No selling required. We run the workshop, explain the system, and answer questions. Agents decide on their own. You simply open the door and introduce us — we handle everything else.",
  },
  {
    question: "How do carrier overrides increase?",
    answer: "When your team submits higher-quality business with better target premiums, carriers reward you with better override rates. Our system filters for qualified prospects, which naturally improves the quality of submitted applications.",
  },
  {
    question: "What support do my agents get?",
    answer: "Every agent gets a 1-on-1 setup call, submission training, access to our CRM and dashboard, and ongoing campaign optimizations. We're invested in their success because that's how everyone wins.",
  },
];

const PartnerFAQ = () => {
  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Background effects */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">PARTNER FAQ</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Common <span className="glow-text">Questions</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about becoming an Alpha Agent partner.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-card px-6 border-border/50"
              >
                <AccordionTrigger className="text-left font-semibold hover:text-primary transition-colors py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>

      {/* Section divider */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
};

export default PartnerFAQ;
