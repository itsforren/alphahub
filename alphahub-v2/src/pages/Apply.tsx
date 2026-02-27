import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, ArrowLeft, Loader2, Calculator, Sparkles,
  CheckCircle2, CreditCard, Clock, Target, Phone, MessageCircleQuestion
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useCalculator, formatCurrency } from "@/contexts/CalculatorContext";
import { supabase } from "@/integrations/supabase/client";
import { getAttributionData, trackFormStart, trackFormAbandonment, getReferrerData } from "@/lib/tracking";
import { CONVERSION_API_KEY } from "@/config/conversion";

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

const MANUAL_SOURCE_OPTIONS = [
  { value: "Facebook Ad", label: "Facebook Ad" },
  { value: "Instagram Ad", label: "Instagram Ad" },
  { value: "Google Search", label: "Google Search" },
  { value: "ChatGPT", label: "ChatGPT" },
  { value: "Agent Referred Me", label: "Agent Referred Me" },
  { value: "Other", label: "Other" },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

type Step = "contact" | "licensed" | "states" | "budget" | "payment_plan_interest" | "payment_plan_credit" | "timeline" | "bottleneck" | "manual_source";

const STEP_ORDER: Step[] = ["contact", "licensed", "states", "budget", "timeline", "bottleneck", "manual_source"];
const ALL_STEPS: Step[] = ["contact", "licensed", "states", "budget", "payment_plan_interest", "payment_plan_credit", "timeline", "bottleneck", "manual_source"];

export default function Apply() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { inputs, results } = useCalculator();
  const [step, setStep] = useState<Step>("contact");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const formStartedRef = useRef(false);
  const formSubmittedRef = useRef(false);
  
  // Handle step query param for "go back" from disqualification pages
  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam && ALL_STEPS.includes(stepParam as Step)) {
      setStep(stepParam as Step);
      // Clear the query param after using it
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
    manualSource: "",
    manualReferrerAgentName: "",
  });

  // Track if calculator was changed (from homepage context)
  const [calculatorChanged, setCalculatorChanged] = useState(false);

  // Track form start
  useEffect(() => {
    if (!formStartedRef.current) {
      formStartedRef.current = true;
      formSubmittedRef.current = false;
      trackFormStart("apply-page-v1");
    }

    // Cleanup for abandonment
    return () => {
      if (formStartedRef.current && !formSubmittedRef.current) {
        const completedFields = Object.entries(formData)
          .filter(([_, value]) => value && (Array.isArray(value) ? value.length > 0 : true))
          .map(([key]) => key);
        trackFormAbandonment("apply-page-v1", completedFields);
      }
    };
  }, []);

  const updateField = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Save partial answer to Supabase for drop-off analytics and recovery
  const savePartialAnswer = async (fieldKey: string, fieldValue: string | string[], currentStep: Step) => {
    if (!prospectId) return;
    
    try {
      const { error } = await supabase
        .from("prospects")
        .update({
          partial_answers: {
            ...formData, // Include all current form data
            [fieldKey]: fieldValue,
            step_reached: currentStep,
          },
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", prospectId);
        
      if (error) {
        console.debug("[Partial Save] Failed:", error);
      } else {
        console.debug("[Partial Save] Saved:", fieldKey, "step:", currentStep);
      }
    } catch (err) {
      console.debug("[Partial Save] Error:", err);
    }
  };

  // Auto-advance for single-select steps + save partial answer
  // Rules:
  // - Budget: never auto-advance
  // - License: auto-advance only for Licensed / Needs to Reactivate
  // - Manual source: never auto-submit / never auto-advance
  const handleSingleSelect = async (field: string, value: string) => {
    // Keep form state consistent when answers change
    if (field === "monthlyBudgetRange") {
      // If they move out of the payment-plan lane, clear payment plan answers
      if (value !== "$1,500–$2,399") {
        setFormData(prev => ({
          ...prev,
          monthlyBudgetRange: value,
          paymentPlanInterest: "",
          paymentPlanCreditAvailable: "",
        }));
      } else {
        setFormData(prev => ({ ...prev, monthlyBudgetRange: value }));
      }
    } else if (field === "manualSource") {
      // Clear referrer agent name unless they picked the referral option
      setFormData(prev => ({
        ...prev,
        manualSource: value,
        manualReferrerAgentName: value === "Agent Referred Me" ? prev.manualReferrerAgentName : "",
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Save partial answer to backend (non-blocking)
    savePartialAnswer(field, value, step);

    // No auto-advance for budget or manual source (must be intentional)
    if (field === "monthlyBudgetRange" || field === "manualSource") return;

    // License only auto-advances for qualifying options
    if (field === "licensedStatus" && value !== "Licensed" && value !== "Needs to Reactivate") return;

    // Payment plan interest only auto-advances for "Yes" (No/Not Sure require Next to DQ)
    if (field === "paymentPlanInterest" && value !== "Yes") return;

    // Small delay for visual feedback before advancing
    setTimeout(() => {
      nextStepFromSelection(field, value);
    }, 300);
  };

  // Navigate to next step based on selection (called from auto-advance)
  const nextStepFromSelection = async (field: string, value: string) => {
    // NOTE: No API calls, no disqualification redirects, and no final submit should happen here.
    // This function is only for allowed auto-advance transitions.
    if (field === "licensedStatus") {
      setStep("states");
      return;
    }

    if (field === "paymentPlanInterest") {
      // Only "Yes" reaches here (others require explicit Next to DQ)
      setStep("payment_plan_credit");
      return;
    }

    if (field === "paymentPlanCreditAvailable") {
      // Credit check no longer disqualifies - just continue
      setStep("timeline");
      return;
    }

    if (field === "desiredTimeline") {
      setStep("bottleneck");
      return;
    }

    if (field === "currentBottleneck") {
      // Move to manual source - the last step
      setStep("manual_source");
      return;
    }

    // manualSource intentionally never auto-advances / auto-submits
  };

  // Toggle state selection + save partial answer
  const toggleState = (state: string) => {
    const newStates = formData.statesLicensed.includes(state)
      ? formData.statesLicensed.filter(s => s !== state)
      : [...formData.statesLicensed, state];
    
    setFormData(prev => ({
      ...prev,
      statesLicensed: newStates,
    }));
    
    // Save partial answer (non-blocking) - will be saved when they click Next
  };

  // Format phone number
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    updateField("phone", formatted);
  };

  // Get current step index for progress
  const getCurrentStepIndex = () => {
    let currentOrder = [...STEP_ORDER];
    if (formData.monthlyBudgetRange === "$1,500–$2,399") {
      const budgetIndex = currentOrder.indexOf("budget");
      currentOrder.splice(budgetIndex + 1, 0, "payment_plan_interest", "payment_plan_credit");
    }
    return currentOrder.indexOf(step);
  };

  const getTotalSteps = () => {
    let total = STEP_ORDER.length;
    if (formData.monthlyBudgetRange === "$1,500–$2,399") {
      total += 2;
    }
    return total;
  };

  // Calculate qualified path
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
      // Credit check no longer disqualifies - we'll help them find the right plan
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

  // Webhook #0 - Contact Capture (returns data for background use)
  const handleContactCapture = async (): Promise<{ prospect_id?: string } | null> => {
    const attribution = getAttributionData();
    const referrerData = getReferrerData();
    // Capture browser timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    try {
      const { data, error } = await supabase.functions.invoke("prospect-contact-capture", {
        body: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          timezone,
          visitor_id: attribution.visitor_id,
          referral_code: attribution.referral_code,
          source_page: "/apply",
          first_touch: attribution.first_touch,
          last_touch: attribution.last_touch,
          calculator_changed: calculatorChanged,
          calculator_inputs: calculatorChanged ? inputs : undefined,
          // Referrer data
          referrer_url: referrerData.referrer_url,
          first_referrer_url: referrerData.first_referrer_url,
        },
      });

      if (error) {
        console.error("[Contact Capture] Background error:", error);
        return null;
      }

      if (data?.prospect_id) {
        console.log("[Contact Capture] Prospect ID:", data.prospect_id);
      }
      return data;
    } catch (err) {
      console.error("[Contact Capture] Background exception:", err);
      return null;
    }
  };

  // Webhook #1 - Qualification Submit
  const handleQualificationSubmit = async () => {
    const attribution = getAttributionData();
    const referrerData = getReferrerData();
    const qualifiedPath = calculateQualifiedPath();

    // Debug logging for attribution
    console.log("[Debug - Attribution]", {
      referrer_url: referrerData.referrer_url,
      first_referrer_url: referrerData.first_referrer_url,
      manual_source: formData.manualSource,
      manual_referrer_agent_name: formData.manualReferrerAgentName,
    });

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
          source_page: "/apply",
          // Referrer data
          referrer_url: referrerData.referrer_url,
          first_referrer_url: referrerData.first_referrer_url,
          // Manual source data
          manual_source: formData.manualSource,
          manual_referrer_agent_name: formData.manualReferrerAgentName || null,
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
    // After contact step, fire Webhook #0 in background (non-blocking)
    if (step === "contact") {
      // Fire API in background - user sees next question immediately
      handleContactCapture().then(result => {
        if (result?.prospect_id) {
          setProspectId(result.prospect_id);
        }
      }).catch(err => {
        console.error("[Contact Capture] Background error:", err);
      });
      // Don't wait - advance immediately
    }

    // Save states to Supabase before advancing (they don't auto-advance)
    if (step === "states" && formData.statesLicensed.length > 0) {
      savePartialAnswer("states_licensed", formData.statesLicensed, step);
    }

    // Check for disqualification at licensed step
    if (step === "licensed") {
      if (formData.licensedStatus === "Not licensed" || formData.licensedStatus === "Unknown") {
        setIsSubmitting(true);
        formSubmittedRef.current = true;
        await handleQualificationSubmit();
        setIsSubmitting(false);
        navigate("/not-qualified-license");
        return;
      }
    }

    // Check for disqualification at budget step
    if (step === "budget") {
      if (formData.monthlyBudgetRange === "<$1,499") {
        setIsSubmitting(true);
        formSubmittedRef.current = true;
        await handleQualificationSubmit();
        setIsSubmitting(false);
        navigate("/not-qualified-budget");
        return;
      }
      if (formData.monthlyBudgetRange === "$1,500–$2,399") {
        setStep("payment_plan_interest");
        return;
      }
    }

    // Check payment plan interest
    if (step === "payment_plan_interest") {
      if (formData.paymentPlanInterest === "No" || formData.paymentPlanInterest === "Not Sure") {
        setIsSubmitting(true);
        formSubmittedRef.current = true;
        await handleQualificationSubmit();
        setIsSubmitting(false);
        navigate("/not-qualified-budget?reason=payment_plan");
        return;
      }
      setStep("payment_plan_credit");
      return;
    }

    // Payment plan credit - no longer disqualifies, just continue
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
    if (step === "contact") {
      navigate("/");
      return;
    }

    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  // Ref guard: fire enhanced conversion only once per submit
  const conversionFiredRef = useRef(false);

  // Final submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    formSubmittedRef.current = true;

    const result = await handleQualificationSubmit();

    // Fire Enhanced Conversion for qualified leads (non-blocking, once only)
    if (
      result.success &&
      result.qualified_path &&
      !result.qualified_path.startsWith('Disqualified') &&
      !conversionFiredRef.current
    ) {
      conversionFiredRef.current = true;
      try {
        const convAttribution = getAttributionData();
        const gclid = convAttribution.first_touch?.gclid || convAttribution.last_touch?.gclid || '';
        supabase.functions.invoke('google-ads-enhanced-conversion', {
          body: {
            conversionType: 'Agent_Lead_API',
            email: formData.email,
            phone: formData.phone,
            firstName: formData.firstName,
            lastName: formData.lastName,
            gclid: gclid || undefined,
          },
          headers: { 'x-api-key': CONVERSION_API_KEY },
        });
        console.log('[Enhanced Conversion] Agent_Lead_API fired');
      } catch (e) {
        console.warn('[Enhanced Conversion] Agent_Lead_API failed:', e);
      }
    }
    
    // Store data for booking page - include ALL qualification answers for GHL calendar
    const attribution = getAttributionData();
    localStorage.setItem("submissionData", JSON.stringify({
      // Contact info (split for GHL)
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      
      // Qualification answers
      licensedStatus: formData.licensedStatus,
      targetStates: formData.statesLicensed,
      monthlyBudgetRange: formData.monthlyBudgetRange,
      paymentPlanInterest: formData.paymentPlanInterest,
      paymentPlanCreditAvailable: formData.paymentPlanCreditAvailable,
      desiredTimeline: formData.desiredTimeline,
      currentBottleneck: formData.currentBottleneck,
      
      // Calculator results
      monthlyProfitDifference: results.monthlyProfitDifference,
      annualProfitDifference: results.annualProfitDifference,
      cpaSavings: results.cpaSavings,
      cpaPercentDecrease: results.cpaPercentDecrease,
      visitorId: attribution.visitor_id,
    }));

    setIsSubmitting(false);

    toast({
      title: result.success ? "Application Received!" : "Error",
      description: result.success 
        ? "Redirecting you to book your strategy call..." 
        : "There was an issue. Please try again.",
    });

    setTimeout(() => {
      // Build URL with contact params for /book-call
      const bookCallParams = new URLSearchParams();
      bookCallParams.set("first_name", formData.firstName);
      if (formData.lastName) bookCallParams.set("last_name", formData.lastName);
      bookCallParams.set("email", formData.email);
      bookCallParams.set("phone", formData.phone);
      
      const destination = result.route_to.includes("/book-call") 
        ? `${result.route_to}?${bookCallParams.toString()}`
        : result.route_to;
      navigate(destination);
    }, 600);
  };

  // Validation
  const isStepValid = () => {
    switch (step) {
      case "contact":
        return formData.firstName && formData.email && formData.phone && formData.phone.length >= 14;
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
      case "manual_source":
        // Must select a source, and if "Agent Referred Me", must provide agent name
        if (!formData.manualSource) return false;
        if (formData.manualSource === "Agent Referred Me" && !formData.manualReferrerAgentName.trim()) return false;
        return true;
      default:
        return false;
    }
  };

  const isLastStep = step === "manual_source";

  const getStepTitle = () => {
    switch (step) {
      case "contact": return "Let's Get Started";
      case "licensed": return "Are You Licensed?";
      case "states": return "Where Are You Licensed?";
      case "budget": return "Monthly Budget";
      case "payment_plan_interest": return "Payment Plan Option";
      case "payment_plan_credit": return "Credit Availability";
      case "timeline": return "When Do You Want to Start?";
      case "bottleneck": return "What's Holding You Back?";
      case "manual_source": return "One Last Thing";
      default: return "";
    }
  };

  const renderStep = () => {
    switch (step) {
      case "contact":
        return (
          <motion.div
            key="contact"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-6"
          >
            <div className="w-full max-w-xl space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-lg font-semibold mb-4 block text-white">First Name *</label>
                  <Input
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="h-16 text-xl bg-card/70 border-border/70 text-white placeholder:text-white/50"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-lg font-semibold mb-4 block text-white">Last Name</label>
                  <Input
                    placeholder="Smith"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="h-16 text-xl bg-card/70 border-border/70 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-lg font-semibold mb-4 block text-white">Email *</label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="h-16 text-xl bg-card/70 border-border/70 text-white placeholder:text-white/50"
                />
              </div>
              <div>
                <label className="text-lg font-semibold mb-4 block text-white">Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white" />
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="h-16 text-xl pl-16 bg-card/70 border-border/70 text-white placeholder:text-white/50"
                    maxLength={14}
                  />
                </div>
                <p className="text-base text-white mt-4">US mobile number (we may text/call reminders)</p>
              </div>
            </div>
          </motion.div>
        );

      case "licensed":
        return (
          <motion.div
            key="licensed"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-6"
          >
            <div className="w-full max-w-xl space-y-8">
              <p className="text-center text-white text-2xl mb-10">
                Are you currently licensed to sell life insurance?
              </p>
              <div className="space-y-5">
                {LICENSED_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSingleSelect("licensedStatus", option.value)}
                    className={`w-full p-7 rounded-2xl border-2 text-left transition-all ${
                      formData.licensedStatus === option.value
                        ? "border-primary bg-primary/15 shadow-[0_0_30px_rgba(0,214,50,0.3)]"
                        : "border-border/50 hover:border-primary/60 bg-card/40 hover:bg-card/60"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        formData.licensedStatus === option.value
                          ? "border-primary bg-primary"
                          : "border-white"
                      }`}>
                        {formData.licensedStatus === option.value && (
                          <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                        )}
                      </div>
                      <span className="font-semibold text-2xl text-white">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case "states":
        return (
          <motion.div
            key="states"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-6"
          >
            <div className="w-full max-w-3xl space-y-8">
              <p className="text-center text-white text-2xl mb-8">
                Select all states you're licensed in
              </p>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 sm:gap-4">
                {US_STATES.map((state) => (
                  <button
                    key={state}
                    onClick={() => toggleState(state)}
                    className={`aspect-square flex items-center justify-center rounded-xl border-2 font-bold text-xl leading-none transition-all ${
                      formData.statesLicensed.includes(state)
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,214,50,0.4)]"
                        : "border-border/50 hover:border-primary/60 bg-card/40 text-white hover:bg-card/60"
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
              {formData.statesLicensed.length > 0 && (
                <p className="text-lg text-center text-primary font-semibold pt-4">
                  Selected: {formData.statesLicensed.join(", ")}
                </p>
              )}
            </div>
          </motion.div>
        );

      case "budget":
        return (
          <motion.div
            key="budget"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-6"
          >
            <div className="w-full max-w-xl space-y-8">
              <p className="text-center text-white text-2xl mb-10">
                Monthly lead-gen budget (ads + management)
              </p>
              <div className="space-y-5">
                {MONTHLY_BUDGET_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSingleSelect("monthlyBudgetRange", option.value)}
                    className={`w-full p-7 rounded-2xl border-2 text-left transition-all ${
                      formData.monthlyBudgetRange === option.value
                        ? "border-primary bg-primary/15 shadow-[0_0_30px_rgba(0,214,50,0.3)]"
                        : "border-border/50 hover:border-primary/60 bg-card/40 hover:bg-card/60"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        formData.monthlyBudgetRange === option.value
                          ? "border-primary bg-primary"
                          : "border-white"
                      }`}>
                        {formData.monthlyBudgetRange === option.value && (
                          <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                        )}
                      </div>
                      <span className="font-semibold text-2xl text-white">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case "payment_plan_interest":
        return (
          <motion.div
            key="payment_plan_interest"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-6"
          >
            <div className="w-full max-w-xl space-y-10">
              <div className="p-8 rounded-3xl bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-4 mb-6">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <span className="font-bold text-2xl text-primary">Payment Plan Available</span>
                </div>
                <p className="text-white text-xl leading-relaxed">
                  Our packages start at $2,500/month. We can sometimes make this work with payment plans 
                  (management fee split over 6–12 months). If we can structure it so your monthly payment 
                  is around $1,500, would you move forward?
                </p>
              </div>
              <div className="space-y-5">
                {PAYMENT_PLAN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSingleSelect("paymentPlanInterest", option.value)}
                    className={`w-full p-7 rounded-2xl border-2 text-left transition-all ${
                      formData.paymentPlanInterest === option.value
                        ? "border-primary bg-primary/15 shadow-[0_0_30px_rgba(0,214,50,0.3)]"
                        : "border-border/50 hover:border-primary/60 bg-card/40 hover:bg-card/60"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        formData.paymentPlanInterest === option.value
                          ? "border-primary bg-primary"
                          : "border-white"
                      }`}>
                        {formData.paymentPlanInterest === option.value && (
                          <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                        )}
                      </div>
                      <span className="font-semibold text-2xl text-white">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case "payment_plan_credit":
        return (
          <motion.div
            key="payment_plan_credit"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-6"
          >
            <div className="w-full max-w-xl space-y-10">
              <div className="p-8 rounded-3xl bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-4 mb-6">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <span className="font-bold text-2xl text-primary">One Quick Question</span>
                </div>
                <p className="text-white text-xl leading-relaxed">
                  Do you have at least $4,000 available on a credit card? This helps us determine the best payment structure for you.
                </p>
              </div>
              <div className="space-y-5">
                {PAYMENT_PLAN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSingleSelect("paymentPlanCreditAvailable", option.value)}
                    className={`w-full p-7 rounded-2xl border-2 text-left transition-all ${
                      formData.paymentPlanCreditAvailable === option.value
                        ? "border-primary bg-primary/15 shadow-[0_0_30px_rgba(0,214,50,0.3)]"
                        : "border-border/50 hover:border-primary/60 bg-card/40 hover:bg-card/60"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        formData.paymentPlanCreditAvailable === option.value
                          ? "border-primary bg-primary"
                          : "border-white"
                      }`}>
                        {formData.paymentPlanCreditAvailable === option.value && (
                          <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                        )}
                      </div>
                      <span className="font-semibold text-2xl text-white">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case "timeline":
        return (
          <motion.div
            key="timeline"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-6"
          >
            <div className="w-full max-w-xl space-y-8">
              <p className="text-center text-white text-2xl mb-10">
                When are you looking to get started?
              </p>
              <div className="space-y-5">
                {TIMELINE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSingleSelect("desiredTimeline", option.value)}
                    className={`w-full p-7 rounded-2xl border-2 text-left transition-all ${
                      formData.desiredTimeline === option.value
                        ? "border-primary bg-primary/15 shadow-[0_0_30px_rgba(0,214,50,0.3)]"
                        : "border-border/50 hover:border-primary/60 bg-card/40 hover:bg-card/60"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <Clock className="w-7 h-7 text-white" />
                      <span className="font-semibold text-2xl text-white">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case "bottleneck":
        return (
          <motion.div
            key="bottleneck"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-6 overflow-y-auto"
          >
            <div className="w-full max-w-xl space-y-8">
              <p className="text-center text-white text-2xl mb-8">
                What's your biggest challenge right now?
              </p>
              <div className="space-y-4">
                {BOTTLENECK_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSingleSelect("currentBottleneck", option.value)}
                    className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                      formData.currentBottleneck === option.value
                        ? "border-primary bg-primary/15 shadow-[0_0_30px_rgba(0,214,50,0.3)]"
                        : "border-border/50 hover:border-primary/60 bg-card/40 hover:bg-card/60"
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <Target className="w-6 h-6 text-white flex-shrink-0" />
                      <span className="font-semibold text-xl text-white">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case "manual_source":
        return (
          <motion.div
            key="manual_source"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center flex-1 px-6 overflow-y-auto"
          >
            <div className="w-full max-w-xl space-y-8">
              <p className="text-center text-white text-2xl mb-8">
                How did you hear about Alpha Agent?
              </p>
              <div className="space-y-4">
                {MANUAL_SOURCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSingleSelect("manualSource", option.value)}
                    className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                      formData.manualSource === option.value
                        ? "border-primary bg-primary/15 shadow-[0_0_30px_rgba(0,214,50,0.3)]"
                        : "border-border/50 hover:border-primary/60 bg-card/40 hover:bg-card/60"
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <MessageCircleQuestion className="w-6 h-6 text-white flex-shrink-0" />
                      <span className="font-semibold text-xl text-white">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Conditional Agent Name Input */}
              {formData.manualSource === "Agent Referred Me" && (
                <div className="pt-6">
                  <label className="text-lg font-semibold mb-4 block text-white">
                    Which agent referred you? *
                  </label>
                  <Input
                    placeholder="Type their full name"
                    value={formData.manualReferrerAgentName}
                    onChange={(e) => updateField("manualReferrerAgentName", e.target.value)}
                    className="h-16 text-xl bg-card/70 border-border/70 text-white placeholder:text-white/50"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative isolate">
      {/* Background effects - pushed behind content with -z-10 */}
      <div className="fixed inset-0 bg-gradient-radial opacity-30 pointer-events-none -z-10" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-float pointer-events-none -z-10" style={{ animationDelay: '-3s' }} />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-1 p-3 max-w-2xl mx-auto">
          {Array.from({ length: getTotalSteps() }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i <= getCurrentStepIndex() ? "bg-primary shadow-[0_0_10px_rgba(0,214,50,0.5)]" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="text-center pb-3">
          <span className="text-base text-white font-medium">Step {getCurrentStepIndex() + 1} of {getTotalSteps()}</span>
        </div>
      </div>

      {/* Main content - relative z-10 ensures it's above background */}
      <div className="flex-1 flex flex-col pt-20 pb-32 relative z-10">
        {/* Step title */}
        <div className="text-center py-8 px-4">
          <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            {getStepTitle()}
          </h1>
        </div>

        {/* Step content */}
        {renderStep()}
      </div>

      {/* Sticky footer navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex justify-between items-center gap-4">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={isSubmitting}
              className="gap-2 h-14 px-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <p className="text-sm text-white text-center hidden sm:block">
              Takes ~60 seconds
            </p>

            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={!isStepValid() || isSubmitting}
                className="gap-2 h-14 px-8 bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(0,214,50,0.4)]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit & Book Call
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!isStepValid() || isSubmitting}
                className="gap-2 h-14 px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
