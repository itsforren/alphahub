import { Navbar } from "@/components/Navbar";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  published_at: string;
  read_time: string;
  featured_image: string | null;
  featured_image_alt: string | null;
  author_name: string;
  author_image: string | null;
}

const SIERRA_IMAGE =
  "https://qcunascacayiiuufjtaq.supabase.co/storage/v1/object/public/media/profile-photos/1766368659922-oq4x14.jpg";

// Gradient covers for posts that don't have a featured image
const COVER_GRADIENTS = [
  "from-emerald-900/60 via-emerald-800/30 to-zinc-900",
  "from-blue-900/60 via-indigo-800/30 to-zinc-900",
  "from-amber-900/60 via-orange-800/30 to-zinc-900",
  "from-violet-900/60 via-purple-800/30 to-zinc-900",
  "from-cyan-900/60 via-teal-800/30 to-zinc-900",
  "from-rose-900/60 via-pink-800/30 to-zinc-900",
];

const COVER_ICONS = [
  // Chart bars
  <svg key="0" viewBox="0 0 120 80" className="w-20 h-14 opacity-20"><rect x="10" y="40" width="16" height="40" rx="3" fill="currentColor"/><rect x="34" y="20" width="16" height="60" rx="3" fill="currentColor"/><rect x="58" y="30" width="16" height="50" rx="3" fill="currentColor"/><rect x="82" y="10" width="16" height="70" rx="3" fill="currentColor"/></svg>,
  // Target
  <svg key="1" viewBox="0 0 80 80" className="w-16 h-16 opacity-20"><circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="3" fill="none"/><circle cx="40" cy="40" r="22" stroke="currentColor" strokeWidth="3" fill="none"/><circle cx="40" cy="40" r="9" fill="currentColor"/></svg>,
  // Lightning
  <svg key="2" viewBox="0 0 60 80" className="w-14 h-16 opacity-20"><path d="M35 5L10 45h18L20 75l35-45H37L45 5H35z" fill="currentColor"/></svg>,
  // People
  <svg key="3" viewBox="0 0 100 70" className="w-20 h-14 opacity-20"><circle cx="30" cy="20" r="12" fill="currentColor"/><circle cx="70" cy="20" r="12" fill="currentColor"/><path d="M10 65c0-16 9-28 20-28s20 12 20 28" fill="currentColor"/><path d="M50 65c0-16 9-28 20-28s20 12 20 28" fill="currentColor"/></svg>,
  // Upward arrow
  <svg key="4" viewBox="0 0 80 80" className="w-16 h-16 opacity-20"><path d="M15 65L40 15l25 50" stroke="currentColor" strokeWidth="5" fill="none" strokeLinejoin="round"/><line x1="40" y1="15" x2="40" y2="75" stroke="currentColor" strokeWidth="4"/></svg>,
  // Dollar
  <svg key="5" viewBox="0 0 60 80" className="w-12 h-16 opacity-20"><text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fontSize="60" fill="currentColor" fontWeight="bold">$</text></svg>,
];

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("blog_posts" as any)
        .select("slug, title, excerpt, published_at, read_time, featured_image, featured_image_alt, author_name, author_image")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (!error && data) {
        setPosts(data as unknown as BlogPost[]);
      }
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>IUL Agent Blog | Sales Strategies & Lead Generation Tips | Alpha Agent</title>
        <meta name="description" content="Expert IUL sales strategies, lead generation tips, and proven techniques for insurance agents. Written by Sierra Reigh and the Alpha Agent team." />
        <meta name="keywords" content="IUL sales tips, IUL lead generation, indexed universal life insurance, IUL agent training, insurance sales strategies, IUL marketing, life insurance leads" />
        <link rel="canonical" href="https://alphaagent.io/blog" />
        <meta property="og:title" content="IUL Agent Blog | Sales Strategies & Lead Generation Tips" />
        <meta property="og:description" content="Expert IUL sales strategies and lead generation tips for insurance agents. Learn how top producers close more policies." />
        <meta property="og:url" content="https://alphaagent.io/blog" />
      </Helmet>
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 pb-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Agent <span className="text-primary">Insights</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Strategies, tactics, and insights to help you sell more IULs and build a thriving practice.
          </p>
          {/* Author badge */}
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08]">
            <img
              src={SIERRA_IMAGE}
              alt="Sierra Reigh"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground leading-tight">Sierra Reigh</p>
              <p className="text-xs text-muted-foreground leading-tight">Customer Success Manager</p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="px-4 md:px-8 pb-24">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">New content coming soon.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {posts.map((post, index) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-primary/40 transition-all duration-300 flex flex-col"
                >
                  {/* Cover Image Area */}
                  {post.featured_image ? (
                    <div className="aspect-[2/1] overflow-hidden">
                      <img
                        src={post.featured_image}
                        alt={post.featured_image_alt || post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className={`aspect-[2/1] bg-gradient-to-br ${COVER_GRADIENTS[index % COVER_GRADIENTS.length]} flex items-center justify-center text-white relative overflow-hidden`}>
                      <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px"}} />
                      <div className="relative flex flex-col items-center gap-2">
                        {COVER_ICONS[index % COVER_ICONS.length]}
                        <span className="text-xs font-medium uppercase tracking-widest opacity-30">
                          {post.read_time}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="p-5 md:p-6 flex flex-col flex-1">
                    <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed flex-1">
                      {post.excerpt}
                    </p>

                    {/* Footer: author + meta */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={post.author_image || SIERRA_IMAGE}
                          alt={post.author_name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-medium text-foreground leading-tight">{post.author_name}</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">{formatDate(post.published_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Read
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 md:px-8 pb-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Ready to Run on the IUL Agent OS?
          </h2>
          <p className="text-muted-foreground mb-6 text-sm md:text-base">
            See the complete operating system in action.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/book-call">BOOK A STRATEGY CALL</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
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

export default Blog;
