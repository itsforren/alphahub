import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Send, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getAttributionData, trackFormSubmit } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_URL } from "@/config/webhook";

interface PartnerApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const PartnerApplicationForm = ({ isOpen, onClose }: PartnerApplicationFormProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    teamSize: "",
    monthlyProduction: "",
    biggestChallenge: "",
    timelineToScale: "",
    additionalInfo: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get attribution data for tracking
      const attribution = getAttributionData();
      const sourcePage = window.location.pathname;
      
      // BULLETPROOF: Use attribution.referral_code which already checks URL > localStorage > first/last touch
      const referralCode = attribution.referral_code;

      // Track form submission
      trackFormSubmit("partner-application-form", { 
        email: formData.email,
        has_attribution: !!attribution.first_touch,
        referral_code: referralCode,
      });

      // Generate prospect ID client-side to avoid needing .select() after insert
      const prospectId = crypto.randomUUID();

      // 1. Save prospect to local database with referral_code for trigger
      const { error: prospectError } = await supabase
        .from('prospects')
        .insert({
          id: prospectId,
          visitor_id: attribution.visitor_id,
          email: formData.email.toLowerCase().trim(),
          name: formData.name,
          phone: formData.phone,
          team_size: formData.teamSize,
          monthly_production: formData.monthlyProduction,
          biggest_challenge: formData.biggestChallenge,
          timeline_to_scale: formData.timelineToScale,
          additional_info: formData.additionalInfo,
          source_page: sourcePage,
          status: 'applied',
          referral_code: referralCode, // CRITICAL: Pass referral code directly to trigger
          // Default next action for new prospects
          next_action_type: 'call_to_qualify',
          next_action_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        } as any);

      if (prospectError) {
        console.error("[Prospect] Failed to save:", prospectError);
      } else {
        // 2. Save prospect attribution data
        const firstTouch = attribution.first_touch;
        const lastTouch = attribution.last_touch;

        // Calculate time to conversion if we have first touch
        let timeToConversionHours: number | null = null;
        if (firstTouch?.timestamp) {
          const firstTouchTime = new Date(firstTouch.timestamp).getTime();
          const nowTime = Date.now();
          timeToConversionHours = Math.round((nowTime - firstTouchTime) / (1000 * 60 * 60) * 10) / 10;
        }

        const { error: attrError } = await supabase
          .from('prospect_attribution')
          .insert({
            prospect_id: prospectId,
            visitor_id: attribution.visitor_id,
            first_touch_source: firstTouch?.source || null,
            first_touch_medium: firstTouch?.medium || null,
            first_touch_campaign: firstTouch?.campaign || null,
            first_touch_content: firstTouch?.content || null,
            first_touch_term: firstTouch?.term || null,
            first_touch_gclid: firstTouch?.gclid || null,
            first_touch_fbclid: firstTouch?.fbclid || null,
            first_touch_referrer: firstTouch?.referrer || null,
            first_touch_landing_page: firstTouch?.landing_page || null,
            first_touch_at: firstTouch?.timestamp ? new Date(firstTouch.timestamp).toISOString() : null,
            last_touch_source: lastTouch?.source || null,
            last_touch_medium: lastTouch?.medium || null,
            last_touch_campaign: lastTouch?.campaign || null,
            last_touch_content: lastTouch?.content || null,
            last_touch_term: lastTouch?.term || null,
            last_touch_gclid: lastTouch?.gclid || null,
            last_touch_fbclid: lastTouch?.fbclid || null,
            last_touch_referrer: lastTouch?.referrer || null,
            last_touch_landing_page: lastTouch?.landing_page || null,
            last_touch_at: lastTouch?.timestamp ? new Date(lastTouch.timestamp).toISOString() : null,
            time_to_conversion_hours: timeToConversionHours,
            referral_code: referralCode, // Use the bulletproof referral code
          });

        if (attrError) {
          console.error("[Attribution] Failed to save:", attrError);
        }
      }

      // 3. Build payload for external webhook (GHL)
      const payload = {
        formData: {
          ...formData,
          formType: "partner_application",
        },
        attribution: attribution,
        submittedAt: new Date().toISOString(),
      };

      // 4. Send to external webhook via edge function if configured
      if (WEBHOOK_URL) {
        try {
          await supabase.functions.invoke('submit-webhook', {
            body: { webhookUrl: WEBHOOK_URL, payload },
          });
        } catch (error) {
          console.error("Webhook error:", error);
        }
      }

      toast({
        title: "Application Submitted!",
        description: "Redirecting you to schedule your strategy call...",
      });

      onClose();
      setFormData({
        name: "",
        email: "",
        phone: "",
        teamSize: "",
        monthlyProduction: "",
        biggestChallenge: "",
        timelineToScale: "",
        additionalInfo: "",
      });
      
      // Redirect to partner calendar page
      navigate("/book-partner-call");
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "There was an issue submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto glass-card p-6 md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <>
            <>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Partner Application</h3>
                <p className="text-muted-foreground text-sm">
                  Tell us about your agency and team
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team Size *</Label>
                  <Select
                    value={formData.teamSize}
                    onValueChange={(value) => handleChange("teamSize", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1-5 agents</SelectItem>
                      <SelectItem value="6-15">6-15 agents</SelectItem>
                      <SelectItem value="16-30">16-30 agents</SelectItem>
                      <SelectItem value="31-50">31-50 agents</SelectItem>
                      <SelectItem value="50+">50+ agents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyProduction">Monthly Team Production *</Label>
                  <Select
                    value={formData.monthlyProduction}
                    onValueChange={(value) => handleChange("monthlyProduction", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select monthly production" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-50k">Under $50k</SelectItem>
                      <SelectItem value="50k-100k">$50k - $100k</SelectItem>
                      <SelectItem value="100k-250k">$100k - $250k</SelectItem>
                      <SelectItem value="250k-500k">$250k - $500k</SelectItem>
                      <SelectItem value="500k+">$500k+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="biggestChallenge">Biggest Challenge With Your Agents *</Label>
                  <Select
                    value={formData.biggestChallenge}
                    onValueChange={(value) => handleChange("biggestChallenge", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select biggest challenge" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead-quality">Lead quality issues</SelectItem>
                      <SelectItem value="lead-cost">High cost per lead</SelectItem>
                      <SelectItem value="inconsistent-production">Inconsistent production</SelectItem>
                      <SelectItem value="agent-retention">Agent retention</SelectItem>
                      <SelectItem value="vendor-churn">Vendor churn / frustration</SelectItem>
                      <SelectItem value="scaling">Difficulty scaling</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timelineToScale">Timeline to Scale *</Label>
                  <Select
                    value={formData.timelineToScale}
                    onValueChange={(value) => handleChange("timelineToScale", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="When do you want to scale?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediately">Immediately</SelectItem>
                      <SelectItem value="1-3-months">1-3 months</SelectItem>
                      <SelectItem value="3-6-months">3-6 months</SelectItem>
                      <SelectItem value="6-12-months">6-12 months</SelectItem>
                      <SelectItem value="just-exploring">Just exploring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Anything else we should know?</Label>
                  <Textarea
                    id="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => handleChange("additionalInfo", e.target.value)}
                    placeholder="Tell us more about your goals..."
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  This partnership is selective. We only work with agency leaders who want to elevate their team's production.
                </p>
              </form>
            </>
          </>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PartnerApplicationForm;
