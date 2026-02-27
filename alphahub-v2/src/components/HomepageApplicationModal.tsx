import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, ArrowLeft, Loader2, Calculator, Sparkles,
  CheckCircle2, AlertCircle, CreditCard, Clock, Target
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useCalculator, formatCurrency } from "@/contexts/CalculatorContext";
import { supabase } from "@/integrations/supabase/client";
import { getAttributionData, getVisitorId, trackFormStart, trackFormAbandonment } from "@/lib/tracking";

// CRM Field Options - EXACT VALUES
const LICENSED_STATUS_OPTIONS = [
  { value: "Licensed", label: "Licensed" },
  { value: "Needs to Reactivate", label: "Needs to Reactivate" },
  { value: "Not licensed", label: "Not licensed" },
  { value: "Unknown", label: "Unknown / Not sure" },
];

const MONTHLY_BUDGET_OPTIONS = [
  { value: "<$1,499", label: "Less than $1,499/mo" },
  { value: "$1,500–$2,399", label: "$1,500 – $2,399/mo" },
  { value: "$2,400–$2,999", label: "$2,400 – $2,999/mo" },
  { value: "$3,000+", label: "$3,000+/mo" },
];

const PAYMENT_PLAN_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "Not Sure", label: "Not Sure" },
];

const TIMELINE_OPTIONS = [
  { value: "Immediately", label: "Immediately" },
  { value: "Within 7 days", label: "Within 7 days" },
  { value: "Within 30 days", label: "Within 30 days" },
  { value: "30–60 days", label: "30–60 days" },
  { value: "Later/unsure", label: "Later/unsure" },
];

const BOTTLENECK_OPTIONS = [
  { value: "Not enough leads (volume)", label: "Not enough leads (volume)" },
  { value: "Lead quality is low", label: "Lead quality is low" },
  { value: "Inconsistent lead flow", label: "Inconsistent lead flow" },
  { value: "Slow speed-to-lead / follow-up", label: "Slow speed-to-lead / follow-up" },
  { value: "Low contact rate (they don’t answer)", label: "Low contact rate (they don’t answer)" },
  { value: "Low appointment show rate", label: "Low appointment show rate" },
  { value: "Closing/conversion is the bottleneck", label: "Closing/conversion is the bottleneck" },
  { value: "CRM / tracking is messy", label: "CRM / tracking is messy" },
  { value: "Other", label: "Other" },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

interface HomepageApplicationProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "calculator" | "contact" | "licensed" | "states" | "budget" | "payment_plan_interest" | "payment_plan_credit" | "timeline" | "bottleneck";

const STEP_ORDER: Step[] = ["calculator", "contact", "licensed", "states", "budget", "timeline", "bottleneck"];

export default function HomepageApplication({ isOpen, onClose }: HomepageApplicationProps) {
  const navigate = useNavigate();
  const { inputs, results } = useCalculator();
  const [step, setStep] = useState<Step>("calculator");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const formStartedRef = useRef(false);
  const formSubmittedRef = useRef(false);

  // Form data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    licensedStatus: "",
    statesLicensed: [] as string[],
    monthlyBudgetRange: "",
    paymentPlanInterest: "",
    paymentPlanCreditAvailable: "",
    desiredTimeline: "",
    currentBottleneck: "",
  });

  // Track if calculator was changed
  const [calculatorChanged, setCalculatorChanged] = useState(false);
  const initialInputsRef = useRef(inputs);

  useEffect(() => {
    if (JSON.stringify(inputs) !== JSON.stringify(initialInputsRef.current)) {
      setCalculatorChanged(true);
    }
  }, [inputs]);

  // Track form start and abandonment
  useEffect(() => {
    if (isOpen && !formStartedRef.current) {
      formStartedRef.current = true;
      formSubmittedRef.current = false;
      trackFormStart("homepage-application-v2");
    }

    if (!isOpen && formStartedRef.current && !formSubmittedRef.current) {
      const completedFields = Object.entries(formData)
        .filter(([_, value]) => value && (Array.isArray(value) ? value.length > 0 : true))
        .map(([key]) => key);
      trackFormAbandonment("homepage-application-v2", completedFields);
      formStartedRef.current = false;
    }
  }, [isOpen, formData]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep("calculator");
      setProspectId(null);
    }
  }, [isOpen]);

  const updateField = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleState = (state: string) => {
    setFormData(prev => ({
      ...prev,
      statesLicensed: prev.statesLicensed.includes(state)
        ? prev.statesLicensed.filter(s => s !== state)
        : [...prev.statesLicensed, state],
    }));
  };

  // Get current step index
  const getCurrentStepIndex = () => {
    let currentOrder = [...STEP_ORDER];
    // Insert payment plan steps if needed
    if (formData.monthlyBudgetRange === "$1,500–$2,399") {
      const budgetIndex = currentOrder.indexOf("budget");
      currentOrder.splice(budgetIndex + 1, 0, "payment_plan_interest", "payment_plan_credit");
    }
    return currentOrder.indexOf(step);
  };

  const getTotalSteps = () => {
    let total = STEP_ORDER.length;
    if (formData.monthlyBudgetRange === "$1,500–$2,399") {
      total += 2; // Payment plan questions
    }
    return total;
  };

  // Calculate qualified path based on current data
  const calculateQualifiedPath = (): string => {
    if (formData.licensedStatus === "Not licensed" || formData.licensedStatus === "Unknown") {
      return "Disqualified (license)";
    }
    if (formData.monthlyBudgetRange === "<$1,499") {
      return "Disqualified (budget)";
    }
    if (formData.monthlyBudgetRange === "$1,500–$2,399") {
      if (formData.paymentPlanInterest === "No" || formData.paymentPlanInterest === "Not Sure") {
        return "Disqualified (budget)";
      }
      return "Qualified (payment plan)";
    }
    return "Qualified (standard)";
  };

  // Build calculator notes
  const buildCalculatorNotes = (): string | null => {
    if (!calculatorChanged) return null;
    return `CALCULATOR NOTES (homepage)
Leads/month: ${inputs.leadsPerMonth}
Cost/lead: $${inputs.costPerLead}
Submit rate: ${inputs.submitRate}%
Issued/Paid rate: ${inputs.issuedPaidRate}%
Target premium: $${inputs.targetPremium}
Commission rate: ${inputs.commissionRate}%`;
  };

  // Handle contact capture (Webhook #0)
  const handleContactCapture = async () => {
    const attribution = getAttributionData();
    
    try {
      const { data, error } = await supabase.functions.invoke("prospect-contact-capture", {
        body: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          visitor_id: attribution.visitor_id,
          referral_code: attribution.referral_code,
          source_page: window.location.pathname,
          first_touch: attribution.first_touch,
          last_touch: attribution.last_touch,
          calculator_changed: calculatorChanged,
          calculator_inputs: calculatorChanged ? inputs : undefined,
        },
      });

      if (error) {
        console.error("[Contact Capture] Error:", error);
        toast({ title: "Error", description: "Failed to save contact info", variant: "destructive" });
        return false;
      }

      if (data?.prospect_id) {
        setProspectId(data.prospect_id);
        console.log("[Contact Capture] Prospect ID:", data.prospect_id);
      }
      return true;
    } catch (err) {
      console.error("[Contact Capture] Exception:", err);
      return false;
    }
  };

  // Handle qualification submit (Webhook #1)
  const handleQualificationSubmit = async () => {
    const attribution = getAttributionData();
    const qualifiedPath = calculateQualifiedPath();

    try {
      const { data, error } = await supabase.functions.invoke("prospect-qualification-submit", {
        body: {
          prospect_id: prospectId,
          visitor_id: attribution.visitor_id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          licensed_status: formData.licensedStatus,
          states_licensed: formData.statesLicensed,
          monthly_budget_range: formData.monthlyBudgetRange,
          payment_plan_interest: formData.paymentPlanInterest || undefined,
          payment_plan_credit_available: formData.paymentPlanCreditAvailable || undefined,
          qualified_path: qualifiedPath,
          desired_timeline: formData.desiredTimeline,
          current_bottleneck: formData.currentBottleneck,
          calculator_notes: buildCalculatorNotes(),
          calculator_changed: calculatorChanged,
          calculator_inputs: calculatorChanged ? inputs : undefined,
          referral_code: attribution.referral_code,
          first_touch: attribution.first_touch,
          last_touch: attribution.last_touch,
          source_page: window.location.pathname,
        },
      });

      if (error) {
        console.error("[Qualification Submit] Error:", error);
        return { success: false, route_to: "/" };
      }

      return { 
        success: true, 
        route_to: data?.route_to || "/book-call",
        qualified_path: data?.qualified_path || qualifiedPath,
      };
    } catch (err) {
      console.error("[Qualification Submit] Exception:", err);
      return { success: false, route_to: "/" };
    }
  };

  // Navigation
  const nextStep = async () => {
    // After contact step, fire Webhook #0
    if (step === "contact") {
      const success = await handleContactCapture();
      if (!success) return;
    }

    // Check for disqualification at licensed step
    if (step === "licensed") {
      if (formData.licensedStatus === "Not licensed" || formData.licensedStatus === "Unknown") {
        // Still submit qualification but route to disqual page
        setIsSubmitting(true);
        formSubmittedRef.current = true;
        const result = await handleQualificationSubmit();
        setIsSubmitting(false);
        onClose();
        navigate(result.route_to);
        return;
      }
    }

    // Check for disqualification at budget step
    if (step === "budget") {
      if (formData.monthlyBudgetRange === "<$1,499") {
        setIsSubmitting(true);
        formSubmittedRef.current = true;
        const result = await handleQualificationSubmit();
        setIsSubmitting(false);
        onClose();
        navigate(result.route_to);
        return;
      }
      // If payment plan lane needed
      if (formData.monthlyBudgetRange === "$1,500–$2,399") {
        setStep("payment_plan_interest");
        return;
      }
    }

    // Check payment plan interest
    if (step === "payment_plan_interest") {
      if (formData.paymentPlanInterest === "No" || formData.paymentPlanInterest === "Not sure") {
        setIsSubmitting(true);
        formSubmittedRef.current = true;
        const result = await handleQualificationSubmit();
        setIsSubmitting(false);
        onClose();
        navigate(result.route_to);
        return;
      }
      setStep("payment_plan_credit");
      return;
    }

    if (step === "payment_plan_credit") {
      setStep("timeline");
      return;
    }

    // Move to next step in order
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    if (step === "payment_plan_interest") {
      setStep("budget");
      return;
    }
    if (step === "payment_plan_credit") {
      setStep("payment_plan_interest");
      return;
    }

    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  // Final submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    formSubmittedRef.current = true;

    const result = await handleQualificationSubmit();
    
    // Store data for booking page
    const attribution = getAttributionData();
    localStorage.setItem("submissionData", JSON.stringify({
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      phone: formData.phone,
      targetStates: formData.statesLicensed,
      monthlyProfitDifference: results.monthlyProfitDifference,
      annualProfitDifference: results.annualProfitDifference,
      cpaSavings: results.cpaSavings,
      cpaPercentDecrease: results.cpaPercentDecrease,
      visitorId: attribution.visitor_id,
    }));

    setIsSubmitting(false);
    onClose();

    toast({
      title: result.success ? "Application Received!" : "Error",
      description: result.success 
        ? "Redirecting you to book your strategy call..." 
        : "There was an issue. Please try again.",
    });

    setTimeout(() => {
      navigate(result.route_to);
    }, 800);
  };

  // Validation for each step
  const isStepValid = () => {
    switch (step) {
      case "calculator":
        return true;
      case "contact":
        return formData.firstName && formData.email && formData.phone;
      case "licensed":
        return !!formData.licensedStatus;
      case "states":
        return formData.statesLicensed.length > 0;
      case "budget":
        return !!formData.monthlyBudgetRange;
      case "payment_plan_interest":
        return !!formData.paymentPlanInterest;
      case "payment_plan_credit":
        return !!formData.paymentPlanCreditAvailable;
      case "timeline":
        return !!formData.desiredTimeline;
      case "bottleneck":
        return !!formData.currentBottleneck;
      default:
        return false;
    }
  };

  const isLastStep = step === "bottleneck";

  const renderStep = () => {
    switch (step) {
      case "calculator":
        return (
          <motion.div
            key="calculator"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-5 h-5 text-primary" />
                <span className="font-bold text-primary">Your Projected Results</span>
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-background/60 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Monthly Increase</p>
                  <p className="text-xl font-black glow-text">+{formatCurrency(results.monthlyProfitDifference)}</p>
                </div>
                <div className="text-center p-3 bg-background/60 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">CPA Savings</p>
                  <p className="text-xl font-black glow-text">{formatCurrency(results.cpaSavings)}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Let's see if we can help you achieve these results
            </p>
          </motion.div>
        );

      case "contact":
        return (
          <motion.div
            key="contact"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">First Name *</label>
                <Input
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Last Name</label>
                <Input
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email *</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone *</label>
              <Input
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
          </motion.div>
        );

      case "licensed":
        return (
          <motion.div
            key="licensed"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-center text-muted-foreground">
              Are you currently licensed to sell life insurance?
            </p>
            <div className="space-y-2">
              {LICENSED_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField("licensedStatus", option.value)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    formData.licensedStatus === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.licensedStatus === option.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}>
                      {formData.licensedStatus === option.value && (
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                    <span className="font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case "states":
        return (
          <motion.div
            key="states"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-center text-muted-foreground">
              Select the states you're licensed in
            </p>
            <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto p-2">
              {US_STATES.map((state) => (
                <button
                  key={state}
                  onClick={() => toggleState(state)}
                  className={`p-2 rounded-lg border text-center font-medium transition-all ${
                    formData.statesLicensed.includes(state)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
            {formData.statesLicensed.length > 0 && (
              <p className="text-sm text-center text-primary">
                Selected: {formData.statesLicensed.join(", ")}
              </p>
            )}
          </motion.div>
        );

      case "budget":
        return (
          <motion.div
            key="budget"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-center text-muted-foreground">
              What's your monthly budget for lead generation?
            </p>
            <div className="space-y-2">
              {MONTHLY_BUDGET_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField("monthlyBudgetRange", option.value)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    formData.monthlyBudgetRange === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.monthlyBudgetRange === option.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}>
                      {formData.monthlyBudgetRange === option.value && (
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                    <span className="font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case "payment_plan_interest":
        return (
          <motion.div
            key="payment_plan_interest"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="font-bold text-primary">Payment Plan Option</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Our packages start at $2,500/month. We can sometimes make this work with payment plans 
                (management fee split over 6–12 months). If we can structure it so your monthly payment 
                is around $1,500, would you move forward?
              </p>
            </div>
            <div className="space-y-2">
              {PAYMENT_PLAN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField("paymentPlanInterest", option.value)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    formData.paymentPlanInterest === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.paymentPlanInterest === option.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}>
                      {formData.paymentPlanInterest === option.value && (
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                    <span className="font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case "payment_plan_credit":
        return (
          <motion.div
            key="payment_plan_credit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="font-bold text-primary">Credit Availability</span>
              </div>
              <p className="text-sm text-muted-foreground">
                To confirm eligibility for payment plans, do you have at least $4,000 available on a credit card?
              </p>
            </div>
            <div className="space-y-2">
              {PAYMENT_PLAN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField("paymentPlanCreditAvailable", option.value)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    formData.paymentPlanCreditAvailable === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.paymentPlanCreditAvailable === option.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}>
                      {formData.paymentPlanCreditAvailable === option.value && (
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                    <span className="font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case "timeline":
        return (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-center text-muted-foreground">
              When are you looking to get started?
            </p>
            <div className="space-y-2">
              {TIMELINE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField("desiredTimeline", option.value)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    formData.desiredTimeline === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case "bottleneck":
        return (
          <motion.div
            key="bottleneck"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-center text-muted-foreground">
              What's your biggest bottleneck right now?
            </p>
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {BOTTLENECK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField("currentBottleneck", option.value)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    formData.currentBottleneck === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "calculator": return "Your Numbers";
      case "contact": return "Contact Info";
      case "licensed": return "License Status";
      case "states": return "States Licensed";
      case "budget": return "Monthly Budget";
      case "payment_plan_interest": return "Payment Options";
      case "payment_plan_credit": return "Credit Check";
      case "timeline": return "Timeline";
      case "bottleneck": return "Your Bottleneck";
      default: return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {getStepTitle()}
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: getTotalSteps() }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= getCurrentStepIndex() ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === "calculator" || isSubmitting}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid() || isSubmitting}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit & Book Call
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!isStepValid() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
