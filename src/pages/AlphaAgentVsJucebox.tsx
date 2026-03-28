import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Star, Shield, Zap, Users, BarChart3, HeadphonesIcon, GraduationCap, Target, DollarSign, Eye, Award } from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const comparisonFeatures = [
  {
    feature: "Pricing Model",
    alpha: "Management fee + ad spend (fully transparent)",
    jucebox: "$5K-$11K upfront (Agent Shift), $7K+ (Agent Shift+)",
    alphaWins: true,
  },
  {
    feature: "Lead Generation",
    alpha: "Proprietary Google Ads with millions in tracked spend",
    jucebox: "Facebook-based prospect generation, self-booking model",
    alphaWins: true,
  },
  {
    feature: "Territory Protection",
    alpha: "Exclusive geographic territory per agent",
    jucebox: "No formal territory protection",
    alphaWins: true,
  },
  {
    feature: "CRM Included",
    alpha: "Yes, built into the command center",
    jucebox: "Yes, InsureMore CRM",
    alphaWins: null,
  },
  {
    feature: "Sales Training",
    alpha: "Jeremy Miner-trained coaches (Adam Taylor, Harlan Ryker)",
    jucebox: "6 weekly live coaching calls with experienced producers",
    alphaWins: null,
  },
  {
    feature: "Customer Success Manager",
    alpha: "Dedicated American CSM, live response within 5 minutes",
    jucebox: "No dedicated CSM disclosed",
    alphaWins: true,
  },
  {
    feature: "AI Tools",
    alpha: "AI built into the platform for prospecting and operations",
    jucebox: "No AI tools disclosed",
    alphaWins: true,
  },
  {
    feature: "Profit Sharing / Referrals",
    alpha: "10% of profit from referred agents",
    jucebox: "No profit-sharing program disclosed",
    alphaWins: true,
  },
  {
    feature: "NFIA Verification",
    alpha: "Verified public agent profile linked in lead funnels",
    jucebox: "No NFIA verification",
    alphaWins: true,
  },
  {
    feature: "Transparency",
    alpha: "Real-time command center dashboard, every dollar visible",
    jucebox: "Limited reporting, no real-time ad spend visibility",
    alphaWins: true,
  },
  {
    feature: "Show Rate",
    alpha: "80%+ on branded appointments",
    jucebox: "Not publicly disclosed",
    alphaWins: true,
  },
  {
    feature: "Community / Network",
    alpha: "520+ agents, split case network, top producer events",
    jucebox: "1,000+ agents, $39M tracked commissions, BBB accredited",
    alphaWins: null,
  },
];

const faqs = [
  {
    q: "Is Jucebox a scam?",
    a: "No. Jucebox is a legitimate company that has been BBB accredited since 2020 and claims $39 million in tracked commissions across their agent network. They offer a real service with coaching, a CRM, and lead generation. The question is not whether they are legitimate. It is whether their model is the best fit for how you want to run your IUL practice compared to alternatives like Alpha Agent.",
  },
  {
    q: "How much does Jucebox actually cost?",
    a: "Jucebox's Agent Shift program costs roughly $5,000 upfront. The remaining balance (bringing the total to approximately $11,000) is paid after you close $24,000 in commissions. Their Agent Shift+ tier runs around $7,000 or more upfront. The Annuity Attraction program is a separate offering focused on fixed indexed annuities rather than IUL. On top of program fees, you will also have ad spend costs.",
  },
  {
    q: "Does Alpha Agent cost less than Jucebox?",
    a: "Alpha Agent uses a management fee plus ad spend model rather than a large upfront payment. You do not pay $5,000 to $11,000 before seeing any results. Your costs scale with your campaigns, and you see exactly where every dollar goes in real time through the command center dashboard. For most agents, this means lower risk at the start and full cost transparency throughout.",
  },
  {
    q: "Which system generates better leads for IUL?",
    a: "Alpha Agent generates leads through proprietary Google Ads campaigns backed by millions in tracked IUL-specific spend, producing branded appointments with 80%+ show rates. Jucebox uses Facebook-based prospecting where leads self-book onto your calendar. The key difference is that Alpha Agent prospects see your face, name, and credentials before they book, which is why show rates and close rates tend to be higher with intent-driven Google search traffic versus social media interruption ads.",
  },
  {
    q: "Can I sell annuities through Alpha Agent or Jucebox?",
    a: "Jucebox offers an Annuity Attraction program specifically for fixed indexed annuities, which is a genuine strength of their platform. Alpha Agent is purpose-built for IUL. If your primary focus is annuities, Jucebox may be worth evaluating. If your focus is IUL production and you want the most complete operating system for that product, Alpha Agent is the stronger choice.",
  },
];

export default function AlphaAgentVsJucebox() {
  return (
    <>
      <Helmet>
        <title>Alpha Agent vs Jucebox (2026): Honest Comparison for IUL Agents | Alpha Agent</title>
        <meta
          name="description"
          content="Detailed head-to-head comparison of Alpha Agent and Jucebox for IUL agents. Real pricing, features, territory protection, show rates, and coaching. Updated March 2026."
        />
        <link rel="canonical" href="https://alphaagent.io/alpha-agent-vs-jucebox" />
        <meta property="og:title" content="Alpha Agent vs Jucebox (2026): Honest Comparison for IUL Agents" />
        <meta property="og:description" content="Head-to-head comparison of Alpha Agent and Jucebox for IUL insurance agents. Real pricing, real features, no fluff. Updated March 2026." />
        <meta property="og:url" content="https://alphaagent.io/alpha-agent-vs-jucebox" />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Alpha Agent vs Jucebox: Honest Comparison for IUL Agents (2026)",
            description: "Detailed head-to-head comparison of Alpha Agent and Jucebox for IUL insurance agents with real pricing, features, and honest analysis.",
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
                Alpha Agent vs. Jucebox
                <br />
                <span className="text-muted-foreground/40">Which IUL System Actually Delivers?</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed mb-4">
                Two platforms. Two very different approaches to building an IUL practice.
                This is the breakdown you need before you write a check to either one.
              </p>
              <p className="text-base text-muted-foreground/70 max-w-3xl leading-relaxed">
                If you have been selling IULs for more than a year, you already know the names. You have
                probably seen the ads from both companies on your feed. The question is not whether they
                are both real businesses. They are. The question is which model is actually built to help
                you scale, and which one is going to cost you five figures before you find out.
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
                  <h2 className="text-xl font-bold mb-3">The Quick Take</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Both Alpha Agent and Jucebox serve IUL agents, but their models are fundamentally different.
                    <strong className="text-primary"> Alpha Agent</strong> is a complete operating system: proprietary Google Ads,
                    branded funnels, exclusive territories, a real-time command center, NFIA-verified profiles, and a
                    dedicated American CSM. You pay a transparent management fee plus ad spend with no large upfront
                    cost. <strong className="text-foreground">Jucebox</strong> is a coaching-first platform with Facebook-based
                    prospect generation, their InsureMore CRM, and tiered pricing that starts at $5,000 upfront. Strong
                    coaching, but less infrastructure around the actual lead-to-close pipeline.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Head-to-Head Comparison Table */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">Head-to-Head Feature Comparison</h2>
            <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
              Every feature that matters when you are deciding where to invest your time and money.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground">Feature</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-primary">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Alpha Agent
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-muted-foreground">Jucebox</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-white/5 transition-colors ${
                        row.alphaWins === true ? "bg-primary/[0.03]" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-4 px-4">
                        <p className="font-semibold text-sm text-foreground">{row.feature}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-2">
                          {row.alphaWins === true && <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                          <p className={`text-sm ${row.alphaWins === true ? "text-primary" : "text-muted-foreground"}`}>{row.alpha}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-2">
                          {row.alphaWins === true && <X className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 mt-0.5" />}
                          <p className="text-sm text-muted-foreground">{row.jucebox}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </section>

        {/* Deep Dive: How Alpha Agent Works */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">The Operating System Model</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">How Alpha Agent Works</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Alpha Agent is not a lead vendor and it is not a coaching program. It is a full operating system
                for IUL agents. That distinction matters because it changes what you are actually paying for. You
                are not buying leads. You are plugging into infrastructure that handles lead generation, pipeline
                management, training, performance tracking, and client success under one roof.
              </p>
              <p>
                Your leads come from <strong className="text-foreground">proprietary Google Ads accounts with millions
                of dollars in tracked IUL-specific spend</strong>. This is not a boosted Facebook post. These are
                high-intent prospects actively searching for retirement planning, tax-free income, and indexed
                universal life insurance on Google. Each agent gets a branded funnel where the prospect sees your
                headshot, your name, and your credentials before they book. That immediate brand recognition is
                the reason show rates consistently run above 80%.
              </p>
              <p>
                Every agent receives an <strong className="text-foreground">exclusive geographic territory</strong>.
                Nobody else on the platform competes for your prospects in your area. Combined with NFIA-verified
                agent profiles (through the{" "}
                <Link to="https://nationalfia.org" className="text-primary hover:underline">National Federation of Insurance Agents</Link>),
                your prospects can verify your license and credentials on the same site where they found you.
                That trust layer converts skeptical prospects into booked appointments at a rate that cold outreach
                simply cannot match.
              </p>
              <p>
                The <strong className="text-foreground">command center dashboard</strong> gives you real-time
                visibility into everything: revenue, lead flow, campaign spend, conversion rates, and pipeline
                health. You see exactly where every dollar goes. No guessing, no waiting for monthly reports,
                no wondering if your ad budget is actually being spent on your campaigns.
              </p>
            </div>

            {/* Alpha Agent Feature Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mt-10">
              {[
                { icon: <Target className="w-5 h-5" />, title: "15-30 Exclusive Appointments/Month", desc: "Branded appointments in your territory. Prospects have already seen your face and credentials before they show up." },
                { icon: <BarChart3 className="w-5 h-5" />, title: "Real-Time Command Center", desc: "Live dashboard with revenue tracking, lead analytics, and full ad spend transparency. Every dollar accounted for." },
                { icon: <GraduationCap className="w-5 h-5" />, title: "NEPQ-Trained Sales Coaches", desc: "Adam Taylor and Harlan Ryker trained directly under Jeremy Miner. David Fisher closed $1.2M in commissions in a single year." },
                { icon: <HeadphonesIcon className="w-5 h-5" />, title: "Dedicated American CSM", desc: "A real person assigned to your account. Live response within 5 minutes. Not a ticket queue, not a chatbot." },
                { icon: <Shield className="w-5 h-5" />, title: "NFIA-Verified Agent Profile", desc: "Public profile displaying your license and credentials, linked directly in your lead funnel for instant credibility." },
                { icon: <Users className="w-5 h-5" />, title: "520+ Agent Network", desc: "Split case opportunities, top producer community, and a referral program that pays 10% of profit from agents you bring in." },
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
                <strong className="text-foreground">Pricing:</strong> Alpha Agent charges a transparent management
                fee plus your ad spend. You see exactly what goes to Google Ads and what goes to the platform.
                No hidden markups. No surprise invoices. No $5,000 check before you have seen a single lead.
                The average target premium across the network is $4,571, which tells you the quality of prospects
                flowing through these campaigns.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Deep Dive: How Jucebox Works */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Coaching-First Model</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">How Jucebox Works</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Jucebox positions itself as a coaching and lead generation system for insurance agents, with
                a heavy emphasis on training and mentorship. They have been BBB accredited since 2020 and
                claim over 1,000 agents and $39 million in tracked commissions. The company is real, the
                results they showcase are real, and they have a track record worth acknowledging.
              </p>
              <p>
                Their flagship offering is <strong className="text-foreground">Agent Shift</strong>, which costs
                roughly $5,000 upfront. The remaining balance (bringing the total to approximately $11,000)
                becomes due after you have closed $24,000 in commissions through the program. Their higher
                tier, <strong className="text-foreground">Agent Shift+</strong>, starts around $7,000 or more.
                They also run a separate <strong className="text-foreground">Annuity Attraction</strong> program
                specifically targeting fixed indexed annuity production.
              </p>
              <p>
                On the coaching side, Jucebox delivers <strong className="text-foreground">six weekly live
                coaching calls</strong> with experienced producers covering sales scripts, case design,
                objection handling, and pipeline management. Their CRM, InsureMore, is included with the
                program and handles basic lead tracking and follow-up automation.
              </p>
              <p>
                Lead generation at Jucebox works through Facebook-based prospecting. The system generates
                25 to 50 self-booking prospects per month. The key word there is "self-booking." Prospects
                land on a general booking page and schedule themselves. They have not seen your face or
                your credentials before that moment. This is a fundamentally different experience than a
                branded funnel where the prospect already knows who they are meeting with.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 mt-8">
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">$5K-$11K upfront (Agent Shift)</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">1,000+ agents</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">$39M tracked commissions</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">BBB accredited since 2020</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">InsureMore CRM</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">6 weekly live calls</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">IUL + Annuity focus</span>
            </div>
          </motion.div>
        </section>

        {/* Where Jucebox Falls Short */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Where Jucebox Falls Short</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Jucebox is not a bad company. But when you compare the two systems feature by feature,
              there are real gaps that serious IUL agents need to consider before committing thousands
              of dollars upfront.
            </p>
            <div className="space-y-4">
              {[
                {
                  icon: <DollarSign className="w-5 h-5" />,
                  title: "Large Upfront Investment Before Seeing Results",
                  desc: "You are writing a $5,000 check before you have seen a single prospect. With the deferred balance, total commitment reaches $11,000. If the system does not work for your market or your selling style, you have already spent thousands. Alpha Agent's management fee model means your costs scale with your results, not ahead of them.",
                },
                {
                  icon: <Shield className="w-5 h-5" />,
                  title: "No Territory Protection",
                  desc: "Jucebox does not offer exclusive geographic territories. Multiple agents in your area could be running the same campaigns, targeting the same prospects, through the same system. At Alpha Agent, your territory is yours alone. Period.",
                },
                {
                  icon: <Eye className="w-5 h-5" />,
                  title: "Self-Booking Prospects vs. Branded Appointments",
                  desc: "Jucebox prospects self-schedule through a generic booking page. They have not seen your face, your name, or your credentials before that call. Alpha Agent prospects book through a branded funnel with your headshot, your bio, and your NFIA-verified profile. That difference shows up directly in show rates and first-call trust.",
                },
                {
                  icon: <Target className="w-5 h-5" />,
                  title: "No NFIA Verification Layer",
                  desc: "There is no third-party credibility verification built into Jucebox's lead flow. Alpha Agent's partnership with the National Federation of Insurance Agents gives every prospect a way to confirm your license and credentials before they meet you. In an industry where trust is everything, that matters.",
                },
                {
                  icon: <HeadphonesIcon className="w-5 h-5" />,
                  title: "No Dedicated American CSM",
                  desc: "Jucebox relies on group coaching and community support. Alpha Agent assigns a dedicated American customer success manager to your account who responds live within 5 minutes. When something goes wrong with your campaigns or you need strategic guidance, you have a direct line to a real person who knows your business.",
                },
                {
                  icon: <BarChart3 className="w-5 h-5" />,
                  title: "Limited Real-Time Visibility",
                  desc: "Alpha Agent's command center dashboard shows live campaign performance, spend tracking, revenue analytics, and pipeline health in real time. Jucebox does not offer comparable real-time transparency into your ad spend or campaign-level performance data.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-red-400 flex-shrink-0 mt-0.5">{item.icon}</div>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Where Jucebox Excels */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Where Jucebox Excels</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Being honest about a competitor's strengths is what separates a legitimate comparison from
              a sales pitch. Jucebox does several things well, and if these align with what you need,
              they deserve consideration.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Strong Coaching Program",
                  desc: "Six weekly live calls with experienced producers. If you are early in your IUL career and need hands-on mentorship for scripts, objection handling, and case design, Jucebox's coaching volume is a real asset.",
                },
                {
                  title: "Case Design Support",
                  desc: "They help agents structure IUL illustrations and policy designs. For agents who are still developing confidence in case construction, this support can directly impact close rates.",
                },
                {
                  title: "Annuity Focus",
                  desc: "The Annuity Attraction program gives agents a path into fixed indexed annuities alongside IUL. If you want to diversify beyond IUL into annuity production, Jucebox offers a structured program for that.",
                },
                {
                  title: "BBB Accredited Since 2020",
                  desc: "Jucebox has maintained BBB accreditation for over five years. That means they have a track record of resolving complaints and operating within standards. It is a credibility signal worth noting.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Who Should Choose What */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">Who Should Choose What</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Alpha Agent Column */}
              <div className="glass-card p-8 border-primary/20">
                <div className="flex items-center gap-3 mb-6">
                  <Star className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold text-primary">Choose Alpha Agent If...</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    "You are an experienced IUL agent ready to scale with a complete operating system, not just leads",
                    "You want exclusive territory protection so no one else on the platform is competing for your prospects",
                    "You prefer transparent, pay-as-you-go pricing over a large upfront commitment",
                    "You want branded appointments where prospects already know your name and face before the call",
                    "You need real-time visibility into your campaign performance and ad spend",
                    "You want a dedicated CSM who responds in minutes, not a support ticket queue",
                    "You value NFIA-verified credentials that give prospects a reason to trust you before you ever speak",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                      <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Jucebox Column */}
              <div className="glass-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Award className="w-6 h-6 text-amber-400" />
                  <h3 className="text-xl font-bold">Choose Jucebox If...</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    "You are newer to IUL and need heavy coaching on scripts, objection handling, and case design",
                    "You are comfortable paying $5,000 to $11,000 upfront before seeing results from the system",
                    "You want to add annuity production alongside your IUL business through a structured program",
                    "You do not need exclusive territory protection and are fine with potential overlap",
                    "You prefer a coaching-community model over a technology-first operating system",
                    "Show rates and branded funnels are less important to you than live coaching access",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />
                      <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </section>

        {/* The Bottom Line */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">The Bottom Line</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Jucebox has built a real company with real results. Their coaching is solid, their BBB track
                record is clean, and their annuity offering fills a niche that most IUL platforms ignore.
                For agents who need mentorship and are willing to invest heavily upfront on the promise of
                future returns, it can work.
              </p>
              <p>
                But if you have been in the IUL business long enough to know what you need, and what you need
                is a system rather than a classroom, Alpha Agent is in a different category. Exclusive territories.
                Branded funnels powered by proprietary Google Ads with millions in tracked spend. An 80%+ show
                rate that comes from prospects who have already seen your face and verified your credentials.
                A real-time command center that shows you every dollar flowing through your business. A dedicated
                CSM who picks up the phone in five minutes. And a pricing model that does not require you to
                gamble $5,000 to $11,000 before you know if it works.
              </p>
              <p>
                520+ agents are already running on this operating system. The average target premium across the
                network is $4,571. David Fisher closed $1.2 million in commissions in a single year. These are
                not hypothetical numbers from a sales deck. They are production metrics from agents who show up
                and sell every day.
              </p>
              <p>
                The question is simple: do you want to buy coaching and hope it comes together, or do you want
                to plug into infrastructure that is already working?
              </p>
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-black mb-4">See the Difference for Yourself</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Book a strategy call and we will walk you through the command center, the lead flow,
              and exactly how the operating system works for agents in your territory.
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
                { to: "/best-iul-leads", label: "Best IUL Leads & Systems for Insurance Agents (2026)" },
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
              We update this comparison regularly as both platforms evolve.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
