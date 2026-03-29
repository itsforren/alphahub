import { useParams, Link, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Calendar, Clock, User } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BlogPostData {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  published_at: string;
  read_time: string;
  featured_image: string | null;
  featured_image_alt: string | null;
  author_name: string;
  author_title: string;
  author_image: string | null;
  meta_description: string;
  meta_keywords: string | null;
  tags: string[];
}

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("blog_posts" as any)
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data as unknown as BlogPostData);
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !post) {
    return <Navigate to="/blog" replace />;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: {
      "@type": "Person",
      name: post.author_name,
      jobTitle: post.author_title,
      worksFor: { "@type": "Organization", name: "Alpha Agent", url: "https://alphaagent.io" },
    },
    publisher: {
      "@type": "Organization",
      name: "Alpha Agent",
      url: "https://alphaagent.io",
      logo: { "@type": "ImageObject", url: "https://alphaagent.io/images/alpha-agent-logo.png" },
    },
    mainEntityOfPage: `https://alphaagent.io/blog/${post.slug}`,
    ...(post.featured_image ? { image: post.featured_image } : {}),
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title} | Alpha Agent Blog</title>
        <meta name="description" content={post.meta_description} />
        {post.meta_keywords && <meta name="keywords" content={post.meta_keywords} />}
        <link rel="canonical" href={`https://alphaagent.io/blog/${post.slug}`} />
        <meta property="og:title" content={`${post.title} | Alpha Agent`} />
        <meta property="og:description" content={post.meta_description} />
        <meta property="og:url" content={`https://alphaagent.io/blog/${post.slug}`} />
        <meta property="og:type" content="article" />
        {post.featured_image && <meta property="og:image" content={post.featured_image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.meta_description} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
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

          {/* Featured Image */}
          {post.featured_image && (
            <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-10">
              <img
                src={post.featured_image}
                alt={post.featured_image_alt || post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Header */}
          <header className="mb-12">
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author_name}</span>
                <span className="text-muted-foreground/50">{post.author_title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.published_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.read_time}</span>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-foreground [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-foreground [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:text-muted-foreground [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:text-muted-foreground [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:mb-2 [&>ol]:text-muted-foreground [&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol>li]:mb-2 [&_strong]:text-foreground [&>table]:w-full [&>table]:border-collapse [&>table_th]:text-left [&>table_th]:py-2 [&>table_th]:px-4 [&>table_th]:border-b [&>table_th]:border-white/10 [&>table_td]:py-2 [&>table_td]:px-4 [&>table_td]:border-b [&>table_td]:border-white/5 [&>table_td]:text-muted-foreground [&>blockquote]:border-l-4 [&>blockquote]:border-primary/50 [&>blockquote]:pl-6 [&>blockquote]:italic [&>blockquote]:text-muted-foreground/80">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </div>

          {/* Author Box */}
          <div className="mt-16 glass-card p-6 flex items-start gap-4">
            {post.author_image ? (
              <img src={post.author_image} alt={post.author_name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">{post.author_name}</p>
              <p className="text-sm text-muted-foreground mb-2">{post.author_title} at Alpha Agent</p>
              <p className="text-sm text-muted-foreground/70">
                Working directly with 520+ IUL agents every day, Sierra shares the strategies,
                insights, and real-world lessons that help professionals sell more and scale faster.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 p-8 glass-card text-center">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Ready to Run on the IUL Agent OS?
            </h3>
            <p className="text-muted-foreground mb-6">
              See how Alpha Agent's complete operating system can transform your IUL practice.
            </p>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/book-call">BOOK A STRATEGY CALL</Link>
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
