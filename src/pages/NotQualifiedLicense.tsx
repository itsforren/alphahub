import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Bell, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getAttributionData } from "@/lib/tracking";

export default function NotQualifiedLicense() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    const attribution = getAttributionData();

    try {
      const { data: existing } = await supabase
        .from("prospects")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        await supabase
          .from("prospects")
          .update({
            qualified_path: "Disqualified (license)",
            phone: phone || undefined,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", existing.id);
      } else {
        await supabase
          .from("prospects")
          .insert({
            email: email.toLowerCase().trim(),
            phone: phone || undefined,
            visitor_id: attribution.visitor_id || `web_${Date.now()}`,
            referral_code: attribution.referral_code,
            qualified_path: "Disqualified (license)",
            source_page: "/not-qualified-license",
          } as any);
      }

      setIsSubscribed(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you when our licensing program launches.",
      });
    } catch (error) {
      console.error("Waitlist error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-radial opacity-30" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-lg w-full"
      >
        <div className="glass-card p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center"
          >
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </motion.div>

          <h1 className="text-2xl md:text-3xl font-black mb-4">
            License Required
          </h1>
          
          <p className="text-muted-foreground mb-6 leading-relaxed">
            This program is currently only for{" "}
            <span className="text-foreground font-semibold">licensed life insurance agents</span>. 
            We need you to have an active license to deliver leads and ensure compliance.
          </p>

          <div className="p-4 rounded-lg bg-secondary/50 border border-border mb-6">
            <h3 className="font-semibold mb-2">Getting Your License Soon?</h3>
            <p className="text-sm text-muted-foreground">
              Join our waitlist and we'll notify you when you're eligible. We're also working on 
              resources to help new agents get licensed and started.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-6">
            <h3 className="font-semibold text-primary mb-2">Already Licensed?</h3>
            <p className="text-sm text-muted-foreground">
              If you selected the wrong option, you can{" "}
              <Link to="/apply" className="text-primary font-medium hover:underline">
                reapply here →
              </Link>
            </p>
          </div>

          {isSubscribed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-lg bg-primary/10 border border-primary/30"
            >
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-semibold text-primary">You're on the waitlist!</p>
              <p className="text-sm text-muted-foreground">We'll be in touch when you're eligible.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-center h-12"
              />
              <Input
                type="tel"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                className="text-center h-12"
                maxLength={14}
              />
              <Button 
                type="submit" 
                className="w-full gap-2 h-12"
                disabled={isSubmitting}
              >
                <Bell className="w-4 h-4" />
                {isSubmitting ? "Joining..." : "Join Waitlist"}
              </Button>
            </form>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link to="/apply?step=licensed" className="flex-1">
              <Button variant="outline" className="w-full gap-2 h-12">
                <ArrowLeft className="w-4 h-4" />
                Go Back & Change Answer
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button variant="ghost" className="w-full h-12">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
