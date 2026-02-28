import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Check, Shield, TrendingUp, ArrowRight, CreditCard, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";

const PartnerPricing = () => {
  const navigate = useNavigate();

  const features = [
    "Done-for-you Facebook lead generation",
    "Pre-qualified IUL-interested prospects",
    "Automated follow-up sequences",
    "CRM integration & lead management",
    "Dedicated account manager",
    "Weekly optimization calls",
    "Exclusive territory protection",
    "Training & scripts included",
  ];

  return (
    <>
      <Helmet>
        <title>IUL System Pricing | Alpha Agent</title>
        <meta name="description" content="Get started with Alpha Agent's proven IUL lead generation system. Pricing options for solo agents." />
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
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">Solo Agent Program</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground mb-6 leading-tight">
              IUL SYSTEM<br />
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">
                PRICING
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Get consistent, pre-qualified IUL leads delivered to you every month. 
              Focus on closing while we handle the marketing.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            
            {/* Management - Featured */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative bg-gradient-to-b from-primary/10 via-background to-background border-2 border-primary rounded-3xl p-8 md:p-10 overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent opacity-50" />
              
              {/* Badge */}
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-4 right-4 px-4 py-2 bg-primary rounded-full flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm font-bold text-primary-foreground">MOST POPULAR</span>
              </motion.div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">Full Management</h3>
                </div>
                <p className="text-muted-foreground mb-6">Complete done-for-you lead generation</p>
                
                <div className="mb-8">
                  <span className="text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">
                    $1,997
                  </span>
                  <span className="text-muted-foreground">/month</span>
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
                  onClick={() => navigate("/book-call")}
                  className="w-full py-6 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>

            {/* 3-Pay Option */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative bg-card border border-border rounded-3xl p-8 md:p-10 overflow-hidden"
            >
              {/* Badge */}
              <div className="absolute top-4 right-4 px-4 py-2 bg-amber-500 rounded-full flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white">FLEXIBLE</span>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xl font-bold text-foreground">3-Pay Option</h3>
                </div>
                <p className="text-muted-foreground mb-6">Split your investment • Same benefits</p>
                
                <div className="mb-2">
                  <span className="text-5xl md:text-6xl font-black text-foreground">
                    $1,497
                  </span>
                  <span className="text-muted-foreground"> x 3</span>
                </div>
                
                <div className="flex items-center gap-3 mb-8">
                  <span className="text-2xl font-bold text-foreground">$4,491 total</span>
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
                  onClick={() => navigate("/book-call")}
                  variant="outline"
                  className="w-full py-6 text-lg font-bold border-2"
                >
                  Choose 3-Pay Option
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                {/* Payment breakdown */}
                <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    3 monthly payments of $1,497 • First payment today
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* What's Included */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-r from-primary/10 via-emerald-500/10 to-primary/10 border border-primary/30 rounded-3xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <TrendingUp className="w-10 h-10 text-white" />
                  </div>
                </div>
                
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-2xl md:text-3xl font-black text-foreground mb-3">
                    Why Agents Choose Alpha Agent
                  </h3>
                  <p className="text-lg text-muted-foreground mb-4">
                    Our agents typically see their production increase by{' '}
                    <span className="text-primary font-bold">40-60%</span> within the first 90 days. 
                    Stop wasting time on cold leads and start closing more deals.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-foreground">No long-term contracts</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-foreground">30-day money back</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-foreground">Dedicated support</span>
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
              Ready to get more qualified leads? Let's talk.
            </p>
            <Button 
              onClick={() => navigate("/book-call")}
              variant="outline" 
              className="px-8 py-6 text-lg font-semibold"
            >
              Schedule a Call
            </Button>
          </motion.div>
        </section>
      </main>
    </>
  );
};

export default PartnerPricing;