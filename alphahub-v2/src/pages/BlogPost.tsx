import { useParams, Link, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

const blogContent: Record<string, { title: string; date: string; readTime: string; content: React.ReactNode }> = {
  "ultimate-guide-selling-iuls": {
    title: "The Ultimate Guide to Selling IULs in 2024",
    date: "December 10, 2024",
    readTime: "8 min read",
    content: (
      <>
        <p>Indexed Universal Life (IUL) insurance has become one of the most sought-after financial products for clients looking to build tax-advantaged wealth while maintaining life insurance protection. But selling IULs requires a different approach than traditional life insurance.</p>
        
        <h2>Understanding What Clients Really Want</h2>
        <p>Before diving into product features, understand that clients don't buy IULs—they buy outcomes. They want:</p>
        <ul>
          <li><strong>Tax-free retirement income</strong> they can't outlive</li>
          <li><strong>Protection from market downturns</strong> while participating in gains</li>
          <li><strong>Legacy planning</strong> for their families</li>
          <li><strong>Living benefits</strong> for chronic illness or critical care</li>
        </ul>
        <p>Lead every conversation with outcomes, not product specifications.</p>
        
        <h2>Handling the Most Common Objections</h2>
        
        <h3>"It's too expensive"</h3>
        <p>Reframe the conversation: "Compared to what?" Show them the true cost of their current strategy—taxes on 401(k) withdrawals, market risk in their portfolio, and the lack of living benefits. An IUL isn't an expense; it's a reallocation of existing dollars into a more efficient vehicle.</p>
        
        <h3>"I've heard bad things about IULs"</h3>
        <p>Acknowledge their concern and ask what specifically they've heard. Most negative press comes from poorly designed policies or agents who over-promised. Explain how you design policies for maximum efficiency, not maximum commission.</p>
        
        <h3>"I need to think about it"</h3>
        <p>This usually means you haven't created enough urgency or clarity. Ask: "What specifically do you need to think about?" Then address that concern directly. If they're truly not ready, book a follow-up call before leaving.</p>
        
        <h2>Closing Techniques That Work</h2>
        
        <h3>The Assumptive Close</h3>
        <p>After presenting, don't ask "What do you think?" Instead, say: "Based on what you've told me about your goals, I recommend we start with [specific recommendation]. Let's get the application started—do you have your driver's license handy?"</p>
        
        <h3>The Calendar Close</h3>
        <p>"If we start the application today, you'll have your policy in force by [date]. That means if anything happens after that date, your family is protected. What's stopping us from getting started right now?"</p>
        
        <h3>The Cost of Waiting</h3>
        <p>Show them the actual numbers. Every year they wait, their premium increases. Every year without tax-free growth is a year of lost compounding. Make the cost of inaction crystal clear.</p>
        
        <h2>Building Your Pipeline</h2>
        <p>The best closers in this business never run out of prospects. They have a systematic approach to generating new leads—whether through referrals, social media, or a branded client acquisition system like Alpha Agent provides.</p>
        <p>When you have 15-30 qualified appointments per month, you can afford to let some deals walk. That abundance mindset actually makes you a better closer because prospects sense your confidence.</p>
      </>
    ),
  },
  "sales-strategies-top-iul-agents": {
    title: "5 Sales Strategies That Top IUL Agents Use",
    date: "December 8, 2024",
    readTime: "6 min read",
    content: (
      <>
        <p>After working with over 520 agents, we've identified the exact strategies that separate six-figure producers from everyone else. These aren't theories—they're battle-tested tactics that work in any market.</p>
        
        <h2>1. Build Rapport Before Selling</h2>
        <p>Top agents spend the first 10-15 minutes of every meeting just talking. About family. About hobbies. About anything except insurance. Why? Because people buy from people they like and trust.</p>
        <p>Find genuine common ground. If you can't find it, create it by being authentically curious about their life. Ask follow-up questions. Remember details for the next conversation.</p>
        
        <h2>2. Use the Problem-Solution Framework</h2>
        <p>Never lead with the product. Lead with the problem.</p>
        <p><strong>The framework:</strong></p>
        <ol>
          <li>Identify their biggest financial concern (taxes, market risk, legacy)</li>
          <li>Agitate that concern with specific numbers and scenarios</li>
          <li>Present the IUL as the solution to that specific problem</li>
        </ol>
        <p>This approach makes you a problem-solver, not a salesperson. The product recommendation feels natural rather than forced.</p>
        
        <h2>3. Follow Up Without Being Pushy</h2>
        <p>The fortune is in the follow-up, but most agents do it wrong. They call and say, "Just checking in to see if you've made a decision." That's pushy and adds no value.</p>
        <p><strong>Instead, try:</strong></p>
        <ul>
          <li>Send an article relevant to something they mentioned</li>
          <li>Share a case study of a client in a similar situation</li>
          <li>Provide new information that affects their decision</li>
        </ul>
        <p>Every follow-up should add value. When you do that, you're not being pushy—you're being helpful.</p>
        
        <h2>4. Leverage Social Proof</h2>
        <p>Stories sell. Numbers tell. Use both.</p>
        <p>"I have a client, a dentist actually, who was in a very similar situation. He was worried about taxes eating into his retirement. We set up an IUL two years ago, and he just told me it's the best financial decision he's ever made. Here's what we did for him..."</p>
        <p>Always get permission before sharing client stories, and keep details appropriately vague. But real examples are 10x more powerful than hypotheticals.</p>
        
        <h2>5. Create Authentic Urgency</h2>
        <p>Fake urgency destroys trust. "This offer expires tomorrow" when it doesn't is a lie that clients see through.</p>
        <p><strong>Real urgency comes from:</strong></p>
        <ul>
          <li>Age-based pricing increases (show actual numbers)</li>
          <li>Health changes that could affect insurability</li>
          <li>Tax law changes on the horizon</li>
          <li>The opportunity cost of waiting (lost years of tax-free growth)</li>
        </ul>
        <p>When the urgency is real, you're not pressuring anyone—you're informing them so they can make the best decision for their family.</p>
        
        <h2>The Common Thread</h2>
        <p>Notice what all five strategies have in common? They're about putting the client first. The best agents aren't the smoothest talkers—they're the ones who genuinely care about solving problems.</p>
        <p>When you have that mindset, and you combine it with a steady flow of qualified prospects, six-figure months become inevitable.</p>
      </>
    ),
  },
  "why-buying-leads-killing-business": {
    title: "Why Traditional Lead Buying is Killing Your IUL Business",
    date: "December 5, 2024",
    readTime: "5 min read",
    content: (
      <>
        <p>You know the drill. You buy 20 leads at $50 each. That's $1,000. Half the phone numbers are disconnected. A quarter of them are shared with three other agents. The ones you do reach aren't expecting your call.</p>
        <p>If you're lucky, you set 2-3 appointments. One shows up. And they're price shopping because they've already talked to your competitors.</p>
        <p>Sound familiar? You're not alone. And it's not your fault. The lead buying model is fundamentally broken for agents.</p>
        
        <h2>The Hidden Costs Nobody Talks About</h2>
        
        <h3>Time Cost</h3>
        <p>How many hours do you spend chasing bad leads? Calling disconnected numbers? Leaving voicemails that never get returned? That time has value. If you bill yourself at $200/hour (which you should), every hour wasted on bad leads is $200 gone.</p>
        
        <h3>Opportunity Cost</h3>
        <p>Every hour spent on garbage leads is an hour you're not spending with qualified prospects, asking for referrals, or building relationships that generate repeat business.</p>
        
        <h3>Reputation Cost</h3>
        <p>When you call someone who's been contacted by five agents that week, you're just another annoying salesperson. That damages your personal brand and makes every subsequent sale harder.</p>
        
        <h2>The Quality vs. Quantity Trap</h2>
        <p>Lead vendors will tell you it's a numbers game. "Buy more leads, make more calls, close more deals." But that's their business model, not yours.</p>
        <p>The math doesn't work:</p>
        <ul>
          <li>100 shared leads = maybe 5 appointments = maybe 1 sale</li>
          <li>Cost: $5,000 in leads + 40 hours of calling time</li>
          <li>Result: One sale that cost you $5,000 and a week of your life</li>
        </ul>
        <p>Compare that to:</p>
        <ul>
          <li>20 exclusive, branded leads = 15 appointments = 5+ sales</li>
          <li>Cost: Same $5,000</li>
          <li>Result: 5x the sales, and these clients think YOU are the expert</li>
        </ul>
        
        <h2>How Branded Funnels Change Everything</h2>
        <p>Here's what happens when prospects come through a funnel with YOUR face, YOUR name, and YOUR expertise:</p>
        <ul>
          <li><strong>They know who you are</strong> before you call</li>
          <li><strong>They requested YOU specifically</strong>, not "information about IULs"</li>
          <li><strong>They've consumed YOUR content</strong> and already see you as the expert</li>
          <li><strong>No other agents</strong> are calling them</li>
        </ul>
        <p>The conversation is completely different. You're not overcoming skepticism—you're building on existing trust. You're not competing on price—you're the obvious choice.</p>
        
        <h2>The Real ROI Comparison</h2>
        <p>Let's look at actual numbers from agents who've made the switch:</p>
        <p><strong>Before (Traditional Lead Buying):</strong></p>
        <ul>
          <li>Monthly lead spend: $5,000</li>
          <li>Appointments set: 8-10</li>
          <li>Show rate: 50%</li>
          <li>Close rate: 20%</li>
          <li>Policies written: 1-2</li>
        </ul>
        <p><strong>After (Branded Acquisition System):</strong></p>
        <ul>
          <li>Monthly investment: $5,000</li>
          <li>Appointments set: 20-30</li>
          <li>Show rate: 80%+</li>
          <li>Close rate: 40%+</li>
          <li>Policies written: 8-12</li>
        </ul>
        <p>Same budget. 6x the results. And every client already knows and trusts you.</p>
        
        <h2>Making the Switch</h2>
        <p>You have two choices:</p>
        <ol>
          <li>Keep playing the lead buying game and hope it gets better (it won't)</li>
          <li>Invest in a system that positions you as the expert and generates exclusive prospects who want to work with YOU</li>
        </ol>
        <p>The agents who are crushing it in 2024 made this switch months or years ago. They stopped renting someone else's leads and started building their own client acquisition engine.</p>
        <p>The only question is: how much longer will you wait?</p>
      </>
    ),
  },
};

const BlogPost = () => {
  const { slug } = useParams();
  const post = slug ? blogContent[slug] : null;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title} | Alpha Agent Blog</title>
        <meta name="description" content={`${post.title} - Expert IUL sales strategies and tips for insurance agents looking to grow their practice and close more policies.`} />
        <meta name="keywords" content="IUL sales, IUL leads, indexed universal life, insurance agent tips, IUL strategies, life insurance marketing" />
        <link rel="canonical" href={`https://www.alphaagent.io/blog/${slug}`} />
        <meta property="og:title" content={`${post.title} | Alpha Agent`} />
        <meta property="og:description" content={`Expert insights on ${post.title.toLowerCase()} for insurance agents.`} />
        <meta property="og:url" content={`https://www.alphaagent.io/blog/${slug}`} />
      </Helmet>
      <Navbar />
      
      <article className="pt-32 pb-16 section-padding">
        <div className="container-custom max-w-3xl">
          {/* Back Link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
              <span>{post.date}</span>
              <span>•</span>
              <span>{post.readTime}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
              {post.title}
            </h1>
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-foreground [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-foreground [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:text-muted-foreground [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:text-muted-foreground [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:mb-2 [&>ol]:text-muted-foreground [&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol>li]:mb-2 [&_strong]:text-foreground">
            {post.content}
          </div>

          {/* CTA */}
          <div className="mt-16 p-8 glass-card text-center">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Ready to Stop Buying Leads?
            </h3>
            <p className="text-muted-foreground mb-6">
              See how our branded client acquisition system can generate 15-30 exclusive appointments per month.
            </p>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 animate-pulse">
              <Link to="/">SEE THE SYSTEM</Link>
            </Button>
          </div>
        </div>
      </article>

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

export default BlogPost;
