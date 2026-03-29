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
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("blog_posts" as any)
        .select("slug, title, excerpt, published_at, read_time, featured_image, featured_image_alt, author_name")
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
      month: "long",
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
      <section className="pt-32 pb-16 section-padding">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Agent <span className="text-primary">Insights</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Strategies, tactics, and insights to help you sell more IULs and build a thriving practice.
          </p>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="section-padding">
        <div className="container-custom">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">New content coming soon.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="glass-card group hover:border-primary/50 transition-all duration-300 overflow-hidden"
                >
                  {post.featured_image && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={post.featured_image}
                        alt={post.featured_image_alt || post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                      <span>{formatDate(post.published_at)}</span>
                      <span>&middot;</span>
                      <span>{post.read_time}</span>
                      <span>&middot;</span>
                      <span>{post.author_name}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-2 text-primary text-sm font-medium">
                      Read More
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Run on the IUL Agent OS?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            See the complete operating system in action.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/book-call">BOOK A STRATEGY CALL</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-16">
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

export default Blog;
