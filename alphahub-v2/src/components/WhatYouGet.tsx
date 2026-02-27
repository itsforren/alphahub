import { motion } from "framer-motion";
import { 
  Search, 
  Globe, 
  Database, 
  Filter, 
  Calendar, 
  GraduationCap, 
  Phone, 
  BarChart3, 
  Settings 
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Private Google Ads Campaign",
    description: "Your own campaign backed by $2M+ in optimized ad data",
  },
  {
    icon: Globe,
    title: "Private Funnel",
    description: "Your brand, your face, your calendar — prospects think they found YOU",
  },
  {
    icon: Database,
    title: "Integrated CRM",
    description: "Track every lead, follow-up, and conversion in one dashboard",
  },
  {
    icon: Filter,
    title: "Lead Filtering System",
    description: "Pre-qualify by assets, income, and health before they hit your calendar",
  },
  {
    icon: Calendar,
    title: "Calendar & Booking Automation",
    description: "Automated scheduling that syncs with your availability",
  },
  {
    icon: GraduationCap,
    title: "Submission Training",
    description: "Learn our proven process to maximize app submissions",
  },
  {
    icon: Phone,
    title: "1-on-1 Setup Call",
    description: "Personal onboarding to customize your system",
  },
  {
    icon: BarChart3,
    title: "Performance Dashboard",
    description: "Real-time metrics on leads, apps, and ROI",
  },
  {
    icon: Settings,
    title: "Ongoing Optimizations",
    description: "We continuously improve your campaigns for better results",
  },
];

interface WhatYouGetProps {
  title?: string;
  hideHeader?: boolean;
}

const WhatYouGet = ({ title = "What You Get", hideHeader = false }: WhatYouGetProps) => {
  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Background effects */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />

      <div className="container-custom relative z-10">
        {!hideHeader && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <span className="text-sm font-bold text-primary">EVERYTHING INCLUDED</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              {title.split(" ").slice(0, -1).join(" ")} <span className="glow-text">{title.split(" ").slice(-1)}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              A complete client acquisition system — not just leads.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
              className="glass-card-hover p-6 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:shadow-glow-sm transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Section divider */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
};

export default WhatYouGet;
