import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  X,
  Clock,
  DollarSign,
  TrendingUp,
  Phone,
  Users,
  Shield,
  Target,
  BarChart3,
  Zap,
} from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const faqs = [
  {
    q: "Are aged IUL leads worth buying?",
    a: "Aged leads can be worth it in specific situations. If you are a new agent building cold-calling skills on a tight budget, buying 200 aged leads for a few hundred dollars and grinding through them will teach you more about objection handling than any course. If you are running a high-volume dialer operation with trained setters, aged data at $3 to $5 per record can produce positive ROI. But for an experienced closer whose time is worth $200 or more per hour, the math rarely works. You will spend 50+ hours of cold calling to close what an exclusive appointment system produces in 16 hours of actual selling.",
  },
  {
    q: "What is a good contact rate on aged insurance leads?",
    a: "Industry averages for aged IUL leads range from 5% to 12% contact rates, depending on the age of the data. Leads aged 20 to 60 days tend to land in the 8% to 12% range. Once you get past 90 days, expect 5% to 8%. Past 180 days, you are looking at 3% to 5%. These numbers assume clean data with verified phone numbers. If the data has been resold multiple times, actual contact rates can drop below 3%.",
  },
  {
    q: "How much do exclusive IUL leads cost compared to aged leads?",
    a: "Aged IUL leads typically run $1 to $15 per contact depending on the vendor and the age of the data. Fresh exclusive contacts from lead vendors cost $23 to $42 per lead. A full operating system like Alpha Agent uses a management fee plus ad spend model where you see every dollar. The per-contact cost is higher for exclusive leads, but the cost per closed deal is dramatically lower because show rates run 80%+ versus single-digit contact rates on aged data.",
  },
  {
    q: "What is the close rate on exclusive IUL appointments versus aged leads?",
    a: "Close rates on warm, branded exclusive appointments typically run 25% to 35% for experienced agents. The prospect already saw your face, read your credentials, and chose to book time with you. On aged leads, even when you reach someone, close rates run 3% to 8% because the prospect does not remember you, may have already bought a policy, and has zero existing trust. The compounding effect of higher contact rates AND higher close rates is what makes exclusive appointments dramatically more efficient.",
  },
  {
    q: "Can you mix aged leads and exclusive leads in the same practice?",
    a: "Absolutely. Many successful agents use exclusive appointments as their primary pipeline and supplement with aged data during slow weeks or when training new team members. The key is tracking your numbers separately so you know the true cost per acquisition for each channel. Just do not let aged lead volume distract you from working your exclusive appointments, which are almost always the higher-ROI activity.",
  },
];

export default function ExclusiveVsAgedLeads() {
  return (
    <>
      <Helmet>
        <title>Exclusive IUL Leads vs. Aged Leads: The Real Math (2026) | Alpha Agent</title>
        <meta
          name="description"
          content="Detailed cost-per-closed-deal breakdown comparing exclusive IUL appointments to aged lead data. Real numbers on contact rates, show rates, close rates, and time investment."
        />
        <link rel="canonical" href="https://alphaagent.io/exclusive-vs-aged-leads" />
        <meta property="og:title" content="Exclusive IUL Leads vs. Aged Leads: The Real Math (2026)" />
        <meta
          property="og:description"
          content="Stop comparing cost per lead. Compare cost per closed deal. The math between exclusive IUL appointments and aged data tells a story most vendors do not want you to see."
        />
        <meta property="og:url" content="https://alphaagent.io/exclusive-vs-aged-leads" />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "Exclusive IUL Leads vs. Aged Leads: The Real Math",
            description:
              "Detailed cost-per-closed-deal breakdown comparing exclusive IUL appointments to aged lead data with real industry numbers.",
            datePublished: "2026-03-27",
            dateModified: "2026-03-27",
            author: { "@type": "Organization", name: "Alpha Agent" },
            publisher: {
              "@type": "Organization",
              name: "Alpha Agent",
              url: "https://alphaagent.io",
            },
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
                Exclusive IUL Leads vs. Aged Leads
                <br />
                <span className="text-muted-foreground/40">The Real Math</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed mb-4">
                Everyone in this industry has an opinion on aged leads versus exclusive leads. Most of those
                opinions come from people selling one or the other. This page is different. We are going to
                run the actual numbers, because the math settles the debate faster than any testimonial.
              </p>
              <p className="text-base text-muted-foreground/70 max-w-3xl leading-relaxed">
                If you have been in the IUL space for any length of time, you already know that cost per lead
                is a misleading metric. What actually determines whether your lead generation is profitable is
                cost per closed deal. That is the only number that hits your bank account.
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
                    Exclusive leads cost more per contact but significantly less per closed deal. An agent buying
                    500 aged leads at $5 each will spend $2,500 and roughly 50 hours of cold calling to close about
                    2 policies. An agent working 20 exclusive branded appointments will spend 16 hours in actual
                    selling conversations and close approximately 5 policies. The per-lead price is higher. The
                    per-deal cost and the time investment are both dramatically lower.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* What Are Aged IUL Leads */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">What Are Aged IUL Leads?</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Aged leads are contact records from people who filled out an online form expressing interest
                in indexed universal life insurance somewhere between 20 and 2,000+ days ago. The original
                lead vendor already sold that data to another agent (or multiple agents) when it was fresh.
                Now they resell it at a steep discount because the data has cooled off.
              </p>
              <p>
                You are buying a name, phone number, email, and sometimes basic demographic details. The
                prospect has no idea who you are. They may not even remember filling out the form. In many
                cases, they have already spoken with other agents, or they purchased a policy months ago.
                Your job is to cold-call through the list and find the small percentage who are still in
                the market.
              </p>
            </div>

            {/* Providers */}
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <div className="glass-card p-6">
                <h3 className="font-semibold text-sm mb-2">Aged Lead Store</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  The industry standard. Operating since 2001 with an A+ BBB rating. IUL data ranges from
                  $3 to $15 per lead depending on age. No minimums, no contracts.
                </p>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">$3-$15/lead</span>
              </div>
              <div className="glass-card p-6">
                <h3 className="font-semibold text-sm mb-2">Badass Insurance Leads</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Budget option with IUL-specific data at $1 to $5 per lead. 100-lead minimum order. Includes
                  DNC screening and geo-targeting by city, county, or state.
                </p>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">$1-$5/lead</span>
              </div>
            </div>

            {/* Pros/Cons */}
            <div className="mt-8 grid sm:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Strengths of Aged Leads
                </h3>
                <ul className="space-y-3">
                  {[
                    "Extremely cheap per contact ($1 to $15)",
                    "Unlimited volume available on demand",
                    "Great training ground for new agents",
                    "No long-term commitments or contracts",
                    "Teaches objection handling under pressure",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-card p-6">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <X className="w-4 h-4 text-red-400" />
                  Weaknesses of Aged Leads
                </h3>
                <ul className="space-y-3">
                  {[
                    "Contact rates in the single digits (5-10%)",
                    "Prospects do not remember filling out a form",
                    "Data sold to multiple agents before you",
                    "Many contacts have already purchased a policy",
                    "Requires hundreds of dials to produce a sale",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </section>

        {/* What Are Exclusive IUL Leads */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">What Are Exclusive IUL Leads?</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Exclusive leads are fresh prospects generated through advertising where only one agent
                receives the contact information. Nobody else calls that prospect. Nobody else is competing
                for the same meeting. In the best implementations, the prospect sees your face, your name,
                and your credentials before they ever fill out a form, so they already have a baseline of
                trust when you reach out.
              </p>
              <p>
                The difference in prospect psychology is massive. When an aged lead picks up the phone and
                hears your pitch, their first thought is "who is this and why are they calling me?" When an
                exclusive branded prospect picks up, they think "oh, this is the person I booked with."
                That mental shift is worth more than any discount on data.
              </p>
            </div>

            {/* Providers */}
            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              <div className="glass-card p-6 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-sm text-primary">Alpha Agent</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Full operating system. Exclusive branded appointments from proprietary Google Ads with
                  millions in tracked IUL spend. Territory protection, CRM, training, command center, CSM.
                </p>
                <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Operating System
                </span>
              </div>
              <div className="glass-card p-6">
                <h3 className="font-semibold text-sm mb-2">Agent Advantage</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Fresh exclusive contacts delivered via spreadsheet. Claims 100% exclusivity with TCPA
                  compliance. Statewide targeting only.
                </p>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">Contact sales</span>
              </div>
              <div className="glass-card p-6">
                <h3 className="font-semibold text-sm mb-2">G.O.A.T. Leads</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Fresh exclusive IUL contacts at $23 to $42 per lead. Fast delivery, straightforward
                  pricing. No system or training included.
                </p>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-muted-foreground">$23-$42/lead</span>
              </div>
            </div>

            {/* Pros/Cons */}
            <div className="mt-8 grid sm:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Strengths of Exclusive Leads
                </h3>
                <ul className="space-y-3">
                  {[
                    "Warm contacts who expect your call",
                    "Show rates of 80%+ on branded appointments",
                    "Prospect already trusts you before the meeting",
                    "No competition from other agents on the same lead",
                    "Far fewer hours spent per closed deal",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-card p-6">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <X className="w-4 h-4 text-red-400" />
                  Weaknesses of Exclusive Leads
                </h3>
                <ul className="space-y-3">
                  {[
                    "Higher cost per individual lead",
                    "Requires investment in a system or higher ad spend",
                    "Lower total volume compared to bulk aged data",
                    "Quality depends heavily on the provider",
                    "Not ideal if you are still learning to close",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </section>

        {/* THE MATH SECTION */}
        <section className="pb-20 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div {...fadeIn}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">The Core Comparison</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">The Math That Settles the Debate</h2>
              <p className="text-muted-foreground leading-relaxed mb-10">
                Forget opinions. Forget testimonials. Here are two real-world scenarios using industry-average
                numbers. If your numbers are different, plug them in yourself. The relationship between the
                two approaches holds regardless.
              </p>
            </motion.div>

            {/* Scenario Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* Scenario A: Aged Leads */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="glass-card p-8 md:p-10"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Scenario A: Aged Leads</h3>
                    <p className="text-xs text-muted-foreground/60">The volume approach</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Leads purchased</span>
                    <span className="text-sm font-semibold text-foreground">500</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Cost per lead</span>
                    <span className="text-sm font-semibold text-foreground">$5.00</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Total spend</span>
                    <span className="text-sm font-semibold text-foreground">$2,500</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Contact rate</span>
                    <span className="text-sm font-semibold text-foreground">8%</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Conversations</span>
                    <span className="text-sm font-semibold text-foreground">40</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Close rate (cold contacts)</span>
                    <span className="text-sm font-semibold text-foreground">5%</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Policies closed</span>
                    <span className="text-sm font-bold text-foreground">2</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-sm text-muted-foreground">Hours invested</span>
                    <span className="text-sm font-bold text-foreground">50+</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-semibold text-foreground">Cost per policy</span>
                    <span className="text-lg font-black text-red-400">$1,250</span>
                  </div>
                </div>
              </motion.div>

              {/* Scenario B: Exclusive Appointments */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="glass-card p-8 md:p-10 border-primary/20"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Scenario B: Exclusive Appointments</h3>
                    <p className="text-xs text-muted-foreground/60">The precision approach</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Appointments booked</span>
                    <span className="text-sm font-semibold text-foreground">20</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Source</span>
                    <span className="text-sm font-semibold text-primary">Alpha Agent (branded)</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Total spend</span>
                    <span className="text-sm font-semibold text-foreground">Mgmt fee + ad spend</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Show rate</span>
                    <span className="text-sm font-semibold text-primary">80%</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Actual meetings</span>
                    <span className="text-sm font-semibold text-foreground">16</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Close rate (warm, branded)</span>
                    <span className="text-sm font-semibold text-primary">30%</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">Policies closed</span>
                    <span className="text-sm font-bold text-primary">~5</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-sm text-muted-foreground">Hours invested</span>
                    <span className="text-sm font-bold text-primary">~16</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-semibold text-foreground">Cost per policy</span>
                    <span className="text-lg font-black text-primary">Significantly lower</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Time ROI Callout */}
            <motion.div {...fadeIn}>
              <div className="glass-card p-8 md:p-10 border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
                <div className="flex items-start gap-4 mb-6">
                  <Clock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold mb-3">The Time Factor Nobody Talks About</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      This is where the real disparity lives. The aged lead agent invested 50+ hours of
                      cold calling, getting hung up on, leaving voicemails, and chasing callbacks to close
                      2 policies. The exclusive appointment agent invested roughly 16 hours of actual selling
                      conversations, and closed approximately 5 policies.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      If you value your time at $200 per hour (and as an experienced IUL agent, you should),
                      those 50+ hours of cold calling represent $10,000 in opportunity cost. That is not
                      visible on a spreadsheet comparing lead prices, but it is very real when you look at
                      your monthly production numbers.
                    </p>
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-black text-foreground">50+</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Hours cold calling (aged)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-black text-primary">~16</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Hours selling (exclusive)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-black text-primary">2.5x</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">More policies closed</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Metric-by-Metric Comparison Table */}
            <motion.div {...fadeIn} className="mt-10">
              <h3 className="text-xl font-bold mb-6">Metric-by-Metric Breakdown</h3>
              <div className="glass-card overflow-hidden">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Metric</th>
                      <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Aged Leads</th>
                      <th className="text-center py-3 px-4 font-semibold text-primary">Exclusive Appointments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="py-3 px-4 text-muted-foreground">Cost per contact</td>
                      <td className="py-3 px-4 text-center text-foreground">$1 - $15</td>
                      <td className="py-3 px-4 text-center text-foreground">Higher (system investment)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-muted-foreground">Contact/show rate</td>
                      <td className="py-3 px-4 text-center text-red-400">5% - 10%</td>
                      <td className="py-3 px-4 text-center text-primary">80%+</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-muted-foreground">Close rate on reached prospects</td>
                      <td className="py-3 px-4 text-center text-red-400">3% - 8%</td>
                      <td className="py-3 px-4 text-center text-primary">25% - 35%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-muted-foreground">Prospect knows who you are</td>
                      <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-muted-foreground/30 mx-auto" /></td>
                      <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-muted-foreground">Territory protection</td>
                      <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-muted-foreground/30 mx-auto" /></td>
                      <td className="py-3 px-4 text-center text-xs text-primary">Alpha Agent only</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-muted-foreground">Hours per closed deal</td>
                      <td className="py-3 px-4 text-center text-red-400">25+</td>
                      <td className="py-3 px-4 text-center text-primary">~3</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-muted-foreground">Scalability</td>
                      <td className="py-3 px-4 text-center text-muted-foreground">Linear (more leads = more hours)</td>
                      <td className="py-3 px-4 text-center text-primary">Efficient (more leads = more meetings)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </section>

        {/* When Aged Leads Make Sense */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">When Aged Leads Make Sense</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              We are not here to tell you aged leads are worthless. That would be dishonest. There are
              legitimate scenarios where buying aged data is the right move.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <Users className="w-5 h-5" />,
                  title: "You Are Brand New to IUL Sales",
                  desc: "Nothing teaches you how to handle objections, build rapport under pressure, and develop thick skin like 200 cold calls a day. The education alone is worth the $300 to $500 investment in aged data.",
                },
                {
                  icon: <DollarSign className="w-5 h-5" />,
                  title: "Your Budget Is Under $500 a Month",
                  desc: "If you genuinely cannot invest in a system yet, aged leads let you stay in the game while you build revenue. No shame in that. Everyone starts somewhere.",
                },
                {
                  icon: <Phone className="w-5 h-5" />,
                  title: "You Run a High-Volume Dialer Operation",
                  desc: "Some agencies run trained setters on predictive dialers pushing through 500+ calls a day. At that volume, even a 3% contact rate produces enough conversations to be profitable. This is a different business model entirely.",
                },
                {
                  icon: <TrendingUp className="w-5 h-5" />,
                  title: "You Are Building Cold-Calling Skills",
                  desc: "Aged leads are the cheapest reps you can get. If your goal is to sharpen your phone skills before investing in higher-quality leads, this is a legitimate path.",
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
                  <div className="text-muted-foreground mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-sm mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* When Exclusive Leads Make Sense */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">When Exclusive Leads Make Sense</h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              If any of the following describe you, the math overwhelmingly favors exclusive appointments
              over aged data.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <Target className="w-5 h-5" />,
                  title: "You Are an Experienced Closer",
                  desc: "You know how to run a presentation, handle objections, and close. Your constraint is not skill; it is finding enough qualified people to sit down with. Exclusive appointments solve exactly that problem.",
                },
                {
                  icon: <Clock className="w-5 h-5" />,
                  title: "You Value Your Time at $200+/Hour",
                  desc: "Spending 25+ hours on cold calls to close one policy is a losing trade when you could close that same policy in 3 hours of selling to warm prospects. The hourly ROI is not even close.",
                },
                {
                  icon: <Shield className="w-5 h-5" />,
                  title: "You Want Prospects Who Already Trust You",
                  desc: "Branded appointments mean the prospect saw your face, read your credentials, and chose to meet with you. That pre-built trust compresses your sales cycle and increases your average case size.",
                },
                {
                  icon: <Zap className="w-5 h-5" />,
                  title: "You Want a System, Not a Spreadsheet",
                  desc: "If you are tired of managing lead lists in Excel, manually tracking follow-ups, and having zero visibility into your pipeline metrics, an operating system changes everything about how you run your practice.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="glass-card p-6 border-primary/10"
                >
                  <div className="text-primary mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-sm mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* The Third Option: Operating System */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Beyond the Lead Debate</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              The Third Option: An Operating System
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The exclusive vs. aged debate frames lead generation as a standalone purchase. You buy
                contacts, you work them, you close what you can. But the most productive IUL agents in
                2026 are not buying leads at all. They are running on an operating system where leads are
                just one component of a larger machine.
              </p>
              <p>
                Alpha Agent was built around this principle. Yes, you get exclusive branded appointments
                from proprietary Google Ads campaigns backed by millions in tracked IUL-specific spend.
                But the leads are just the entry point. Here is what actually moves the needle for agents
                on the platform:
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              {[
                {
                  title: "Command Center Dashboard",
                  desc: "Real-time visibility into your revenue, lead flow, campaign performance, and pipeline health. You see exactly where every dollar goes.",
                },
                {
                  title: "Built-in CRM",
                  desc: "Purpose-built for IUL agents. Not a generic CRM with insurance bolted on. Every stage of your pipeline is designed around how IUL sales actually work.",
                },
                {
                  title: "Elite Sales Training",
                  desc: "Adam Taylor and Harlan Ryker, trained directly by Jeremy Miner (NEPQ). David Fisher: $1.2M in commissions in a single year. These are not motivational speakers. They are producers.",
                },
                {
                  title: "Dedicated CSM",
                  desc: "A real American customer success manager who knows your account, responds within 5 minutes, and proactively works with you on performance. Not a ticket system.",
                },
                {
                  title: "NFIA Verified Profile",
                  desc: "Through the National Federation of Insurance Agents, your license and credentials are displayed on a verified public profile linked directly in your lead funnel.",
                },
                {
                  title: "Territory Protection",
                  desc: "Your geographic territory is yours exclusively. No other agent on the platform competes for your prospects. This is rare in the industry and it matters.",
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
                  <h3 className="font-semibold text-sm mb-2 text-primary">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">The bottom line:</strong> Buying leads, whether aged or
                exclusive, is a transaction. Running on an operating system is a business decision. The leads
                keep flowing, the CRM keeps your pipeline organized, the training sharpens your skills, and
                the command center shows you exactly what is working. It is the difference between buying
                ingredients and having a kitchen that runs itself.
              </p>
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="pb-20 px-4 md:px-8">
          <motion.div {...fadeIn} className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-black mb-4">
              Ready to Stop Buying Leads and Start Running a System?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Book a strategy call to see what Alpha Agent looks like for your territory and production goals.
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
                { to: "/alpha-agent-vs-jucebox", label: "Alpha Agent vs. Jucebox: Full Comparison" },
                { to: "/alpha-agent-reviews", label: "Alpha Agent Reviews from Real Agents" },
                { to: "/about", label: "About Alpha Agent" },
              ].map((link, i) => (
                <Link
                  key={i}
                  to={link.to}
                  className="glass-card p-5 group hover:border-primary/30 transition-all duration-300 flex items-center justify-between"
                >
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {link.label}
                  </span>
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
              Last updated: March 27, 2026. All numbers represent industry averages and may vary
              based on market, agent experience, and lead quality. We update this guide regularly.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
