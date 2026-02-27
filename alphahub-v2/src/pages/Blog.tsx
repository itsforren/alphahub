import { Navbar } from "@/components/Navbar";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

const blogPosts = [
  {
    slug: "ultimate-guide-selling-iuls",
    title: "The Ultimate Guide to Selling IULs in 2024",
    excerpt: "Master the art of selling Indexed Universal Life insurance with proven techniques that top agents use to close more deals.",
    date: "December 10, 2024",
    readTime: "8 min read",
  },
  {
    slug: "sales-strategies-top-iul-agents",
    title: "5 Sales Strategies That Top IUL Agents Use",
    excerpt: "Discover the exact strategies that separate six-figure agents from the rest. These tactics work in any market.",
    date: "December 8, 2024",
    readTime: "6 min read",
  },
  {
    slug: "why-buying-leads-killing-business",
    title: "Why Traditional Lead Buying is Killing Your IUL Business",
    excerpt: "The hidden costs of purchased leads and why smart agents are switching to branded client acquisition systems.",
    date: "December 5, 2024",
    readTime: "5 min read",
  },
];

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>IUL Agent Blog | Sales Strategies & Lead Generation Tips | Alpha Agent</title>
        <meta name="description" content="Expert IUL sales strategies, lead generation tips, and proven techniques for insurance agents. Learn how top producers close more IUL policies and build thriving practices." />
        <meta name="keywords" content="IUL sales tips, IUL lead generation, indexed universal life insurance, IUL agent training, insurance sales strategies, IUL marketing, life insurance leads" />
        <link rel="canonical" href="https://www.alphaagent.io/blog" />
        <meta property="og:title" content="IUL Agent Blog | Sales Strategies & Lead Generation Tips" />
        <meta property="og:description" content="Expert IUL sales strategies and lead generation tips for insurance agents. Learn how top producers close more policies." />
        <meta property="og:url" content="https://www.alphaagent.io/blog" />
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="glass-card p-6 group hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.readTime}</span>
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
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your IUL Business?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            See our proven client acquisition system in action.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 animate-pulse">
            <Link to="/">SEE THE SYSTEM</Link>
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
