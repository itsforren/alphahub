import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Target, Users, TrendingUp, Shield } from "lucide-react";
import { Helmet } from "react-helmet-async";

const values = [
  {
    icon: Target,
    title: "Results-Driven",
    description: "Every decision we make is focused on generating real, measurable results for our agents.",
  },
  {
    icon: Users,
    title: "Agent-First",
    description: "We're agents ourselves. We understand your challenges because we've faced them too.",
  },
  {
    icon: TrendingUp,
    title: "Data-Obsessed",
    description: "With $2M+ in ad spend data, we know exactly what works and what doesn't.",
  },
  {
    icon: Shield,
    title: "Exclusive Access",
    description: "Only one agent per territory. Your success is our success.",
  },
];

const milestones = [
  { number: "520+", label: "Agents Served" },
  { number: "$2M+", label: "Ad Spend Data" },
  { number: "50K+", label: "Leads Generated" },
  { number: "1", label: "Agent Per Territory" },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About Alpha Agent | IUL Lead Generation System Built by Agents</title>
        <meta name="description" content="Built by licensed insurance agents who spent $2M+ on ads to perfect the IUL lead generation formula. 520+ agents trust our exclusive territory-based client acquisition system." />
        <meta name="keywords" content="IUL leads, IUL lead generation, exclusive insurance leads, insurance agent marketing, IUL client acquisition, life insurance leads system" />
        <link rel="canonical" href="https://www.alphaagent.io/about" />
        <meta property="og:title" content="About Alpha Agent | IUL Lead Generation System" />
        <meta property="og:description" content="Built by licensed agents who spent $2M+ on ads. 520+ agents trust our exclusive territory-based system." />
        <meta property="og:url" content="https://www.alphaagent.io/about" />
      </Helmet>
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 section-padding">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Built by Agents,<br />
            <span className="text-primary">For Agents</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We got tired of buying garbage leads and decided to build something better. 
            Now we're sharing it with a select group of agents who want to dominate their markets.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="section-padding bg-card/30">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-6">Our Story</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Like you, we started buying leads from the big vendors. $50 per lead, shared with 
                5 other agents, and half of them had fake phone numbers. Sound familiar?
              </p>
              <p>
                We knew there had to be a better way. So we spent years and over $2 million in 
                ad spend figuring out exactly how to generate exclusive, high-intent IUL prospects 
                using Facebook and Instagram ads.
              </p>
              <p>
                The result? A proven client acquisition system that generates 15-30 qualified 
                appointments per month, branded to YOUR name and face. No more competing with 
                other agents for the same leads. No more cold calling people who never asked 
                for information.
              </p>
              <p>
                Today, we've helped over 520 agents transform their businesses. But here's 
                what makes us different: we only work with ONE agent per territory. When you 
                partner with Alpha Agent, you're not just getting a lead system—you're getting 
                exclusive access to your entire market.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="section-padding">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">What We Stand For</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div key={value.title} className="glass-card p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones Section */}
      <section className="section-padding bg-card/30">
        <div className="container-custom">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {milestones.map((milestone) => (
              <div key={milestone.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {milestone.number}
                </div>
                <div className="text-sm text-muted-foreground">{milestone.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Dominate Your Market?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            See if your territory is still available and start generating exclusive, 
            high-intent IUL prospects within weeks.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 animate-pulse">
            <Link to="/">SEE THE SYSTEM</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-lg font-light text-foreground">ALPHA</span>
              <span className="text-lg font-bold text-primary">AGENT</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
