import { motion } from "framer-motion";
import { 
  Users, 
  Youtube, 
  UserCheck, 
  Search, 
  MousePointerClick,
  FileText,
  ClipboardList,
  User,
  Calendar,
  BadgeCheck,
  Shield,
  CheckCircle,
  ArrowRight,
  ArrowDown,
  Monitor,
  Award,
  X
} from "lucide-react";

const LeadJourneyInfographic = () => {
  const scrollToFinalCTA = () => {
    const element = document.querySelector('main > section:last-of-type');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-24 md:py-36 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            YOUR <span className="text-primary">PRIVATE CLIENT</span> PIPELINE
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See exactly how high-intent IUL prospects flow through your personalized acquisition system
          </p>
        </motion.div>

        {/* Journey Flow */}
        <div className="space-y-8">
          
          {/* Stage 1: Lead Sources */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
                <h3 className="text-xl font-bold">Lead Source Entry Points</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Users, label: "Referral", desc: "Friend or family member" },
                  { icon: Youtube, label: "YouTube Viewer", desc: "Learns about IUL, searches on Google" },
                  { icon: UserCheck, label: "Agent Follow-Up", desc: "Still interested after initial pitch" },
                  { icon: Search, label: "Self-Researcher", desc: "Already knows what they want" },
                ].map((source, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-primary/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-background/80 border border-border/50 rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                        <source.icon className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-semibold text-sm mb-1">{source.label}</p>
                      <p className="text-xs text-muted-foreground">{source.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Flow Arrow */}
            <div className="flex justify-center py-4">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-primary"
              >
                <ArrowDown className="w-8 h-8" />
              </motion.div>
            </div>
          </motion.div>

          {/* Stage 2: Google Search */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
                <h3 className="text-xl font-bold">Lead Begins Their Search...</h3>
              </div>
              
              <div className="max-w-2xl mx-auto">
                {/* Search Bar Mock */}
                <div className="bg-background border border-border rounded-full px-6 py-4 flex items-center gap-3 mb-6">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground italic">"how to get an IUL" | "best IUL policy" | "retirement tax-free strategy"</span>
                </div>
                
                {/* Search Results */}
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-primary/20 rounded-lg blur-lg" />
                    <div className="relative bg-background border-2 border-primary rounded-lg p-4 flex items-center gap-4">
                      <span className="text-xs font-bold text-primary bg-primary/20 px-2 py-1 rounded">AD</span>
                      <div className="flex-1">
                        <p className="font-semibold text-primary">Your Google Ad</p>
                        <p className="text-sm text-muted-foreground">Learn about tax-free retirement strategies...</p>
                      </div>
                      <MousePointerClick className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                  </motion.div>
                  
                  <div className="bg-muted/30 rounded-lg p-3 opacity-50">
                    <p className="text-sm text-muted-foreground">Other organic result...</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 opacity-30">
                    <p className="text-sm text-muted-foreground">Another result...</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Flow Arrow */}
            <div className="flex justify-center py-4">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                className="text-primary"
              >
                <ArrowDown className="w-8 h-8" />
              </motion.div>
            </div>
          </motion.div>

          {/* Stage 3: Private Funnel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
                <h3 className="text-xl font-bold">Prospect Lands on Your Private Funnel</h3>
              </div>
              
              <div className="max-w-lg mx-auto">
                {/* Landing Page Mock */}
                <div className="bg-background border border-border rounded-xl overflow-hidden shadow-2xl">
                  <div className="h-3 bg-muted flex items-center px-2 gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                  </div>
                  <div className="p-6">
                    {/* IUL Benefits Header */}
                    <h4 className="text-sm font-bold text-primary mb-3 text-center">The IUL Benefits</h4>
                    
                    {/* 401k vs IUL Comparison */}
                    <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="font-bold text-muted-foreground text-center mb-2">401k</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <X className="w-3 h-3 text-destructive" />
                            <span className="text-muted-foreground">Taxed at withdrawal</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <X className="w-3 h-3 text-destructive" />
                            <span className="text-muted-foreground">Market volatility</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <X className="w-3 h-3 text-destructive" />
                            <span className="text-muted-foreground">Limited access</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
                        <p className="font-bold text-primary text-center mb-2">IUL</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-primary" />
                            <span className="text-foreground">Tax-free growth</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-primary" />
                            <span className="text-foreground">Protected floor</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-primary" />
                            <span className="text-foreground">Flexible access</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-10 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-primary-foreground text-sm font-semibold">Get Started</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  <span className="text-primary font-semibold">Your funnel</span> — owned, customized, and branded for you
                </p>
              </div>
            </div>
            
            {/* Flow Arrow */}
            <div className="flex justify-center py-4">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                className="text-primary"
              >
                <ArrowDown className="w-8 h-8" />
              </motion.div>
            </div>
          </motion.div>

          {/* Stage 4: Survey */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">4</div>
                <h3 className="text-xl font-bold">Prospect Completes Qualification Survey</h3>
              </div>
              
              <div className="max-w-md mx-auto">
                <div className="bg-background border border-border rounded-xl p-6 space-y-4">
                  {[
                    { label: "Age", value: "35-50" },
                    { label: "Annual Income", value: "$75,000+" },
                    { label: "State", value: "California" },
                    { label: "Financial Goals", value: "Tax-free retirement" },
                    { label: "Health Status", value: "Good/Excellent" },
                  ].map((field, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm text-muted-foreground">{field.label}</span>
                      <span className="text-sm font-medium text-primary">{field.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Unqualified leads are <span className="text-destructive font-semibold">filtered out</span> before they reach you, and filters are in <span className="text-primary font-semibold">your full control</span> — you can filter on age, state, occupation, financial goal, annual income. It's by your design.
                </p>
              </div>
            </div>
            
            {/* Flow Arrow */}
            <div className="flex justify-center py-4">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }}
                className="text-primary"
              >
                <ArrowDown className="w-8 h-8" />
              </motion.div>
            </div>
          </motion.div>

          {/* Stage 5: Agent Page */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">5</div>
                <h3 className="text-xl font-bold">Prospect Routed to YOUR Branded Page</h3>
              </div>
              
              <p className="text-center text-muted-foreground mb-6">
                <span className="text-primary font-semibold">We build your landing page.</span> Not a call center. Not a shared lead pool. Your personal pipeline.
              </p>
              
              <div className="max-w-lg mx-auto">
                <div className="bg-background border border-primary/30 rounded-xl overflow-hidden shadow-2xl shadow-primary/10">
                  <div className="h-3 bg-muted flex items-center px-2 gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">Your Name Here</h4>
                        <p className="text-sm text-muted-foreground">Licensed Insurance Professional</p>
                        <p className="text-xs text-muted-foreground">NPN: #XXXXXXX</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3" /> NFIA Verified
                          </span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Licensed
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-sm">Book Your Consultation</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {["Mon", "Tue", "Wed"].map((day) => (
                          <div key={day} className="bg-background rounded p-2 text-center">
                            <p className="text-xs text-muted-foreground">{day}</p>
                            <p className="text-sm font-semibold">10:00 AM</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Flow Arrow */}
            <div className="flex justify-center py-4">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.8 }}
                className="text-primary"
              >
                <ArrowDown className="w-8 h-8" />
              </motion.div>
            </div>
          </motion.div>

          {/* Stage 6: Credibility */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="relative"
          >
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">6</div>
                <h3 className="text-xl font-bold">System Enhances Your Trust Automatically</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                {[
                  { icon: Award, label: "NFIA Member Page" },
                  { icon: BadgeCheck, label: "Verification Badges" },
                  { icon: Shield, label: "Trust Indicators" },
                  { icon: FileText, label: "States Licensed" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="bg-background border border-border/50 rounded-xl p-4 text-center hover:border-primary/50 transition-colors"
                  >
                    <item.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Flow Arrow */}
            <div className="flex justify-center py-4">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 1 }}
                className="text-primary"
              >
                <ArrowDown className="w-8 h-8" />
              </motion.div>
            </div>
          </motion.div>

          {/* Stage 7: Final Conversion */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-primary/10 via-card/50 to-primary/5 backdrop-blur-sm border border-primary/30 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">7</div>
                <h3 className="text-xl font-bold">Lead Books → You Connect → Commission Earned</h3>
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-4xl mx-auto">
                {[
                  { icon: Calendar, label: "Lead Books Call" },
                  { icon: Monitor, label: "CRM Notification" },
                  { icon: FileText, label: "Application Submitted" },
                  { icon: CheckCircle, label: "Commission Earned" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mb-2">
                        <step.icon className="w-7 h-7 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-center">{step.label}</p>
                    </motion.div>
                    {i < 3 && (
                      <ArrowRight className="w-6 h-6 text-primary hidden md:block" />
                    )}
                  </div>
                ))}
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1 }}
                className="mt-8 text-center"
              >
                <div className="inline-block">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
                    <p className="relative text-lg md:text-xl font-bold text-primary px-6 py-3 bg-primary/10 rounded-full border border-primary/30">
                      This is your private, high-intent IUL client pipeline.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default LeadJourneyInfographic;
