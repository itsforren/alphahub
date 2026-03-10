import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import nfiaLogo from "@/assets/nfia-logo.png";
import { Navbar } from "@/components/Navbar";
import CredibilityStrip from "@/components/CredibilityStrip";
import WhatYouGet from "@/components/WhatYouGet";
import LiveNotifications from "@/components/LiveNotifications";

import PartnerHeroSection from "@/components/partner/PartnerHeroSection";
import WhoThisIsFor from "@/components/partner/WhoThisIsFor";
import PartnerModel from "@/components/partner/PartnerModel";
import WhyAgencyLeadersLove from "@/components/partner/WhyAgencyLeadersLove";
import PartnerSocialProof from "@/components/partner/PartnerSocialProof";
import PartnerNextSteps from "@/components/partner/PartnerNextSteps";
import PartnerCTA from "@/components/partner/PartnerCTA";
import PartnerInlineCTA from "@/components/partner/PartnerInlineCTA";
import PartnerFAQ from "@/components/partner/PartnerFAQ";

const Partner = () => {
  return (
    <>
      <Helmet>
        <title>Partner Program | Alpha Agent - Agency Owner Partnership</title>
        <meta 
          name="description" 
          content="Turn your downline into a scalable override engine. Zero risk partnership for agency owners and team leaders. 10% lifetime profit share on every agent who joins." 
        />
      </Helmet>
      
      <main className="min-h-screen bg-background">
        <Navbar />
        <LiveNotifications />
        
        <PartnerHeroSection />
        <CredibilityStrip />
        
        <WhoThisIsFor />
        
        <PartnerInlineCTA 
          headline="Zero Risk. Maximum Upside." 
          subtext="Your team gets infrastructure. You get recurring income."
        />
        
        <PartnerModel />
        
        <PartnerInlineCTA 
          headline="Align Your Incentives" 
          subtext="When your agents win, you win. Every month."
        />
        
        <WhyAgencyLeadersLove />
        
        <PartnerSocialProof />
        
        <PartnerInlineCTA 
          headline="Give Your Team the Edge" 
          subtext="Same system. Different economics."
        />
        
        {/* What agents get - reuse from homepage */}
        <WhatYouGet title="What Your Agents Get" />
        
        <PartnerFAQ />
        
        <PartnerNextSteps />
        
        <PartnerCTA />
        
        {/* Footer */}
        <footer className="py-12 px-4 border-t border-border">
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
            {/* NFIA Partner Badge */}
            <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-background/50 border border-primary/30">
              <img src={nfiaLogo} alt="NFIA - National Federation of Insurance Agents" className="w-10 h-10 object-contain rounded-full" loading="lazy" decoding="async" />
              <span className="text-sm font-medium text-primary">Trusted NFIA Partner</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black">
                  ALPHA<span className="text-primary">AGENT</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Alpha Agent. Built by agents, for agents.
              </p>
              <nav className="flex items-center gap-6 text-sm text-muted-foreground" aria-label="Footer navigation">
                <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
                <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
                <Link to="/book-call" className="hover:text-primary transition-colors">Contact</Link>
              </nav>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
};

export default Partner;
