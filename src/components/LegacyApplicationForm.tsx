/**
 * LEGACY APPLICATION FORM - ARCHIVED
 * 
 * This is the original 4-step application form that was used before the 
 * new multi-step qualification flow (HomepageApplication.tsx).
 * 
 * Kept as a template/backup in case needed for reference.
 * 
 * Original flow:
 * 1. Your Numbers - Calculator results + Agent Type
 * 2. Your Goals - Monthly issued/paid, challenges, timeline, states
 * 3. Contact Information - Name, email, phone, referral
 * 4. Review & Submit - Summary of all inputs
 * 
 * This was replaced with HomepageApplication.tsx which includes:
 * - Multi-step qualification with 3 webhooks
 * - qualified_path tracking for CRM follow-up
 * - Conditional payment plan questions
 * - Disqualification routing
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, TrendingUp, DollarSign, Calculator, Sparkles, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { useCalculator, formatCurrency } from "@/contexts/CalculatorContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { WEBHOOK_URL } from "@/config/webhook";
import { supabase } from "@/integrations/supabase/client";
import { getAttributionData, trackFormSubmit, trackFormStart, trackFormAbandonment, trackTerritorySelected } from "@/lib/tracking";

interface LegacyApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const LegacyApplicationForm = ({ isOpen, onClose }: LegacyApplicationFormProps) => {
  const navigate = useNavigate();
  const { inputs, setInputs, results } = useCalculator();
  const { addRealSubmission } = useNotifications();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formStartedRef = useRef(false);
  const formSubmittedRef = useRef(false);
  
  const [formData, setFormData] = useState({
    agentType: "",
    downlineCount: "",
    monthlyIssuedPaid: "",
    biggestChallenge: "",
    timelineToScale: "",
    targetStates: [] as string[],
    name: "",
    email: "",
    phone: "",
    referralSource: "",
  });

  const US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
  ];

  // Track form start and handle abandonment
  useEffect(() => {
    if (isOpen && !formStartedRef.current) {
      formStartedRef.current = true;
      formSubmittedRef.current = false;
      trackFormStart("legacy-application-form");
    }
    
    if (!isOpen && formStartedRef.current && !formSubmittedRef.current) {
      const completedFields = [];
      if (formData.agentType) completedFields.push("agentType");
      if (formData.monthlyIssuedPaid) completedFields.push("monthlyIssuedPaid");
      if (formData.biggestChallenge) completedFields.push("biggestChallenge");
      if (formData.name) completedFields.push("name");
      if (formData.email) completedFields.push("email");
      
      trackFormAbandonment("legacy-application-form", completedFields);
      formStartedRef.current = false;
    }
  }, [isOpen, formData]);

  // Reset step when popup opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleState = (state: string) => {
    setFormData((prev) => {
      const newStates = prev.targetStates.includes(state)
        ? prev.targetStates.filter(s => s !== state)
        : [...prev.targetStates, state];
      
      if (newStates.length > 0) {
        trackTerritorySelected(newStates);
      }
      
      return { ...prev, targetStates: newStates };
    });
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    formSubmittedRef.current = true;
    
    const attribution = getAttributionData();
    const sourcePage = window.location.pathname;
    const referralCode = attribution.referral_code;

    trackFormSubmit("legacy-application-form", { 
      email: formData.email,
      has_attribution: !!attribution.first_touch,
      states_selected: formData.targetStates.length,
      referral_code: referralCode,
    });

    try {
      const prospectId = crypto.randomUUID();

      const { error: prospectError } = await supabase
        .from('prospects')
        .insert({
          id: prospectId,
          visitor_id: attribution.visitor_id,
          email: formData.email.toLowerCase().trim(),
          name: formData.name,
          phone: formData.phone,
          team_size: formData.downlineCount || null,
          monthly_production: formData.monthlyIssuedPaid,
          biggest_challenge: formData.biggestChallenge,
          timeline_to_scale: formData.timelineToScale,
          additional_info: JSON.stringify({
            agentType: formData.agentType,
            targetStates: formData.targetStates,
            referralSource: formData.referralSource,
            calculatorInputs: inputs,
            calculatorResults: results,
          }),
          source_page: sourcePage,
          status: 'applied',
          referral_code: referralCode,
          next_action_type: 'call_to_qualify',
          next_action_due_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        } as any);

      if (prospectError) {
        console.error("[Prospect] Failed to save:", prospectError);
      } else {
        const firstTouch = attribution.first_touch;
        const lastTouch = attribution.last_touch;

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
            referral_code: referralCode,
          });

        if (attrError) {
          console.error("[Attribution] Failed to save:", attrError);
        }
      }

      const payload = {
        formData: {
          ...formData,
          leadsPerMonth: inputs.leadsPerMonth,
          costPerLead: inputs.costPerLead,
          submitRate: inputs.submitRate,
          issuedPaidRate: inputs.issuedPaidRate,
          targetPremium: inputs.targetPremium,
          commissionRate: inputs.commissionRate,
        },
        calculatorInputs: inputs,
        calculatedResults: results,
        attribution: attribution,
        submittedAt: new Date().toISOString(),
      };

      localStorage.setItem("submissionData", JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        biggestChallenge: formData.biggestChallenge,
        targetStates: formData.targetStates,
        monthlyProfitDifference: results.monthlyProfitDifference,
        annualProfitDifference: results.annualProfitDifference,
        cpaSavings: results.cpaSavings,
        cpaPercentDecrease: results.cpaPercentDecrease,
        leadsPerMonth: inputs.leadsPerMonth,
        costPerLead: inputs.costPerLead,
        visitorId: attribution.visitor_id,
      }));

      if (WEBHOOK_URL) {
        try {
          const { error } = await supabase.functions.invoke('submit-webhook', {
            body: { webhookUrl: WEBHOOK_URL, payload },
          });
          if (error) {
            console.error("Webhook error:", error);
          }
        } catch (error) {
          console.error("Webhook error:", error);
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }

    const firstName = formData.name.split(" ")[0];
    const lastName = formData.name.split(" ")[1] || "";
    const displayName = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;
    addRealSubmission(
      displayName,
      formData.targetStates,
      formData.downlineCount ? parseInt(formData.downlineCount) : undefined,
      formData.monthlyIssuedPaid
    );

    setIsSubmitting(false);
    onClose();
    setStep(1);
    setFormData({ 
      agentType: "", downlineCount: "", 
      monthlyIssuedPaid: "", biggestChallenge: "", timelineToScale: "",
      targetStates: [],
      name: "", email: "", phone: "", referralSource: ""
    });
    
    toast({
      title: "Application Received!",
      description: "Redirecting you to book your strategy call...",
    });

    setTimeout(() => {
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const additionalInfo = [
        `Agent Type: ${formData.agentType}`,
        formData.downlineCount ? `Downline Count: ${formData.downlineCount}` : null,
        `Monthly Production: ${formData.monthlyIssuedPaid}`,
        `Biggest Challenge: ${formData.biggestChallenge}`,
        `Timeline to Scale: ${formData.timelineToScale}`,
        `Target States: ${formData.targetStates.join(', ')}`,
        formData.referralSource ? `Referral Source: ${formData.referralSource}` : null,
      ].filter(Boolean).join('\n');
      
      const params = new URLSearchParams({
        firstName: firstName,
        lastName: lastName,
        phone: formData.phone,
        email: formData.email,
        additionalInfo: additionalInfo,
      });
      
      navigate(`/book-call?${params.toString()}`);
    }, 1000);
  };

  const isStep1Valid = formData.agentType;
  const isStep2Valid = formData.monthlyIssuedPaid && formData.biggestChallenge && formData.timelineToScale;
  const isStep3Valid = formData.name && formData.email && formData.phone;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? undefined : onClose()}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {step === 1 && "Your Numbers"}
            {step === 2 && "Your Goals"}
            {step === 3 && "Contact Information"}
            {step === 4 && "Your Projected Results"}
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Calculator Values Hero */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-primary" />
                  <span className="font-bold text-primary">Your Calculator Results</span>
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-background/60 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Potential Commission Increase</p>
                    <p className="text-2xl font-black glow-text">
                      +{formatCurrency(results.monthlyProfitDifference)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-background/60 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Cost Per App Savings</p>
                    <p className="text-2xl font-black glow-text">
                      {formatCurrency(results.cpaSavings)}
                    </p>
                    <p className="text-xs text-primary">{results.cpaPercentDecrease}% reduction</p>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Customize your numbers below to refine your results
                </p>
              </div>

              {/* Editable Calculator Inputs */}
              <div className="space-y-5 p-4 rounded-xl bg-secondary/30 border border-border">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Leads Per Month</label>
                    <span className="text-lg font-bold text-primary">{inputs.leadsPerMonth}</span>
                  </div>
                  <Slider
                    value={[inputs.leadsPerMonth]}
                    onValueChange={(value) => setInputs(prev => ({ ...prev, leadsPerMonth: value[0] }))}
                    min={0}
                    max={500}
                    step={25}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span>
                    <span>500</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Cost Per Lead</label>
                    <span className="text-lg font-bold text-primary">${inputs.costPerLead}</span>
                  </div>
                  <Slider
                    value={[inputs.costPerLead]}
                    onValueChange={(value) => setInputs(prev => ({ ...prev, costPerLead: value[0] }))}
                    min={15}
                    max={150}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$15</span>
                    <span>$150</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Your Submit Rate</label>
                    <span className="text-lg font-bold text-primary">{inputs.submitRate}%</span>
                  </div>
                  <Slider
                    value={[inputs.submitRate]}
                    onValueChange={(value) => setInputs(prev => ({ ...prev, submitRate: value[0] }))}
                    min={1}
                    max={15}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1%</span>
                    <span>15%</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Target Premium</label>
                    <span className="text-lg font-bold text-primary">${inputs.targetPremium.toLocaleString()}</span>
                  </div>
                  <Slider
                    value={[inputs.targetPremium]}
                    onValueChange={(value) => setInputs(prev => ({ ...prev, targetPremium: value[0] }))}
                    min={1000}
                    max={10000}
                    step={250}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$1,000</span>
                    <span>$10,000</span>
                  </div>
                </div>
              </div>

              {/* Agent Type */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Are you a Solo Agent or do you have a Downline?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Solo Agent", "Have Downline"].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleInputChange("agentType", type)}
                      className={`p-4 rounded-xl border-2 transition-all text-center font-medium ${
                        formData.agentType === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Downline Count */}
              {formData.agentType === "Have Downline" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    How many agents in your downline?
                  </label>
                  <Input
                    placeholder="e.g., 5"
                    value={formData.downlineCount}
                    onChange={(e) => handleInputChange("downlineCount", e.target.value)}
                    className="bg-background border-border"
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Monthly Issued/Paid */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  What's your average monthly issued-paid?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["$0-5K", "$5K-15K", "$15K-30K", "$30K-50K", "$50K-100K", "$100K+"].map((range) => (
                    <button
                      key={range}
                      onClick={() => handleInputChange("monthlyIssuedPaid", range)}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        formData.monthlyIssuedPaid === range
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Biggest Challenge */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  What's your biggest challenge right now?
                </label>
                <Textarea
                  placeholder="e.g., Bad lead quality, low conversion rates, inconsistent flow..."
                  value={formData.biggestChallenge}
                  onChange={(e) => handleInputChange("biggestChallenge", e.target.value)}
                  className="bg-background border-border min-h-[80px]"
                />
              </div>

              {/* Timeline to Scale */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  How soon are you looking to scale?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Immediately", "1-2 weeks", "1 month", "Just exploring"].map((timeline) => (
                    <button
                      key={timeline}
                      onClick={() => handleInputChange("timelineToScale", timeline)}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        formData.timelineToScale === timeline
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {timeline}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target States */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Which states do you want seats in?
                </label>
                <p className="text-xs text-muted-foreground mb-3">Select all that apply - tap to toggle</p>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 p-2 rounded-xl bg-secondary/30 border border-border">
                  {US_STATES.map((state) => (
                    <button
                      key={state}
                      type="button"
                      onClick={() => toggleState(state)}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                        formData.targetStates.includes(state)
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,214,50,0.3)]"
                          : "border-border bg-background hover:border-primary/50 text-foreground"
                      }`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
                {formData.targetStates.length > 0 && (
                  <p className="text-xs text-primary mt-2">
                    Selected: {formData.targetStates.join(", ")} ({formData.targetStates.length} states)
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Full Name</label>
                <Input
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Email Address</label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Cell Phone</label>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  How did you hear about us? (Give your upline credit!)
                </label>
                <Input
                  placeholder="Referral name or source"
                  value={formData.referralSource}
                  onChange={(e) => handleInputChange("referralSource", e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Calculator Summary */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-bold text-primary">Your Potential Results</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-background/60 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Monthly Increase</p>
                    <p className="text-2xl font-black glow-text">
                      +{formatCurrency(results.monthlyProfitDifference)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-background/60 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Annual Increase</p>
                    <p className="text-2xl font-black glow-text">
                      +{formatCurrency(results.annualProfitDifference)}
                    </p>
                  </div>
                </div>

                <div className="text-center p-4 bg-background/60 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Cost Per Issued App Savings</p>
                  <p className="text-3xl font-black glow-text">
                    {formatCurrency(results.cpaSavings)}
                  </p>
                  <p className="text-sm text-primary mt-1">
                    {results.cpaPercentDecrease}% reduction
                  </p>
                </div>
              </div>

              {/* Your Inputs Summary */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Your Numbers</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Leads/Month:</span>
                    <span className="font-medium">{inputs.leadsPerMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost/Lead:</span>
                    <span className="font-medium">${inputs.costPerLead}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submit Rate:</span>
                    <span className="font-medium">{inputs.submitRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Premium:</span>
                    <span className="font-medium">${inputs.targetPremium.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Your Info Summary */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Your Information</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{formData.phone}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By submitting, you agree to be contacted about territory availability.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          {step > 1 ? (
            <Button variant="ghost" onClick={prevStep} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={nextStep}
              disabled={
                (step === 1 && !isStep1Valid) ||
                (step === 2 && !isStep2Valid)
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : step === 3 ? (
            <Button
              onClick={nextStep}
              disabled={!isStep3Valid}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              Review & Submit
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LegacyApplicationForm;
