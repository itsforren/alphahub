import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { DollarSign, Bell, ArrowLeft, CheckCircle2, Sparkles, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getAttributionData } from "@/lib/tracking";

export default function NotQualifiedBudget() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const isPaymentPlanRejection = reason === "payment_plan";
  const isCreditRejection = reason === "credit";

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
            qualified_path: "Disqualified (budget)",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", existing.id);
      } else {
        await supabase
          .from("prospects")
          .insert({
            email: email.toLowerCase().trim(),
            visitor_id: attribution.visitor_id || `web_${Date.now()}`,
            referral_code: attribution.referral_code,
            qualified_path: "Disqualified (budget)",
            source_page: "/not-qualified-budget",
          } as any);
      }

      setIsSubscribed(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you when we have options for your budget.",
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
            {isCreditRejection ? (
              <CreditCard className="w-8 h-8 text-yellow-500" />
            ) : (
              <DollarSign className="w-8 h-8 text-yellow-500" />
            )}
          </motion.div>

          <h1 className="text-2xl md:text-3xl font-black mb-4">
            {isCreditRejection 
              ? "Credit Requirement Not Met" 
              : isPaymentPlanRejection 
                ? "Not a Fit Right Now" 
                : "Budget Below Minimum"}
          </h1>
          
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {isCreditRejection ? (
              <>
                <span className="text-foreground font-semibold">Payment plans require at least $4,000 in available credit</span> to qualify. 
                This ensures we can structure a plan that works for both of us.
              </>
            ) : isPaymentPlanRejection ? (
              <>
                We understand timing is everything. Our payment plan option is designed for agents 
                ready to commit today with a lower monthly investment.
              </>
            ) : (
              <>
                Our minimum investment to run consistently is{" "}
                <span className="text-foreground font-bold">$2,500/month</span>{" "}
                (ad spend + management). This ensures enough volume and data to optimize your campaigns effectively.
              </>
            )}
          </p>

          {!isPaymentPlanRejection && !isCreditRejection && (
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-primary">Payment Plan Available</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                If you have $1,500–$2,399/month and available credit, we may be able to structure a payment plan.
                <Link to="/apply" className="text-primary font-medium ml-1 hover:underline">
                  Apply again →
                </Link>
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground">Minimum</p>
              <p className="font-bold">$2,500/mo</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="font-bold">$3,500/mo</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground">Top Agents</p>
              <p className="font-bold">$5,000+/mo</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary/30 border border-border mb-6">
            <h3 className="font-semibold mb-2">Ready When You Are</h3>
            <p className="text-sm text-muted-foreground">
              Join our waitlist and we'll reach out when your situation changes or we have new options available.
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
              <p className="text-sm text-muted-foreground">We'll reach out when we have options for you.</p>
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
            <Link to={isPaymentPlanRejection ? "/apply?step=payment_plan_interest" : "/apply?step=budget"} className="flex-1">
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
