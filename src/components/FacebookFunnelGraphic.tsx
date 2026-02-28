import { motion } from "framer-motion";
import { 
  ScrollText, 
  MousePointer, 
  Users, 
  AlertCircle, 
  RefreshCw,
  X,
  Check,
  Eye,
  FileText,
  Phone,
  Calendar,
  Shield,
  Target
} from "lucide-react";

const FacebookFunnelGraphic = () => {
  const vendorWeaknesses = [
    "No private funnel",
    "No private ad campaign",
    "No headshot",
    "No credibility",
    "No trust",
    "No exclusivity",
    "Leads are recycled",
    "You have no control"
  ];

  const alphaStrengths = [
    "You own the funnel experience",
    "Your headshot + NPN + badges",
    "Your private ad campaign",
    "No sharing",
    "Zero guessing",
    "High intent → booked calls"
  ];

  return (
    <section className="py-24 px-4 bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-background to-primary/5" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium mb-6">
            <AlertCircle className="w-4 h-4" />
            The Vendor Problem Exposed
          </span>
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            The Facebook Lead Vendor Funnel
          </h2>
          <p className="text-xl text-red-400 font-semibold">
            No Trust. No Exclusivity. No Control.
          </p>
        </motion.div>

        {/* Funnel Flow */}
        <div className="space-y-8">
          {/* Step 1: Lead Sources */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-900/60 rounded-2xl p-6 border border-zinc-800"
          >
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              Where These "Leads" Actually Come From
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Eye, label: "Scrolling Aimlessly", desc: "No intent, just killing time" },
                { icon: ScrollText, label: "Random Distractions", desc: "Memes, cat videos, drama" },
                { icon: Target, label: "Zero Search Intent", desc: "Not looking for IUL" }
              ].map((item, i) => (
                <div key={i} className="bg-zinc-950/60 rounded-lg p-4 border border-zinc-800">
                  <item.icon className="w-8 h-8 text-red-400 mb-2" />
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-muted-foreground text-center italic">
              "Facebook users scrolling aimlessly → not searching for IUL → not looking for life insurance."
            </p>
          </motion.div>

          {/* Flow Arrow */}
          <div className="flex justify-center">
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-red-500/60"
            />
          </div>

          {/* Step 2-4: The Vendor Funnel Process */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            {/* Facebook Ad */}
            <div className="bg-zinc-900/60 rounded-xl p-5 border border-red-900/40 relative">
              <div className="absolute -top-3 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                STEP 1
              </div>
              <MousePointer className="w-8 h-8 text-red-400 mb-3" />
              <h4 className="font-bold mb-2">Random Ad Appears</h4>
              <p className="text-sm text-red-300">
                "Low intent. Clicks out of curiosity, not desire."
              </p>
            </div>

            {/* Instant Form */}
            <div className="bg-zinc-900/60 rounded-xl p-5 border border-red-900/40 relative">
              <div className="absolute -top-3 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                STEP 2
              </div>
              <FileText className="w-8 h-8 text-red-400 mb-3" />
              <h4 className="font-bold mb-2">1-Click Instant Form</h4>
              <p className="text-sm text-red-300">
                "Auto-filled → Zero qualification"
              </p>
            </div>

            {/* Vendor System */}
            <div className="bg-zinc-900/60 rounded-xl p-5 border border-red-900/40 relative">
              <div className="absolute -top-3 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                STEP 3
              </div>
              <Users className="w-8 h-8 text-red-400 mb-3" />
              <h4 className="font-bold mb-2">Routed to Vendor</h4>
              <p className="text-sm text-red-300">
                "No exclusivity. You're one of many."
              </p>
            </div>

            {/* Generic Page */}
            <div className="bg-zinc-900/60 rounded-xl p-5 border border-red-900/40 relative">
              <div className="absolute -top-3 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                STEP 4
              </div>
              <Phone className="w-8 h-8 text-red-400 mb-3" />
              <h4 className="font-bold mb-2">Generic Thank You</h4>
              <p className="text-sm text-red-300">
                "No agent info. Call center will contact."
              </p>
            </div>
          </motion.div>

          {/* Retargeting Loop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-red-950/40 to-zinc-900/60 rounded-2xl p-6 border border-red-800/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-6 h-6 text-red-400 animate-spin" style={{ animationDuration: '3s' }} />
              <h3 className="text-lg font-bold text-red-400">The Endless Retargeting Loop</h3>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {["Agent A's Ad", "Agent B's Ad", "Vendor X Ad", "Agent C's Ad", "Vendor Y Ad", "Agent D's Ad"].map((ad, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                  className="bg-red-900/40 border border-red-700/40 rounded-lg px-3 py-2 text-sm text-red-300"
                >
                  {ad}
                </motion.div>
              ))}
            </div>
            <p className="text-center mt-4 text-muted-foreground italic">
              "Facebook retargets them forever with every other agent's ads → nonstop confusion."
            </p>
          </motion.div>

          {/* Final Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
          >
            {/* Red Box - Vendor */}
            <div className="bg-gradient-to-br from-red-950/60 to-zinc-900/60 rounded-2xl p-6 border-2 border-red-700/50">
              <h4 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Vendor Model Weaknesses
              </h4>
              <ul className="space-y-3">
                {vendorWeaknesses.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-red-300">
                    <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Green Box - Alpha */}
            <div className="bg-gradient-to-br from-primary/20 to-zinc-900/60 rounded-2xl p-6 border-2 border-primary/50">
              <h4 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Our Private System
              </h4>
              <ul className="space-y-3">
                {alphaStrengths.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-primary">
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-primary/20">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Calendar className="w-5 h-5" />
                  <span>High intent → Booked calls on YOUR calendar</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FacebookFunnelGraphic;
