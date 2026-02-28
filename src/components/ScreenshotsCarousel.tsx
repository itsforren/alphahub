import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Screenshot {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
}

const ScreenshotsCarousel = () => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScreenshots();
  }, []);

  const fetchScreenshots = async () => {
    const { data, error } = await supabase
      .from("business_screenshots")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setScreenshots(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (screenshots.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % screenshots.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [screenshots.length]);

  const navigate = (dir: number) => {
    setActiveIndex((prev) => {
      if (dir === 1) return (prev + 1) % screenshots.length;
      return prev === 0 ? screenshots.length - 1 : prev - 1;
    });
  };

  if (loading) {
    return (
      <section className="section-padding bg-background">
        <div className="container-custom text-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </section>
    );
  }

  if (screenshots.length === 0) {
    return null;
  }

  return (
    <section className="section-padding bg-background">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <FileCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Submitted Business</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            Real Apps. <span className="glow-text">Real Submissions.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Screenshots from actual submitted applications using the Alpha system.
          </p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-20 w-10 h-10 rounded-full bg-foreground/10 backdrop-blur-sm flex items-center justify-center hover:bg-foreground/20 transition-all group"
          >
            <ChevronLeft className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-20 w-10 h-10 rounded-full bg-foreground/10 backdrop-blur-sm flex items-center justify-center hover:bg-foreground/20 transition-all group"
          >
            <ChevronRight className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
          </button>

          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <img
              src={screenshots[activeIndex]?.image_url}
              alt={screenshots[activeIndex]?.caption || "Submitted business screenshot"}
              className="w-full h-auto rounded-lg"
            />
            {screenshots[activeIndex]?.caption && (
              <p className="text-muted-foreground text-center mt-4">
                {screenshots[activeIndex].caption}
              </p>
            )}
          </motion.div>

          <div className="flex justify-center gap-2 mt-6">
            {screenshots.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? "w-8 bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScreenshotsCarousel;
