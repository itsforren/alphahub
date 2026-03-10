import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Quote, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import nfiaLogo from "@/assets/nfia-logo.png";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  image_url: string | null;
  quote: string;
  stats_badge: string;
}

const fallbackTestimonials = [
  {
    id: "1",
    name: "Marcus Chen",
    role: "Solo Producer, CA",
    image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    quote: "Went from 2% app submit rate to 18% in 60 days. The filtering alone changed everything.",
    stats_badge: "$847K submitted premium in Q1",
  },
  {
    id: "2",
    name: "Sarah Williams",
    role: "Agency Owner, TX",
    image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    quote: "I was burning through $5K/month on shared leads. Now I spend $3K and submit 4x more apps.",
    stats_badge: "12 agents scaled to Alpha",
  },
  {
    id: "3",
    name: "David Thompson",
    role: "Top Producer, FL",
    image_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    quote: "Finally, a system where MY brand is front and center. Clients come in pre-sold.",
    stats_badge: "$1.2M submitted in 6 months",
  },
  {
    id: "4",
    name: "Jennifer Martinez",
    role: "Agency Owner, AZ",
    image_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    quote: "The cost per submitted app dropped from $380 to $95. Math doesn't lie.",
    stats_badge: "380% ROI increase",
  },
  {
    id: "5",
    name: "Robert Kim",
    role: "Solo Producer, NY",
    image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    quote: "No more chasing 100 trash leads. 25 quality prospects, 8 apps submitted. Every. Single. Month.",
    stats_badge: "32% close rate achieved",
  },
  {
    id: "6",
    name: "Angela Davis",
    role: "Top Producer, GA",
    image_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
    quote: "I've been with Alpha for 3 years now. My cost per app has dropped every single quarter.",
    stats_badge: "$2.1M lifetime premium",
  },
  {
    id: "7",
    name: "Michael Torres",
    role: "Agency Owner, IL",
    image_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
    quote: "Plugged my entire team of 8 agents into the system. Override growth has been insane.",
    stats_badge: "8 agents, 47% avg increase",
  },
];

const TestimonialCarousel = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    const { data, error } = await supabase
      .from("testimonials")
      .select("id, name, role, image_url, quote, stats_badge")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (!error && data && data.length > 0) {
      setTestimonials(data);
    }
    // If no data or error, keep using fallback
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const navigate = (dir: number) => {
    setDirection(dir);
    setActiveIndex((prev) => {
      if (dir === 1) return (prev + 1) % testimonials.length;
      return prev === 0 ? testimonials.length - 1 : prev - 1;
    });
  };

  const getCardStyle = (index: number) => {
    const diff = index - activeIndex;
    const normalizedDiff = ((diff + testimonials.length) % testimonials.length);
    const adjustedDiff = normalizedDiff > testimonials.length / 2 ? normalizedDiff - testimonials.length : normalizedDiff;
    
    return {
      zIndex: 10 - Math.abs(adjustedDiff),
      x: adjustedDiff * 120,
      scale: 1 - Math.abs(adjustedDiff) * 0.15,
      rotateY: adjustedDiff * -15,
      opacity: Math.abs(adjustedDiff) > 2 ? 0 : 1 - Math.abs(adjustedDiff) * 0.3,
    };
  };

  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/30 via-transparent to-card/30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            Real Agents. <span className="glow-text">Real Results.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Don't take our word for it. See what happens when agents escape the lead vendor trap.
          </p>
        </motion.div>

        {/* Key stat highlight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="flex justify-center mb-12"
        >
          <div className="inline-flex items-center gap-4 px-6 py-4 glass-card border-primary/30">
            <TrendingDown className="w-6 h-6 text-primary" />
            <div>
              <span className="text-2xl md:text-3xl font-black glow-text">76%</span>
              <span className="text-muted-foreground ml-2">avg drop in cost per application</span>
            </div>
          </div>
        </motion.div>

        {/* 3D Carousel Container */}
        <div className="relative h-[520px] flex items-center justify-center perspective-1000">
          {/* Navigation Buttons */}
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 md:left-8 z-20 w-12 h-12 rounded-full glass-card flex items-center justify-center hover:border-primary/50 transition-all group"
          >
            <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="absolute right-4 md:right-8 z-20 w-12 h-12 rounded-full glass-card flex items-center justify-center hover:border-primary/50 transition-all group"
          >
            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          {/* Cards */}
          <div className="relative w-full max-w-lg h-full flex items-center justify-center" style={{ perspective: "1000px" }}>
            {testimonials.map((testimonial, index) => {
              const style = getCardStyle(index);
              const isActive = index === activeIndex;

              return (
                <motion.div
                  key={testimonial.id}
                  initial={false}
                  animate={{
                    x: style.x,
                    scale: style.scale,
                    rotateY: style.rotateY,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute w-full max-w-md"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div
                    className={`p-8 transition-all duration-500 rounded-xl border bg-[#151515] ${
                      isActive ? "border-primary/50 shadow-glow" : "border-border"
                    }`}
                  >
                    {/* Quote icon */}
                    <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Quote className="w-5 h-5 text-primary" />
                    </div>

                    {/* Stars */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-lg text-foreground mb-6 leading-relaxed">
                      "{testimonial.quote}"
                    </p>

                    {/* Stats badge */}
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-6">
                      <span className="text-sm font-semibold text-primary">{testimonial.stats_badge}</span>
                    </div>

                    {/* Author */}
                    <div className="flex items-center gap-4">
                      <img
                        src={testimonial.image_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"}
                        alt={testimonial.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
                      />
                      <div>
                        <p className="font-bold text-foreground">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > activeIndex ? 1 : -1);
                setActiveIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "w-8 bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        {/* NFIA Partner Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mt-10"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-background/50 border border-primary/30">
            <img src={nfiaLogo} alt="NFIA Logo" className="w-8 h-8 object-contain rounded-full" loading="lazy" decoding="async" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary whitespace-nowrap">Trusted NFIA Partner</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-primary fill-primary" />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Section divider */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
};

export default TestimonialCarousel;