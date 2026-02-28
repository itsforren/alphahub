import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalculator, formatCurrency } from "@/contexts/CalculatorContext";


interface ROICalculatorProps {
  variant?: "top" | "bottom";
}

const ROICalculator = ({ variant = "bottom" }: ROICalculatorProps) => {
  const { inputs, setInputs, results, openPopup } = useCalculator();

  // Alpha fixed values for display
  const ALPHA_MANAGEMENT_FEE = 1497;
  const ALPHA_CPL = 40;
  const ALPHA_SUBMIT_RATE = 20;
  const ALPHA_ISSUED_RATE = 85;
  const ALPHA_AVG_PREMIUM = 4571;

  // Vendor calculations for display
  const vendorResults = useMemo(() => {
    const leads = inputs.leadsPerMonth;
    const appsSubmitted = leads * (inputs.submitRate / 100);
    const submittedCommission = appsSubmitted * inputs.targetPremium * (inputs.commissionRate / 100);
    const issuedPaidCommission = submittedCommission * (inputs.issuedPaidRate / 100);
    const leadCost = leads * inputs.costPerLead;
    const netProfit = issuedPaidCommission - leadCost;
    const issuedApps = appsSubmitted * (inputs.issuedPaidRate / 100);
    const costPerIssuedApp = issuedApps > 0 ? leadCost / issuedApps : 0;

    return {
      leads,
      appsSubmitted: Math.round(appsSubmitted * 10) / 10,
      submittedCommission: Math.round(submittedCommission),
      issuedPaidCommission: Math.round(issuedPaidCommission),
      leadCost: Math.round(leadCost),
      netProfit: Math.round(netProfit),
      issuedApps: Math.round(issuedApps * 10) / 10,
      costPerIssuedApp: Math.round(costPerIssuedApp),
    };
  }, [inputs]);

  // Alpha calculations for display
  const alphaResults = useMemo(() => {
    const vendorTotalSpend = vendorResults.leadCost;
    const adSpend = Math.max(vendorTotalSpend - ALPHA_MANAGEMENT_FEE, 500);
    
    const leads = Math.floor(adSpend / ALPHA_CPL);
    const appsSubmitted = leads * (ALPHA_SUBMIT_RATE / 100);
    const submittedCommission = appsSubmitted * ALPHA_AVG_PREMIUM * (inputs.commissionRate / 100);
    const issuedPaidCommission = submittedCommission * (ALPHA_ISSUED_RATE / 100);
    const totalCost = ALPHA_MANAGEMENT_FEE + adSpend;
    const netProfit = issuedPaidCommission - totalCost;
    const issuedApps = appsSubmitted * (ALPHA_ISSUED_RATE / 100);
    const costPerIssuedApp = issuedApps > 0 ? totalCost / issuedApps : 0;

    return {
      leads,
      adSpend: Math.round(adSpend),
      appsSubmitted: Math.round(appsSubmitted * 10) / 10,
      submittedCommission: Math.round(submittedCommission),
      issuedPaidCommission: Math.round(issuedPaidCommission),
      totalCost: Math.round(totalCost),
      netProfit: Math.round(netProfit),
      issuedApps: Math.round(issuedApps * 10) / 10,
      costPerIssuedApp: Math.round(costPerIssuedApp),
    };
  }, [vendorResults.leadCost, inputs.commissionRate]);

  // Use shared results for differences
  const difference = {
    monthlyProfit: results.monthlyProfitDifference,
    annualProfit: results.annualProfitDifference,
    cpaDiff: results.cpaSavings,
    cpaPercentDecrease: results.cpaPercentDecrease,
  };

  const scrollToBookCall = () => {
    const element = document.getElementById('final-cta');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (field: keyof typeof inputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section id={variant === "top" ? "truth-calculator-top" : "roi-calculator"} className="section-padding bg-gradient-dark relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,214,50,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,214,50,0.01)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="container-custom relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">THE TRUTH CALCULATOR</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            What Are Your Leads <span className="glow-text">Really</span> Costing You?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Plug in your numbers. See exactly how much you're losing to the vendor model.
          </p>
        </motion.div>

        {/* STEP 1: INPUTS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-6 md:p-8 mb-8 max-w-4xl mx-auto"
        >
          <h3 className="text-lg font-bold mb-6 text-primary flex items-center gap-2">
            <Zap className="w-5 h-5" />
            YOUR CURRENT NUMBERS
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Leads Per Month */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Leads / Month</label>
                <span className="text-lg font-bold text-foreground">{inputs.leadsPerMonth}</span>
              </div>
              <Slider
                value={[inputs.leadsPerMonth]}
                onValueChange={(v) => handleInputChange('leadsPerMonth', v[0])}
                min={0}
                max={500}
                step={25}
                className="cursor-pointer"
              />
            </div>

            {/* Cost Per Lead */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Cost Per Lead</label>
                <span className="text-lg font-bold text-foreground">{formatCurrency(inputs.costPerLead)}</span>
              </div>
              <Slider
                value={[inputs.costPerLead]}
                onValueChange={(v) => handleInputChange('costPerLead', v[0])}
                min={15}
                max={100}
                step={5}
                className="cursor-pointer"
              />
            </div>

            {/* Submit Rate */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Submit Rate</label>
                <span className="text-lg font-bold text-foreground">{inputs.submitRate}%</span>
              </div>
              <Slider
                value={[inputs.submitRate]}
                onValueChange={(v) => handleInputChange('submitRate', v[0])}
                min={1}
                max={15}
                step={1}
                className="cursor-pointer"
              />
            </div>

            {/* Issued/Paid Rate */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Issued/Paid Rate</label>
                <span className="text-lg font-bold text-foreground">{inputs.issuedPaidRate}%</span>
              </div>
              <Slider
                value={[inputs.issuedPaidRate]}
                onValueChange={(v) => handleInputChange('issuedPaidRate', v[0])}
                min={20}
                max={90}
                step={5}
                className="cursor-pointer"
              />
            </div>

            {/* Target Premium */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Avg Target Premium</label>
                <span className="text-lg font-bold text-foreground">{formatCurrency(inputs.targetPremium)}</span>
              </div>
              <Slider
                value={[inputs.targetPremium]}
                onValueChange={(v) => handleInputChange('targetPremium', v[0])}
                min={1000}
                max={10000}
                step={250}
                className="cursor-pointer"
              />
            </div>

            {/* Commission Rate */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Commission %</label>
                <span className="text-lg font-bold text-foreground">{inputs.commissionRate}%</span>
              </div>
              <Slider
                value={[inputs.commissionRate]}
                onValueChange={(v) => handleInputChange('commissionRate', v[0])}
                min={50}
                max={140}
                step={5}
                className="cursor-pointer"
              />
            </div>
          </div>
        </motion.div>

        {/* STEP 2 & 3: COMPARISON CARDS */}
        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
          {/* VENDOR MODEL (RED) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative rounded-2xl border-2 border-alert/50 bg-alert/5 p-6 md:p-8 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-alert/10 rounded-full blur-3xl" />
            
            <h3 className="text-lg font-bold mb-6 text-alert flex items-center gap-2 relative z-10">
              <TrendingDown className="w-5 h-5" />
              YOUR CURRENT SITUATION
              <span className="text-xs font-normal text-muted-foreground ml-2">(Vendor Model)</span>
            </h3>
            
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center py-2 border-b border-alert/20">
                <span className="text-sm text-muted-foreground">Leads Generated</span>
                <span className="font-bold text-foreground">{vendorResults.leads}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-alert/20">
                <span className="text-sm text-muted-foreground">Applications Submitted</span>
                <span className="font-bold text-foreground">{vendorResults.appsSubmitted}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-alert/20">
                <span className="text-sm text-muted-foreground">Submitted Commissions</span>
                <span className="font-bold text-foreground">{formatCurrency(vendorResults.submittedCommission)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-alert/20">
                <span className="text-sm text-muted-foreground">Issued/Paid Commissions</span>
                <span className="font-bold text-foreground">{formatCurrency(vendorResults.issuedPaidCommission)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-alert/20">
                <span className="text-sm text-muted-foreground">Cost of Leads</span>
                <span className="font-bold text-alert">-{formatCurrency(vendorResults.leadCost)}</span>
              </div>
              
              {/* NET PROFIT - BIG RED */}
              <div className="mt-4 p-4 rounded-xl bg-alert/20 border border-alert/40">
                <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={vendorResults.netProfit}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-3xl font-black ${vendorResults.netProfit >= 0 ? 'text-foreground' : 'text-alert'}`}
                  >
                    {formatCurrency(vendorResults.netProfit)}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* ALPHA MODEL (GREEN) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative rounded-2xl border-2 border-primary/50 bg-primary/5 p-6 md:p-8 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            
            <h3 className="text-lg font-bold mb-6 glow-text flex items-center gap-2 relative z-10">
              <TrendingUp className="w-5 h-5" />
              THE ALPHA WAY
              <span className="text-xs font-normal text-muted-foreground ml-2">(Private System)</span>
            </h3>
            
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center py-2 border-b border-primary/20">
                <span className="text-sm text-muted-foreground">Leads Generated</span>
                <span className="font-bold text-foreground">{alphaResults.leads}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-primary/20">
                <span className="text-sm text-muted-foreground">Applications Submitted</span>
                <span className="font-bold text-primary">{alphaResults.appsSubmitted}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-primary/20">
                <span className="text-sm text-muted-foreground">Submitted Commissions</span>
                <span className="font-bold text-foreground">{formatCurrency(alphaResults.submittedCommission)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-primary/20">
                <span className="text-sm text-muted-foreground">Issued/Paid Commissions</span>
                <span className="font-bold text-foreground">{formatCurrency(alphaResults.issuedPaidCommission)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-primary/20">
                <span className="text-sm text-muted-foreground">Total Cost (Fee + Ads)</span>
                <span className="font-bold text-foreground">-{formatCurrency(alphaResults.totalCost)}</span>
              </div>
              
              {/* NET PROFIT - BIG GREEN */}
              <div className="mt-4 p-4 rounded-xl bg-primary/20 border border-primary/40">
                <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={alphaResults.netProfit}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-black glow-text"
                  >
                    {formatCurrency(alphaResults.netProfit)}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* System Stats */}
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-center gap-8 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs mb-1">Avg Target Premium</p>
                    <p className="font-bold glow-text">$4,571</p>
                  </div>
                  <div className="w-px h-8 bg-primary/30" />
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs mb-1">Submit Rate</p>
                    <p className="font-bold glow-text">15-25%</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* STEP 4: DIFFERENCE PANEL - Monthly & Annual Side by Side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto mb-8"
        >
          <div className="glass-card p-6 md:p-8 border-primary/30">
            <h3 className="text-lg font-bold mb-6 text-center">THE DIFFERENCE</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/30">
                <p className="text-sm text-muted-foreground mb-2">Monthly Profit Difference</p>
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={difference.monthlyProfit}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-2xl md:text-3xl font-black ${difference.monthlyProfit >= 0 ? 'glow-text' : 'text-alert'}`}
                  >
                    {difference.monthlyProfit >= 0 ? '+' : ''}{formatCurrency(difference.monthlyProfit)}
                  </motion.p>
                </AnimatePresence>
              </div>
              
              <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/30">
                <p className="text-sm text-muted-foreground mb-2">Annual Profit Difference</p>
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={difference.annualProfit}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-2xl md:text-3xl font-black ${difference.annualProfit >= 0 ? 'glow-text' : 'text-alert'}`}
                  >
                    {difference.annualProfit >= 0 ? '+' : ''}{formatCurrency(difference.annualProfit)}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* STEP 5: TRUTH REVEAL WIDGET */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mb-8"
        >
          <div className="relative rounded-2xl border-2 border-primary/50 bg-background/80 backdrop-blur-sm p-8 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-alert/5 via-transparent to-primary/5" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
                <AlertTriangle className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">THE NUMBER THAT MATTERS</span>
              </div>
              
              <h3 className="text-2xl md:text-3xl font-black mb-8">
                Your Real Cost Per <span className="glow-text">Issued Application</span>
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-xl mx-auto mb-6">
                {/* Vendor CPA */}
                <div className="p-6 rounded-xl bg-alert/10 border border-alert/40">
                  <p className="text-sm text-muted-foreground mb-2">Vendor Model</p>
                  <AnimatePresence mode="wait">
                    <motion.p 
                      key={vendorResults.costPerIssuedApp}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl md:text-4xl font-black text-alert"
                    >
                      {formatCurrency(vendorResults.costPerIssuedApp)}
                    </motion.p>
                  </AnimatePresence>
                  <p className="text-xs text-muted-foreground mt-2">per issued app</p>
                </div>
                
                {/* Alpha CPA */}
                <div className="p-6 rounded-xl bg-primary/10 border border-primary/40">
                  <p className="text-sm text-muted-foreground mb-2">Alpha Private System</p>
                  <AnimatePresence mode="wait">
                    <motion.p 
                      key={alphaResults.costPerIssuedApp}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl md:text-4xl font-black glow-text"
                    >
                      {formatCurrency(alphaResults.costPerIssuedApp)}
                    </motion.p>
                  </AnimatePresence>
                  <p className="text-xs text-muted-foreground mt-2">per issued app</p>
                </div>
              </div>

              {/* Cost Per Issued App Savings */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 max-w-sm mx-auto mb-6">
                <p className="text-sm text-muted-foreground mb-2">Cost Per Issued App Savings</p>
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={difference.cpaPercentDecrease}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-2xl md:text-3xl font-black glow-text"
                  >
                    {difference.cpaPercentDecrease}% less
                  </motion.p>
                </AnimatePresence>
              </div>
              
              <p className="text-lg font-bold text-foreground">
                This is the only number that matters. Everything else is noise.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button 
            onClick={openPopup}
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-10 py-6 rounded-xl shadow-[0_0_60px_rgba(0,214,50,0.4)] hover:shadow-[0_0_80px_rgba(0,214,50,0.6)] transition-all duration-300"
          >
            SEE IF YOU QUALIFY
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Limited territories available. First-come, first-served.
          </p>
        </motion.div>
      </div>
      
      {/* Section divider */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
};

export default ROICalculator;
