import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Check, Zap, Clock, Shield, TrendingUp, ArrowRight, Sparkles, Timer, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useCalculator } from "@/contexts/CalculatorContext";
import { trackPricingView } from "@/lib/tracking";

const Pricing = () => {
  const { openPopup } = useCalculator();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Track pricing page view for retargeting
  useEffect(() => {
    trackPricingView();
  }, []);

  // Countdown to midnight
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      
      return {
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    "Done-for-you IUL lead generation system",
    "Pre-built high-converting ad campaigns",
    "Automated lead nurturing sequences",
    "CRM integration & lead tracking",
    "Weekly optimization calls",
    "Private Slack community access",
    "Real-time lead notifications",
    "Proven scripts & templates",
  ];

  return (
    <>
      <Helmet>
        <title>Tierre Team Only Pricing | Alpha Agent</title>
        <meta name="description" content="Exclusive pricing for Tierre Team members. Get access to our proven IUL lead generation system." />
      </Helmet>

      <Navbar />

      <main className="min-h-screen bg-background pt-24 pb-16">
        {/* Hero Section */}
        <section className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">Exclusive Access</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground mb-6 leading-tight">
              TIERRE TEAM<br />
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">
                ONLY PRICING
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              You've been selected for our most powerful lead generation system. 
              Lock in these exclusive rates before they expire.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            
            {/* Standard Monthly */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative bg-card border border-border rounded-3xl p-8 md:p-10"
            >
              <div className="absolute top-4 right-4 px-3 py-1 bg-muted rounded-full">
                <span className="text-xs font-medium text-muted-foreground">Until End of Year</span>
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-2">Monthly Plan</h3>
              <p className="text-muted-foreground mb-6">Pay as you go, cancel anytime</p>
              
              <div className="mb-8">
                <span className="text-5xl md:text-6xl font-black text-foreground">$1,497</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              
              <ul className="space-y-4 mb-8">
                {features.slice(0, 5).map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                onClick={openPopup}
                variant="outline" 
                className="w-full py-6 text-lg font-bold border-2"
              >
                Get Started
              </Button>
            </motion.div>

            {/* 3-Month Prepay - Featured */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative bg-gradient-to-b from-primary/10 via-background to-background border-2 border-primary rounded-3xl p-8 md:p-10 overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent opacity-50" />
              
              {/* Urgency badge */}
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-4 right-4 px-4 py-2 bg-primary rounded-full flex items-center gap-2"
              >
                <Timer className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm font-bold text-primary-foreground">EXPIRES MIDNIGHT</span>
              </motion.div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">3-Month Prepay</h3>
                </div>
                <p className="text-muted-foreground mb-6">Best value • Save $600</p>
                
                <div className="mb-2">
                  <span className="text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">
                    $1,297
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                
                <div className="flex items-center gap-3 mb-8">
                  <span className="text-2xl font-bold text-foreground">$3,891 total</span>
                  <span className="text-sm text-muted-foreground line-through">$4,491</span>
                </div>

                {/* Countdown Timer */}
                <div className="bg-background/80 backdrop-blur-sm border border-border rounded-2xl p-4 mb-8">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 text-center">Offer expires in</p>
                  <div className="flex justify-center gap-3">
                    {[
                      { value: timeLeft.hours, label: 'HRS' },
                      { value: timeLeft.minutes, label: 'MIN' },
                      { value: timeLeft.seconds, label: 'SEC' },
                    ].map((item, index) => (
                      <div key={index} className="text-center">
                        <div className="bg-foreground text-background w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black">
                          {item.value.toString().padStart(2, '0')}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 block">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={openPopup}
                  className="w-full py-6 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
                >
                  Lock In This Rate
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                {/* Split payment option */}
                <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Split Payment Available</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pay the $3,891 in 2 or 3 easy installments. Contact us after signup to arrange.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Ad Spend Recommendation */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-3xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <TrendingUp className="w-10 h-10 text-white" />
                  </div>
                </div>
                
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-2xl md:text-3xl font-black text-foreground mb-3">
                    Our Recommendation for Success
                  </h3>
                  <p className="text-lg text-muted-foreground mb-4">
                    To maximize your results with our system, we suggest a minimum of{' '}
                    <span className="text-amber-400 font-bold">$40/day</span> in ad spend. 
                    This budget allows for proper testing, optimization, and consistent lead flow.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-foreground">~$1,200/month ad budget</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-foreground">3-5 qualified leads daily</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-foreground">Optimized targeting</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-center mt-16"
          >
            <p className="text-muted-foreground mb-6">
              Questions? Need help deciding? We're here for you.
            </p>
            <Button 
              onClick={openPopup}
              variant="outline" 
              className="px-8 py-6 text-lg font-semibold"
            >
              Talk to Our Team
            </Button>
          </motion.div>
        </section>
      </main>
    </>
  );
};

export default Pricing;
