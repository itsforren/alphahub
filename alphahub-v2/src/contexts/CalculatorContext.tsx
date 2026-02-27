import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";

interface CalculatorInputs {
  leadsPerMonth: number;
  costPerLead: number;
  submitRate: number;
  issuedPaidRate: number;
  targetPremium: number;
  commissionRate: number;
}

interface CalculatorResults {
  vendorNetProfit: number;
  vendorCostPerIssuedApp: number;
  vendorLeadCost: number;
  alphaNetProfit: number;
  alphaCostPerIssuedApp: number;
  alphaTotalCost: number;
  monthlyProfitDifference: number;
  annualProfitDifference: number;
  cpaSavings: number;
  cpaPercentDecrease: number;
}

interface CalculatorContextType {
  inputs: CalculatorInputs;
  setInputs: React.Dispatch<React.SetStateAction<CalculatorInputs>>;
  results: CalculatorResults;
  isPopupOpen: boolean;
  openPopup: () => void;
  closePopup: () => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

const ALPHA_MANAGEMENT_FEE = 1997;
const ALPHA_CPL = 40;
const ALPHA_SUBMIT_RATE = 20;
const ALPHA_ISSUED_RATE = 85;
const ALPHA_AVG_PREMIUM = 4571;

export const CalculatorProvider = ({ children }: { children: ReactNode }) => {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    leadsPerMonth: 100,
    costPerLead: 40,
    submitRate: 3,
    issuedPaidRate: 50,
    targetPremium: 2500,
    commissionRate: 100,
  });

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const openPopup = () => setIsPopupOpen(true);
  const closePopup = () => setIsPopupOpen(false);

  const results = useMemo(() => {
    // Vendor calculations
    const vendorLeadCost = inputs.leadsPerMonth * inputs.costPerLead;
    const vendorAppsSubmitted = inputs.leadsPerMonth * (inputs.submitRate / 100);
    const vendorSubmittedCommission = vendorAppsSubmitted * inputs.targetPremium * (inputs.commissionRate / 100);
    const vendorIssuedPaidCommission = vendorSubmittedCommission * (inputs.issuedPaidRate / 100);
    const vendorNetProfit = vendorIssuedPaidCommission - vendorLeadCost;
    const vendorIssuedApps = vendorAppsSubmitted * (inputs.issuedPaidRate / 100);
    const vendorCostPerIssuedApp = vendorIssuedApps > 0 ? vendorLeadCost / vendorIssuedApps : 0;

    // Alpha calculations
    const adSpend = Math.max(vendorLeadCost - ALPHA_MANAGEMENT_FEE, 500);
    const alphaLeads = Math.floor(adSpend / ALPHA_CPL);
    const alphaAppsSubmitted = alphaLeads * (ALPHA_SUBMIT_RATE / 100);
    const alphaSubmittedCommission = alphaAppsSubmitted * ALPHA_AVG_PREMIUM * (inputs.commissionRate / 100);
    const alphaIssuedPaidCommission = alphaSubmittedCommission * (ALPHA_ISSUED_RATE / 100);
    const alphaTotalCost = ALPHA_MANAGEMENT_FEE + adSpend;
    const alphaNetProfit = alphaIssuedPaidCommission - alphaTotalCost;
    const alphaIssuedApps = alphaAppsSubmitted * (ALPHA_ISSUED_RATE / 100);
    const alphaCostPerIssuedApp = alphaIssuedApps > 0 ? alphaTotalCost / alphaIssuedApps : 0;

    // Differences
    const monthlyProfitDifference = alphaNetProfit - vendorNetProfit;
    const annualProfitDifference = monthlyProfitDifference * 12;
    const cpaSavings = vendorCostPerIssuedApp - alphaCostPerIssuedApp;
    const cpaPercentDecrease = vendorCostPerIssuedApp > 0 
      ? ((cpaSavings / vendorCostPerIssuedApp) * 100) 
      : 0;

    return {
      vendorNetProfit: Math.round(vendorNetProfit),
      vendorCostPerIssuedApp: Math.round(vendorCostPerIssuedApp),
      vendorLeadCost: Math.round(vendorLeadCost),
      alphaNetProfit: Math.round(alphaNetProfit),
      alphaCostPerIssuedApp: Math.round(alphaCostPerIssuedApp),
      alphaTotalCost: Math.round(alphaTotalCost),
      monthlyProfitDifference: Math.round(monthlyProfitDifference),
      annualProfitDifference: Math.round(annualProfitDifference),
      cpaSavings: Math.round(cpaSavings),
      cpaPercentDecrease: Math.round(cpaPercentDecrease),
    };
  }, [inputs]);

  return (
    <CalculatorContext.Provider value={{ inputs, setInputs, results, isPopupOpen, openPopup, closePopup }}>
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = () => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error("useCalculator must be used within a CalculatorProvider");
  }
  return context;
};

export const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};
