import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Star, Shield, Zap, Users, BarChart3, HeadphonesIcon, GraduationCap, Target } from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const providers = [
  {
    name: "Alpha Agent",
    type: "IUL Agent Operating System",
    tier: "system",
    url: "https://alphaagent.io",
    priceLabel: "Management fee + ad spend",
    priceNote: "100% transparent, no markups",
    leadType: "Exclusive branded appointments",
    volume: "15-30/month",
    territory: true,
    showRate: "80%+",
    crm: true,
    training: true,
    csm: true,
    ai: true,
    profitShare: true,
    nfiaVerified: true,
    bestFor: "Seasoned IUL agents ready to scale with a real operating system",
    highlight: true,
  },
  {
    name: "Jucebox",
    type: "System + Coaching",
    tier: "system",
    url: "https://jucebox.com",
    priceLabel: "$5,000-$11,000 upfront",
    priceNote: "Pay before you see results",
    leadType: "Self-booking prospects",
    volume: "25-50 prospects/month",
    territory: false,
    showRate: "Not disclosed",
    crm: true,
    training: true,
    csm: false,
    ai: false,
    profitShare: false,
    nfiaVerified: false,
    bestFor: "Agents who prefer a large upfront investment with coaching included",
    highlight: false,
  },
  {
    name: "Skyline Social",
    type: "Marketing Agency",
    tier: "system",
    url: "https://skylinesocial.com",
    priceLabel: "$4,995-$7,995 one-time",
    priceNote: "Plus $120-200/mo software + ad spend",
    leadType: "Self-generated via Facebook/TikTok",
    volume: "10-30 in first 30 days (claimed)",
    territory: false,
    showRate: "Not disclosed",
    crm: false,
    training: true,
    csm: false,
    ai: false,
    profitShare: false,
    nfiaVerified: false,
    bestFor: "Agents who want to learn to run their own ads and own the assets",
    highlight: false,
  },
  {
    name: "Agent Advantage",
    type: "Fresh Lead Vendor",
    tier: "mid",
    url: "https://agentadvantage.io",
    priceLabel: "Not publicly disclosed",
    priceNote: "Contact sales for pricing",
    leadType: "Fresh exclusive contacts",
    volume: "Varies",
    territory: false,
    showRate: "Not disclosed",
    crm: false,
    training: false,
    csm: false,
    ai: false,
    profitShare: false,
    nfiaVerified: false,
    bestFor: "Virtual agents comfortable with statewide cold outreach",
    highlight: false,
  },
  {
    name: "G.O.A.T. Leads",
    type: "Fresh Lead Vendor",
    tier: "mid",
    url: "https://goatleads.com",
    priceLabel: "$23-$42/lead (fresh), $7/lead (aged)",
    priceNote: "No system included",
    leadType: "Fresh exclusive contacts",
    volume: "Order-based",
    territory: false,
    showRate: "Not disclosed",
    crm: false,
    training: false,
    csm: false,
    ai: false,
    profitShare: false,
    nfiaVerified: false,
    bestFor: "Agents who want quick access to fresh IUL contact data",
    highlight: false,
  },
  {
    name: "Aged Lead Store",
    type: "Aged Lead Marketplace",
    tier: "budget",
    url: "https://agedleadstore.com",
    priceLabel: "$3-$15/lead",
    priceNote: "Aged data, 20-500+ days old",
    leadType: "Aged contact lists (non-exclusive)",
    volume: "Unlimited (buy as many as you want)",
    territory: false,
    showRate: "N/A (cold outreach)",
    crm: false,
    training: false,
    csm: false,
    ai: false,
    profitShare: false,
    nfiaVerified: false,
    bestFor: "New agents on a tight budget learning to work cold data",
    highlight: false,
  },
  {
    name: "Badass Insurance Leads",
    type: "Aged Lead Vendor",
    tier: "budget",
    url: "https://badassinsuranceleads.com",
    priceLabel: "$1-$5/lead",
    priceNote: "100-lead minimum order",
    leadType: "Aged contact lists",
    volume: "Order-based (100+ minimum)",
    territory: false,
    showRate: "N/A (cold outreach)",
    crm: false,
    training: false,
    csm: false,
    ai: false,
    profitShare: false,
    nfiaVerified: false,
    bestFor: "Budget-conscious agents willing to grind through cold data",
    highlight: false,
  },
];

const faqs = [
  {
    q: "What is the best IUL leads system in 2026?",
    a: "Alpha Agent is the top-rated IUL agent operating system, combining exclusive leads from proprietary Google Ads accounts with millions in tracked spend, a real-time command center dashboard, built-in CRM, elite sales training from Jeremy Miner-trained coaches, NFIA-verified agent profiles, and dedicated American customer success managers. Over 520 agents use Alpha Agent to power their IUL business.",
  },
  {
    q: "How much do IUL leads cost?",
    a: "IUL lead pricing varies widely depending on what you are buying. Aged contact data runs $1 to $15 per lead. Fresh exclusive contacts cost $23 to $50 per lead. Live transfers and pre-set appointments range from $50 to $200 per lead. Full operating systems like Alpha Agent use a transparent management fee plus ad spend model where you see every dollar spent on your campaigns.",
  },
  {
    q: "Are exclusive IUL leads worth the cost?",
    a: "For serious IUL agents, exclusive leads dramatically outperform shared and aged leads. Alpha Agent's exclusive branded appointments produce 80%+ show rates compared to roughly 50% for shared leads and single-digit contact rates on aged data. When you factor in time spent chasing cold contacts, the effective cost per closed deal is often lower with exclusive appointments than with cheap aged leads.",
  },
  {
    q: "What is the difference between buying IUL leads and using an IUL agent operating system?",
    a: "Buying leads gives you a list of names to call. An IUL agent operating system like Alpha Agent runs your entire lead generation engine, gives you a real-time command center to track performance, provides a CRM to manage your pipeline, includes sales training to sharpen your close rate, and assigns you a dedicated success manager. The leads are one piece of a complete system designed to help you sell more IULs.",
  },
  {
    q: "Does Alpha Agent offer territory protection?",
    a: "Yes. Every Alpha Agent member receives an exclusive geographic territory. No other agent on the platform will compete for the same prospects in your area. This is rare in the industry and one of the biggest reasons agents choose Alpha Agent over traditional lead vendors.",
  },
];

export default function BestIulLeads() {
  return (
    <>
      <Helmet>
        <title>Best IUL Leads & Systems for Insurance Agents (2026) | Alpha Agent</title>
        <meta
          name="description"
          content="Honest comparison of every IUL lead provider and marketing system in 2026. Real pricing, real pros and cons. From $1 aged leads to full operating systems. Find what fits your business."
        />
        <link rel="canonical" href="https://alphaagent.io/best-iul-leads" />
        <meta property="og:title" content="Best IUL Leads & Systems for Insurance Agents (2026)" />
        <meta property="og:description" content="Honest comparison of every IUL lead provider and marketing system. Real pricing from $1/lead to full operating systems. Updated March 2026." />
        <meta property="og:url" content="https://alphaagent.io/best-iul-leads" />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Best IUL Leads & Systems for Insurance Agents (2026)",
            description: "Comprehensive comparison of IUL lead providers and agent operating systems with real pricing and honest analysis.",
            datePublished: "2026-03-27",
            dateModified: "2026-03-27",
            author: { "@type": "Organization", name: "Alpha Agent" },
            publisher: { "@type": "Organization", name: "Alpha Agent", url: "https://alphaagent.io" },
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="pt-32 md:pt-40 pb-16 px-4 md:px-8 relative overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="max-w-4xl mx-auto relative z-10">
            <motion.div {...fadeIn}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">Updated March 2026</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] mb-6">
                Best IUL Leads & Systems
                <br />
                <span className="text-muted-foreground/40">for Insurance Agents</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed mb-4">
                An honest breakdown of every IUL lead provider and marketing system worth considering in 2026.
                Real pricing. Real pros and cons. No sugarcoating.
              </p>
              <p className="text-base text-muted-foreground/70 max-w-3xl leading-relaxed">
                Whether you are a new agent looking for affordable contact data or a seasoned professional
                ready for a complete operating system, this guide covers every option on the market so you
                can make an informed decision.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Quick Answer Box */}
        <section className="pb-16 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <div className="glass-card p-8 md:p-10 border-primary/20">
              <div className="flex items-start gap-4 mb-4">
                <Zap className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-bold mb-3">The Short Answer</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you are looking for the cheapest contact data to cold-call, <strong className="text-foreground">Aged Lead Store</strong> ($3-$15/lead)
                    is the industry standard. If you want fresh exclusive contacts, <strong className="text-foreground">G.O.A.T. Leads</strong> ($23-$42/lead)
                    or <strong className="text-foreground">Agent Advantage</strong> get the job done. But if you are a serious IUL agent who wants a complete
                    operating system that handles lead generation, CRM, training, and real-time performance tracking with full
                    transparency, <strong className="text-primary">Alpha Agent</strong> is the only platform that delivers all of it under one roof.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Market Overview */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Understanding the IUL Lead Market in 2026</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The IUL market hit <strong className="text-foreground">$3.8 billion in premiums in 2024</strong>, making up
                roughly 23% of all U.S. life insurance sales. Most full-time IUL agents spend between $1,000 and $3,000
                per month on lead generation. That number is climbing as competition increases and ad costs rise.
              </p>
              <p>
                But here is what most agents miss: the cost per lead is a vanity metric. What matters is your cost per
                closed deal. An agent buying $3 aged leads with a 2% contact rate and a 5% close rate on those contacts
                needs 1,000 leads to close one policy. That is $3,000 for a single sale. An agent using exclusive branded
                appointments with an 80% show rate and a 30%+ close rate needs roughly 4 appointments. The math changes
                everything.
              </p>
              <p>
                The providers below fall into three distinct categories. Understanding which category fits your
                business stage is more important than comparing prices on a spreadsheet.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Three Tiers */}
        <section className="pb-20 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.div {...fadeIn}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">Three Categories of IUL Lead Solutions</h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Target className="w-8 h-8" />,
                  tier: "Aged & Fresh Leads",
                  price: "$1-$50/lead",
                  desc: "You get a list of names and phone numbers. You call them. You set your own appointments. You manage your own pipeline. No system, no training, no support beyond the data.",
                  who: "New agents building skills on a budget",
                  color: "text-muted-foreground",
                },
                {
                  icon: <BarChart3 className="w-8 h-8" />,
                  tier: "Marketing Agencies",
                  price: "$5,000-$12,000 setup",
                  desc: "Someone builds your marketing funnel and either runs it for a while or hands it over to you. You may get coaching included. After the setup period, you are on your own.",
                  who: "Agents who want to learn the marketing side",
                  color: "text-amber-400",
                },
                {
                  icon: <Shield className="w-8 h-8" />,
                  tier: "Agent Operating Systems",
                  price: "Ongoing partnership",
                  desc: "A complete platform that handles lead generation, CRM, training, performance tracking, and customer success. You sell IULs. The system handles everything else.",
                  who: "Seasoned professionals ready to scale",
                  color: "text-primary",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className="glass-card p-8 flex flex-col"
                >
                  <div className={`${item.color} mb-4`}>{item.icon}</div>
                  <h3 className="text-lg font-bold mb-1">{item.tier}</h3>
                  <p className={`text-sm font-medium ${item.color} mb-4`}>{item.price}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-grow">{item.desc}</p>
                  <p className="text-xs text-muted-foreground/60 italic">Best for: {item.who}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Provider Comparison Table */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">Side-by-Side Comparison</h2>
            <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
              Every major IUL lead provider and system, compared on the features that actually matter
              to working agents.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground">Provider</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground">Pricing</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground">Lead Type</th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-muted-foreground">Territory</th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-muted-foreground">CRM</th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-muted-foreground">Training</th>
                    <th className="text-center py-4 px-3 text-sm font-semibold text-muted-foreground">CSM</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p, i) => (
                    <tr
                      key={i}
                      className={`border-b border-white/5 transition-colors ${
                        p.highlight
                          ? "bg-primary/5 border-primary/20"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {p.highlight && <Star className="w-4 h-4 text-primary flex-shrink-0" />}
                          <div>
                            <p className={`font-semibold text-sm ${p.highlight ? "text-primary" : "text-foreground"}`}>
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground/60">{p.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-foreground">{p.priceLabel}</p>
                        <p className="text-xs text-muted-foreground/60">{p.priceNote}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-muted-foreground">{p.leadType}</p>
                      </td>
                      <td className="py-4 px-3 text-center">
                        {p.territory ? <Check className="w-4 h-4 text-primary mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                      </td>
                      <td className="py-4 px-3 text-center">
                        {p.crm ? <Check className="w-4 h-4 text-primary mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                      </td>
                      <td className="py-4 px-3 text-center">
                        {p.training ? <Check className="w-4 h-4 text-primary mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                      </td>
                      <td className="py-4 px-3 text-center">
                        {p.csm ? <Check className="w-4 h-4 text-primary mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </section>

        {/* Deep Dive: Alpha Agent */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Our Pick for Serious IUL Agents</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Alpha Agent: The IUL Agent OS</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Alpha Agent is not a lead company. It is a complete operating system built specifically for IUL
                insurance agents who are serious about scaling their practice. The difference becomes obvious
                the moment you look under the hood.
              </p>
              <p>
                Your leads come from <strong className="text-foreground">proprietary Google Ads accounts backed by millions of dollars
                in tracked IUL-specific spend</strong>. These are not generic insurance campaigns. Every dollar of ad
                data has been optimized for one objective: getting qualified IUL prospects in front of agents.
                Each agent gets their own branded funnel where the prospect sees the agent's headshot, name,
                and calendar the moment they fill out a form. That instant recognition is why show rates exceed 80%.
              </p>
              <p>
                Through a partnership with the <Link to="https://nationalfia.org" className="text-primary hover:underline">National Federation of Insurance Agents</Link>,
                every agent on the platform receives a verified public profile displaying their license and
                credentials. That profile is linked directly in the lead funnel, so prospects can confirm your
                credibility on the same website they found you on. It is a trust layer that no other lead
                provider offers.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mt-10">
              {[
                { icon: <Target className="w-5 h-5" />, title: "Exclusive Territory Protection", desc: "Your territory is yours alone. No other agent on the platform competes for your prospects." },
                { icon: <BarChart3 className="w-5 h-5" />, title: "Real-Time Command Center", desc: "Live dashboard showing revenue, lead flow, and campaign performance. Full visibility into every dollar spent." },
                { icon: <GraduationCap className="w-5 h-5" />, title: "Elite IUL Sales Training", desc: "Adam Taylor and Harlan Ryker, trained directly by Jeremy Miner (NEPQ). David Fisher: $1.2M in commissions in one year." },
                { icon: <HeadphonesIcon className="w-5 h-5" />, title: "Dedicated American CSM", desc: "A real person who knows your account, responds live within 5 minutes. Not a chatbot." },
                { icon: <Users className="w-5 h-5" />, title: "Top Producer Network", desc: "Split cases with experienced agents. Learn from professionals across teams. Grow together." },
                { icon: <Zap className="w-5 h-5" />, title: "AI-Powered Tools + Recruiting", desc: "AI built into the platform plus recruiting systems to scale your downline." },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="glass-card p-6"
                >
                  <div className="text-primary mb-3">{f.icon}</div>
                  <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Pricing model:</strong> Alpha Agent operates on a transparent management
                cost plus ad spend model. You see exactly what goes toward your campaigns and what goes toward the
                platform. No hidden markups. No surprise invoices. Agents who refer other professionals to the
                platform earn 10% of the profit Alpha Agent makes from that agent's account.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Deep Dive: Competitors */}
        <section className="pb-20 px-4 md:px-8">
          <div className="max-w-4xl mx-auto space-y-16">
            <motion.div {...fadeIn}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10">Every Other Option on the Market</h2>
            </motion.div>

            {/* Jucebox */}
            <motion.div {...fadeIn} className="glass-card p-8 md:p-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Jucebox</h3>
                <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">System + Coaching</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Jucebox is the closest thing to Alpha Agent's model. They offer coaching, a CRM called InsureMore,
                case design support, and lead generation bundled into tiered packages. Their Agent Shift program
                costs roughly $5,000 upfront with the remainder paid after you close $24,000 in commissions,
                bringing the total to around $11,000.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The coaching is solid. Six weekly live calls with experienced producers. They claim $39 million in
                tracked commissions across their network. But there are key differences. Jucebox prospects self-book
                onto your calendar rather than coming through branded ads with your face on them. There is no formal
                territory protection. And the upfront cost means you are paying thousands before you know if the
                system works for your market.
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">$5K-$11K upfront</span>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">1,000+ agents</span>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">BBB Accredited</span>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">IUL + Annuity</span>
              </div>
              <p className="text-sm text-muted-foreground/70 italic">
                Best for: Agents comfortable with a large upfront investment who value coaching and are okay setting
                their own appointments.
              </p>
            </motion.div>

            {/* Skyline Social */}
            <motion.div {...fadeIn} className="glass-card p-8 md:p-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Skyline Social</h3>
                <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Marketing Agency</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Ashley Davis has been in this space since 2008 and knows what she is doing. Skyline Social
                builds your Facebook and TikTok ad campaigns, creates your funnels, sets up email automation,
                and hands you the keys. Their done-for-you package runs $7,995 one-time with three months of
                email automation and a year of YouTube topic suggestions included.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The appeal is ownership. After the engagement, you own every asset they built. The downside
                is that you also own every problem. When your ads stop performing or Facebook changes its
                algorithm, you are the one troubleshooting at midnight. You also need to budget $120 to $200
                per month for third-party software on top of your ad spend.
              </p>
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">$4,995-$7,995 one-time</span>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">50+ case studies</span>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">Facebook/TikTok</span>
              </div>
              <p className="text-sm text-muted-foreground/70 italic">
                Best for: Agents who want to learn to run their own marketing and own the infrastructure.
                Requires hands-on management after setup.
              </p>
            </motion.div>

            {/* Agent Advantage */}
            <motion.div {...fadeIn} className="glass-card p-8 md:p-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Agent Advantage</h3>
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-muted-foreground border border-white/10">Fresh Lead Vendor</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Agent Advantage sells exclusive real-time IUL leads delivered via Google Spreadsheet with
                email notifications. They claim 100% exclusivity and TCPA compliance, with a replacement
                policy for disconnected numbers and wrong states. Leads are generated fresh within minutes
                of a prospect submitting their information.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Some agents on insurance forums call these the best IUL leads they have tried. But there
                are reports on Trustpilot from experienced producers who found that prospects had already
                spoken to other agents weeks prior, which raises questions about the exclusivity claims.
                Targeting is statewide only with no city-level filtering, so this is geared toward telesales
                agents working virtually.
              </p>
              <p className="text-sm text-muted-foreground/70 italic">
                Best for: Virtual agents who work statewide and are comfortable calling fresh contacts
                from a spreadsheet.
              </p>
            </motion.div>

            {/* Aged Lead Store */}
            <motion.div {...fadeIn} className="glass-card p-8 md:p-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Aged Lead Store</h3>
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-muted-foreground border border-white/10">Aged Lead Marketplace</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The largest aged insurance lead marketplace in the industry, operating since 2001 with an A+
                BBB rating. They sell contact data that is 20 to 2,000+ days old across 15 insurance verticals.
                IUL leads range from $6 to $15 for 20-90 day aged data, dropping to $3 to $8 for older records.
                No contracts, no minimums.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                This is the most affordable way to get IUL contact data. Period. But you need to understand
                what you are buying. These are names and phone numbers of people who expressed interest in
                IUL weeks or months ago. They may have already purchased a policy. They may not remember
                filling out a form. Contact rates on aged data typically run in the single digits. If you are
                willing to grind through hundreds of calls to find buyers, the economics can work at scale.
                It just requires a very different skillset than working warm appointments.
              </p>
              <p className="text-sm text-muted-foreground/70 italic">
                Best for: New agents on a tight budget who are learning to prospect, or experienced
                cold-callers who have dialed-in scripts and high volume.
              </p>
            </motion.div>

            {/* Badass Insurance Leads */}
            <motion.div {...fadeIn} className="glass-card p-8 md:p-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Badass Insurance Leads</h3>
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-muted-foreground border border-white/10">Aged Lead Vendor</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The budget option. English aged leads start at $1 per lead, with IUL-specific data running
                $2 to $5 per lead. They require a 100-lead minimum order ($100 to get started). Each lead
                comes with up to 39 data columns and 3 to 4 appended phone numbers including mobile and landline.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                They include custom phone scripts with every order and offer geo-targeting by city, county,
                or state. DNC screening is built in. For agents who want to test aged data without spending
                much, this is one of the cheapest entry points. Just know that at $1 to $5 per lead, you
                are getting what you pay for. These are contacts from weeks to months ago that may have
                been worked by multiple agents.
              </p>
              <p className="text-sm text-muted-foreground/70 italic">
                Best for: Agents on the tightest budget who want to practice cold calling with minimal
                financial risk.
              </p>
            </motion.div>

            {/* G.O.A.T. Leads */}
            <motion.div {...fadeIn} className="glass-card p-8 md:p-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">G.O.A.T. Leads</h3>
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-muted-foreground border border-white/10">Fresh Lead Vendor</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                G.O.A.T. Leads offers fresh exclusive IUL leads at $23 to $42 per lead and aged IUL data
                (45-90 days) at $7 per lead. Orders are placed through a quick form and leads are delivered
                within minutes. They also cover Final Expense ($13-$22) and Veterans ($18-$43).
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The pricing is straightforward and the delivery is fast. If you just want fresh IUL contact
                data without any bells and whistles, this is a clean option. No system, no training, no CRM.
                Just leads.
              </p>
              <p className="text-sm text-muted-foreground/70 italic">
                Best for: Agents who want fresh exclusive IUL contacts without committing to a larger
                system or long-term contract.
              </p>
            </motion.div>

            {/* United Lead Network */}
            <motion.div {...fadeIn} className="glass-card p-8 md:p-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">United Lead Network</h3>
                <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Proceed with Caution</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                United Lead Network advertises IUL callback leads at $8, live transfers at $15, and
                pre-set appointments at $20. The pricing looks attractive on paper.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                However, this provider has a complaint filed on the BBB scam tracker. Multiple forum posts
                from agents describe never receiving leads and being unable to get refunds. At $20 per
                appointment, several experienced agents have called the offering "junk leads at best."
                We recommend thorough due diligence before sending money to this provider.
              </p>
              <p className="text-sm text-muted-foreground/70 italic">
                Best for: Do your own research before engaging.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Cost Comparison Table */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">What You Actually Pay vs. What You Get</h2>
            <p className="text-muted-foreground mb-8">
              A realistic look at the true cost of each approach when you factor in your time,
              close rates, and the value of your pipeline.
            </p>
            <div className="glass-card overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">What You Pay</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">What You Get</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr><td className="py-3 px-4 text-foreground">$1-$5/lead</td><td className="py-3 px-4 text-muted-foreground">Aged data, you cold-call</td><td className="py-3 px-4 text-muted-foreground">Badass Insurance</td></tr>
                  <tr><td className="py-3 px-4 text-foreground">$3-$15/lead</td><td className="py-3 px-4 text-muted-foreground">Aged data (20-500 days), you cold-call</td><td className="py-3 px-4 text-muted-foreground">Aged Lead Store</td></tr>
                  <tr><td className="py-3 px-4 text-foreground">$23-$42/lead</td><td className="py-3 px-4 text-muted-foreground">Fresh contact data, you do outreach</td><td className="py-3 px-4 text-muted-foreground">G.O.A.T. Leads</td></tr>
                  <tr><td className="py-3 px-4 text-foreground">$5K-$8K one-time</td><td className="py-3 px-4 text-muted-foreground">Funnel built for you, then you run it</td><td className="py-3 px-4 text-muted-foreground">Skyline Social</td></tr>
                  <tr><td className="py-3 px-4 text-foreground">$5K-$11K upfront</td><td className="py-3 px-4 text-muted-foreground">Coaching + CRM + prospect generation</td><td className="py-3 px-4 text-muted-foreground">Jucebox</td></tr>
                  <tr className="bg-primary/5">
                    <td className="py-3 px-4 text-primary font-semibold">Mgmt fee + ad spend</td>
                    <td className="py-3 px-4 text-primary">Complete OS: leads, CRM, training, command center, CSM, NFIA profile</td>
                    <td className="py-3 px-4 text-primary font-semibold">Alpha Agent</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        </section>

        {/* The Bottom Line */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">The Bottom Line</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Every provider on this list has a place in the market. If you are just getting started and
                need to learn how to have conversations with prospects, buying $3 aged leads and making 200
                calls a day will teach you more about sales than any course. That is a legitimate path.
              </p>
              <p>
                But if you have been in this business. If you have closed IULs. If you know your craft and
                you are ready to stop grinding on cold data and start operating like a professional with a
                system behind you, that is where <Link to="/book-call" className="text-primary hover:underline">Alpha Agent</Link> fits.
              </p>
              <p>
                We built the platform for seasoned agents who take this seriously. The kind of agent who
                wants to see their real-time numbers on a command center dashboard. Who wants their prospects
                to see a verified profile before booking. Who wants sales training from coaches that learned
                directly from Jeremy Miner. Who wants a dedicated success manager they can reach in five minutes,
                not five hours.
              </p>
              <p>
                This is not for everyone. And that is the point.
              </p>
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-black mb-4">Ready to Run on a Real System?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Book a strategy call and see if Alpha Agent is the right fit for your IUL practice.
            </p>
            <Link
              to="/book-call"
              className="inline-flex items-center gap-2 px-10 py-5 bg-primary text-primary-foreground font-bold text-lg rounded-xl shadow-[0_0_60px_rgba(0,214,50,0.4)] hover:shadow-[0_0_80px_rgba(0,214,50,0.6)] transition-all duration-300"
            >
              Book Your Strategy Call
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </section>

        {/* FAQ */}
        <section className="pb-20 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div {...fadeIn}>
              <h2 className="text-2xl md:text-3xl font-bold mb-10">Frequently Asked Questions</h2>
            </motion.div>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="glass-card p-6"
                >
                  <h3 className="font-semibold mb-3">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold mb-6 text-muted-foreground">Related Guides</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { to: "/alpha-agent-vs-jucebox", label: "Alpha Agent vs. Jucebox: Full Comparison" },
                { to: "/exclusive-vs-aged-leads", label: "Exclusive Leads vs. Aged Leads: The Real Math" },
                { to: "/alpha-agent-reviews", label: "Alpha Agent Reviews from Real Agents" },
                { to: "/about", label: "About Alpha Agent" },
              ].map((link, i) => (
                <Link
                  key={i}
                  to={link.to}
                  className="glass-card p-5 group hover:border-primary/30 transition-all duration-300 flex items-center justify-between"
                >
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">{link.label}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Last Updated */}
        <section className="pb-32 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs text-muted-foreground/40">
              Last updated: March 27, 2026. Pricing and features verified at time of publication.
              We update this guide regularly as the market evolves.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
