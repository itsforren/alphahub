import { Link } from "react-router-dom";
import nfiaLogo from "@/assets/nfia-logo.png";
import { Navbar } from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CredibilityStrip from "@/components/CredibilityStrip";
import ComparisonSection from "@/components/ComparisonSection";
import DetailedComparison from "@/components/DetailedComparison";
import WhatYouGet from "@/components/WhatYouGet";
import MechanismExplainer from "@/components/MechanismExplainer";
import LeadJourneyInfographic from "@/components/LeadJourneyInfographic";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import ScreenshotsCarousel from "@/components/ScreenshotsCarousel";

import ROICalculator from "@/components/ROICalculator";
import TerritoryMap from "@/components/TerritoryMap";
import RentTheMasterpiece from "@/components/RentTheMasterpiece";
import FinalCTA from "@/components/FinalCTA";
import InlineCTA from "@/components/InlineCTA";
import SlotMachineGraphic from "@/components/SlotMachineGraphic";
import FacebookFunnelGraphic from "@/components/FacebookFunnelGraphic";
import LiveNotifications from "@/components/LiveNotifications";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      {/* Live notification popups */}
      <LiveNotifications />
      
      <HeroSection />
      <CredibilityStrip />
      <ROICalculator variant="top" />
      <InlineCTA 
        headline="See the Difference?" 
        subtext="These numbers are based on 5+ years of real agent data."
      />
      <ComparisonSection />
      <InlineCTA 
        headline="Tired of Wasting Money on Bad Leads?" 
        subtext="See exactly how our system works differently."
      />
      <SlotMachineGraphic />
      <FacebookFunnelGraphic />
      <MechanismExplainer />
      <InlineCTA 
        headline="The System That Changes Everything" 
        subtext="Built by agents who were tired of the same broken model."
      />
      <LeadJourneyInfographic />
      <InlineCTA 
        headline="Ready to Stop Chasing Bad Leads?" 
        subtext="Join 520+ agents who've made the switch."
      />
      <WhatYouGet />
      <InlineCTA 
        headline="Everything You Need to Succeed" 
        subtext="No hidden fees. No vendor games. Just results."
        variant="secondary"
      />
      <DetailedComparison />
      <InlineCTA 
        headline="Done With the Vendor Trap?" 
        subtext="Clients have been with us for 5+ years. There's a reason."
      />
      <TestimonialCarousel />
      <InlineCTA 
        headline="Real Agents. Real Results." 
        subtext="Hear from agents just like you who made the switch."
      />
      <ScreenshotsCarousel />
      <InlineCTA 
        headline="Results Speak Louder Than Promises" 
        subtext="Avg 76% drop in cost per application across all agents."
        variant="secondary"
      />
      
      <ROICalculator variant="bottom" />
      <InlineCTA 
        headline="Your ROI is Waiting" 
        subtext="Don't leave money on the table."
      />
      <TerritoryMap />
      <RentTheMasterpiece />
      <FinalCTA />
      
      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
          {/* NFIA Partner Badge */}
          <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-background/50 border border-primary/30">
            <img src={nfiaLogo} alt="NFIA - National Federation of Insurance Agents" className="w-10 h-10 object-contain rounded-full" />
            <span className="text-sm font-medium text-primary">Trusted NFIA Partner</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black">
                ALPHA<span className="text-primary">AGENT</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Alpha Agent. Built by agents, for agents. | Powered by Claude Code
            </p>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground" aria-label="Footer navigation">
              <Link to="/partner" className="hover:text-primary transition-colors">Partner</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link to="/book-call" className="hover:text-primary transition-colors">Contact</Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
