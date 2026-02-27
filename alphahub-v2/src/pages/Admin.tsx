import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, Upload, Eye, EyeOff, ArrowLeft, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  image_url: string | null;
  quote: string;
  stats_badge: string;
  display_order: number;
  is_active: boolean;
}

interface Screenshot {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  is_active: boolean;
}

const Admin = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [activeTab, setActiveTab] = useState<"testimonials" | "screenshots">("testimonials");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch all testimonials (active and inactive for admin)
    const { data: testimonialsData } = await supabase
      .from("testimonials")
      .select("*")
      .order("display_order", { ascending: true });

    // Fetch all screenshots
    const { data: screenshotsData } = await supabase
      .from("business_screenshots")
      .select("*")
      .order("display_order", { ascending: true });

    if (testimonialsData) setTestimonials(testimonialsData);
    if (screenshotsData) setScreenshots(screenshotsData);
    setLoading(false);
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fileName = `${folder}/${uniqueId}.${fileExt}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(fileName, file);

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }

    const { data } = supabase.storage.from("media").getPublicUrl(fileName);
    return data.publicUrl;
  };

  // Testimonial handlers
  const addTestimonial = () => {
    const newTestimonial: Testimonial = {
      id: `temp-${Date.now()}`,
      name: "",
      role: "",
      image_url: null,
      quote: "",
      stats_badge: "",
      display_order: testimonials.length,
      is_active: true,
    };
    setTestimonials([...testimonials, newTestimonial]);
  };

  const updateTestimonial = (id: string, field: keyof Testimonial, value: any) => {
    setTestimonials(testimonials.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const saveTestimonial = async (testimonial: Testimonial) => {
    const isNew = testimonial.id.startsWith("temp-");
    const { id, ...data } = testimonial;

    if (isNew) {
      const { data: newData, error } = await supabase
        .from("testimonials")
        .insert([data])
        .select()
        .single();

      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
        return;
      }

      setTestimonials(testimonials.map((t) => (t.id === id ? newData : t)));
    } else {
      const { error } = await supabase
        .from("testimonials")
        .update(data)
        .eq("id", id);

      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: "Saved successfully" });
  };

  const deleteTestimonial = async (id: string) => {
    if (id.startsWith("temp-")) {
      setTestimonials(testimonials.filter((t) => t.id !== id));
      return;
    }

    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
      return;
    }

    setTestimonials(testimonials.filter((t) => t.id !== id));
    toast({ title: "Deleted successfully" });
  };

  const handleTestimonialImageUpload = async (id: string, file: File) => {
    const url = await uploadImage(file, "testimonials");
    if (url) {
      updateTestimonial(id, "image_url", url);
    }
  };

  // Screenshot handlers
  const addScreenshot = () => {
    const newScreenshot: Screenshot = {
      id: `temp-${Date.now()}`,
      image_url: "",
      caption: "",
      display_order: screenshots.length,
      is_active: true,
    };
    setScreenshots([...screenshots, newScreenshot]);
  };

  const updateScreenshot = (id: string, field: keyof Screenshot, value: any) => {
    setScreenshots(screenshots.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const saveScreenshot = async (screenshot: Screenshot) => {
    if (!screenshot.image_url) {
      toast({ title: "Please upload an image first", variant: "destructive" });
      return;
    }

    const isNew = screenshot.id.startsWith("temp-");
    const { id, ...data } = screenshot;

    if (isNew) {
      const { data: newData, error } = await supabase
        .from("business_screenshots")
        .insert([data])
        .select()
        .single();

      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
        return;
      }

      setScreenshots(screenshots.map((s) => (s.id === id ? newData : s)));
    } else {
      const { error } = await supabase
        .from("business_screenshots")
        .update(data)
        .eq("id", id);

      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: "Saved successfully" });
  };

  const deleteScreenshot = async (id: string) => {
    if (id.startsWith("temp-")) {
      setScreenshots(screenshots.filter((s) => s.id !== id));
      return;
    }

    const { error } = await supabase.from("business_screenshots").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
      return;
    }

    setScreenshots(screenshots.filter((s) => s.id !== id));
    toast({ title: "Deleted successfully" });
  };

  const handleScreenshotImageUpload = async (id: string, file: File) => {
    const url = await uploadImage(file, "screenshots");
    if (url) {
      updateScreenshot(id, "image_url", url);
    }
  };

  const handleBulkScreenshotUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    const newScreenshots: Screenshot[] = [];
    let currentOrder = screenshots.length;

    for (const file of fileArray) {
      const url = await uploadImage(file, "screenshots");
      if (url) {
        const { data, error } = await supabase
          .from("business_screenshots")
          .insert([{
            image_url: url,
            caption: null,
            display_order: currentOrder,
            is_active: true,
          }])
          .select()
          .single();

        if (!error && data) {
          newScreenshots.push(data);
          currentOrder++;
        }
      }
    }

    if (newScreenshots.length > 0) {
      setScreenshots(prev => [...prev, ...newScreenshots]);
      toast({ title: `${newScreenshots.length} screenshot(s) uploaded successfully` });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-black">Admin Dashboard</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === "testimonials" ? "default" : "outline"}
            onClick={() => setActiveTab("testimonials")}
          >
            Testimonials ({testimonials.length})
          </Button>
          <Button
            variant={activeTab === "screenshots" ? "default" : "outline"}
            onClick={() => setActiveTab("screenshots")}
          >
            Screenshots ({screenshots.length})
          </Button>
        </div>

        {/* Testimonials Tab */}
        {activeTab === "testimonials" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Testimonials</h2>
              <Button onClick={addTestimonial} className="gap-2">
                <Plus className="w-4 h-4" /> Add Testimonial
              </Button>
            </div>

            <div className="grid gap-4">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-xl border border-border bg-card"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="w-5 h-5" />
                      <span className="text-sm font-mono">#{index + 1}</span>
                    </div>

                    <div className="flex-1 grid md:grid-cols-2 gap-4">
                      {/* Left column */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Name</label>
                          <Input
                            value={testimonial.name}
                            onChange={(e) => updateTestimonial(testimonial.id, "name", e.target.value)}
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Role (Title)</label>
                          <Input
                            value={testimonial.role}
                            onChange={(e) => updateTestimonial(testimonial.id, "role", e.target.value)}
                            placeholder="Solo Producer, CA"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Stats Badge (Green Bubble)</label>
                          <Input
                            value={testimonial.stats_badge}
                            onChange={(e) => updateTestimonial(testimonial.id, "stats_badge", e.target.value)}
                            placeholder="$847K submitted premium"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Headshot</label>
                          <div className="flex items-center gap-4">
                            {testimonial.image_url && (
                              <img
                                src={testimonial.image_url}
                                alt={testimonial.name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
                              />
                            )}
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleTestimonialImageUpload(testimonial.id, file);
                                }}
                              />
                              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/50 transition-colors">
                                <Upload className="w-4 h-4" />
                                <span className="text-sm">Upload</span>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Right column */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Quote</label>
                          <Textarea
                            value={testimonial.quote}
                            onChange={(e) => updateTestimonial(testimonial.id, "quote", e.target.value)}
                            placeholder="Their testimonial quote..."
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateTestimonial(testimonial.id, "is_active", !testimonial.is_active)}
                        title={testimonial.is_active ? "Hide" : "Show"}
                      >
                        {testimonial.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="icon"
                        onClick={() => saveTestimonial(testimonial)}
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => deleteTestimonial(testimonial.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Screenshots Tab */}
        {activeTab === "screenshots" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Business Screenshots</h2>
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleBulkScreenshotUpload(files);
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm">
                    <Upload className="w-4 h-4" /> Bulk Upload
                  </div>
                </label>
                <Button onClick={addScreenshot} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Screenshot
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {screenshots.map((screenshot, index) => (
                <motion.div
                  key={screenshot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border border-border bg-card"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-muted-foreground">#{index + 1}</span>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateScreenshot(screenshot.id, "is_active", !screenshot.is_active)}
                        >
                          {screenshot.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="icon"
                          onClick={() => saveScreenshot(screenshot)}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => deleteScreenshot(screenshot.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Image preview/upload */}
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleScreenshotImageUpload(screenshot.id, file);
                        }}
                      />
                      {screenshot.image_url ? (
                        <img
                          src={screenshot.image_url}
                          alt="Screenshot"
                          className="w-full h-40 object-cover rounded-lg border border-border hover:border-primary/50 transition-colors"
                        />
                      ) : (
                        <div className="w-full h-40 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center">
                          <div className="text-center">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Click to upload</span>
                          </div>
                        </div>
                      )}
                    </label>

                    <div>
                      <label className="text-sm text-muted-foreground">Caption (optional)</label>
                      <Input
                        value={screenshot.caption || ""}
                        onChange={(e) => updateScreenshot(screenshot.id, "caption", e.target.value)}
                        placeholder="Description..."
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
