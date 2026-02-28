import { motion } from "framer-motion";
import { CheckCircle2, Clock, Phone, ArrowRight, Loader2, TrendingUp, DollarSign, Target, MapPin, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/contexts/CalculatorContext";
import LiveNotifications from "@/components/LiveNotifications";
import { getVisitorId } from "@/lib/tracking";

interface SubmissionData {
  // Contact info
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  
  // Qualification answers
  licensedStatus?: string;
  targetStates?: string[];
  monthlyBudgetRange?: string;
  paymentPlanInterest?: string;
  paymentPlanCreditAvailable?: string;
  desiredTimeline?: string;
  currentBottleneck?: string;
  
  // Calculator results
  monthlyProfitDifference?: number;
  annualProfitDifference?: number;
  cpaSavings?: number;
  cpaPercentDecrease?: number;
  visitorId?: string;
}

const STATE_NAMES: Record<string, string> = {
  "TX": "Texas", "FL": "Florida", "CA": "California", "AZ": "Arizona", "GA": "Georgia",
  "NC": "North Carolina", "OH": "Ohio", "MI": "Michigan", "PA": "Pennsylvania", "IL": "Illinois",
  "TN": "Tennessee", "VA": "Virginia", "NV": "Nevada", "CO": "Colorado", "SC": "South Carolina",
  "AL": "Alabama", "LA": "Louisiana", "KY": "Kentucky", "OK": "Oklahoma", "IN": "Indiana",
  "NY": "New York", "WA": "Washington", "OR": "Oregon", "MA": "Massachusetts", "NJ": "New Jersey"
};

// Generate fake scarcity data for states
const generateSpotsLeft = (state: string): number => {
  const hash = state.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 4) + 1;
};

const BookCall = () => {
  const [submissionData, setSubmissionData] = useState<SubmissionData | null>(null);
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("submissionData");
    if (stored) {
      try {
        setSubmissionData(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse submission data");
      }
    }
    setDataLoaded(true);

    const script = document.createElement("script");
    script.src = "https://url.alphaagent.io/js/form_embed.js";
    script.type = "text/javascript";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const firstName = submissionData?.name?.split(" ")[0] || "there";
  const userStates = submissionData?.targetStates || [];

  const buildCalendarUrl = () => {
    const baseUrl = "https://url.alphaagent.io/widget/booking/XDEgBx07U6LQeYGd1582";
    const params = new URLSearchParams();
    
    // CRITICAL: Pass visitor_id for attribution linking
    const visitorId = submissionData?.visitorId || getVisitorId();
    params.set("visitor_id", visitorId);
    console.log("[Calendar] Passing visitor_id:", visitorId);
    
    if (!submissionData) {
      console.log("[Calendar] No submission data available");
      return `${baseUrl}?${params.toString()}`;
    }

    // Contact info - use stored firstName/lastName or parse from name
    const firstName = submissionData.firstName || submissionData.name?.split(" ")[0] || "";
    const lastName = submissionData.lastName || submissionData.name?.split(" ").slice(1).join(" ") || "";
    
    if (submissionData.name) params.set("name", submissionData.name);
    if (firstName) params.set("first_name", firstName);
    if (lastName) params.set("last_name", lastName);
    if (submissionData.email) params.set("email", submissionData.email);
    if (submissionData.phone) params.set("phone", submissionData.phone);
    
    // Qualification answers (GHL custom field names)
    if (submissionData.licensedStatus) params.set("licensed_status", submissionData.licensedStatus);
    if (submissionData.targetStates?.length) params.set("states_licensed", submissionData.targetStates.join(", "));
    if (submissionData.monthlyBudgetRange) params.set("monthly_budget", submissionData.monthlyBudgetRange);
    if (submissionData.paymentPlanInterest) params.set("payment_plan_interest", submissionData.paymentPlanInterest);
    if (submissionData.paymentPlanCreditAvailable) params.set("payment_plan_credit", submissionData.paymentPlanCreditAvailable);
    if (submissionData.desiredTimeline) params.set("timeline", submissionData.desiredTimeline);
    if (submissionData.currentBottleneck) params.set("bottleneck", submissionData.currentBottleneck);
    
    // Calculator results (formatted for readability)
    if (submissionData.monthlyProfitDifference) {
      params.set("projected_monthly_increase", `$${submissionData.monthlyProfitDifference.toLocaleString()}`);
    }
    if (submissionData.annualProfitDifference) {
      params.set("projected_annual_increase", `$${submissionData.annualProfitDifference.toLocaleString()}`);
    }
    if (submissionData.cpaSavings) {
      params.set("cpa_savings", `$${submissionData.cpaSavings.toLocaleString()}`);
    }

    const finalUrl = `${baseUrl}?${params.toString()}`;
    console.log("[Calendar] Built URL with all params:", finalUrl);
    
    return finalUrl;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

      {/* Shared Live Notifications */}
      <LiveNotifications />

      <div className="container-custom relative z-10 py-6 md:py-10">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-3xl mx-auto mb-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"
          >
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </motion.div>

          <h1 className="text-2xl md:text-3xl font-black mb-1">
            Application Received, <span className="glow-text">{firstName}!</span>
          </h1>
          <p className="text-sm text-muted-foreground">Book your strategy call below to secure your spot.</p>
        </motion.div>

        {/* Territory Scarcity Counter */}
        {userStates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="max-w-2xl mx-auto mb-4"
          >
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-xs font-bold text-destructive uppercase tracking-wider">Limited Availability</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {userStates.map((state) => {
                  const spotsLeft = generateSpotsLeft(state);
                  const isUrgent = spotsLeft <= 2;
                  return (
                    <motion.div
                      key={state}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                        isUrgent 
                          ? 'bg-destructive/20 border border-destructive/40 text-destructive' 
                          : 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-600 dark:text-yellow-400'
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{STATE_NAMES[state] || state}</span>
                      <span className="font-bold">
                        {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Potential Results Section */}
        {submissionData?.monthlyProfitDifference && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-4 max-w-3xl mx-auto"
          >
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Your Potential Results</p>
            <div className="flex flex-wrap justify-center gap-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold glow-text">+{formatCurrency(submissionData.monthlyProfitDifference)}/mo</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors"
              >
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold glow-text">+{formatCurrency(submissionData.annualProfitDifference || 0)}/yr</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors"
              >
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold glow-text">{formatCurrency(submissionData.cpaSavings || 0)} CPA saved</span>
              </motion.div>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-muted-foreground mt-3"
            >
              <span className="text-primary font-semibold">Book your call now</span> before another agent grabs the limited seats
            </motion.p>
          </motion.div>
        )}

        {/* Calendar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-4xl mx-auto mb-6"
        >
          <div className="glass-card p-3 md:p-5">
            <div className="relative rounded-xl overflow-hidden min-h-[650px]">
              {(!calendarLoaded || !dataLoaded) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/50 z-10">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                  <p className="text-muted-foreground text-sm">Loading calendar...</p>
                </div>
              )}
              {dataLoaded && (
                <iframe
                  src={buildCalendarUrl()}
                  style={{ width: "100%", border: "none", overflow: "hidden", minHeight: "650px" }}
                  scrolling="no"
                  id="wbMNTqXHwvXXvBQNoHLX_1765433811097"
                  onLoad={() => setCalendarLoaded(true)}
                />
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>15-20 min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>Video or Phone</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                <span>Custom growth plan</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Compact Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <h3 className="text-center text-sm font-bold mb-3 text-muted-foreground">What Happens Next</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { step: "1", title: "Book Call" },
              { step: "2", title: "Territory Review" },
              { step: "3", title: "Strategy Session" },
              { step: "4", title: "Go Live" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border">
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-xs font-bold text-primary">
                  {item.step}
                </div>
                <span className="text-sm font-medium">{item.title}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BookCall;
