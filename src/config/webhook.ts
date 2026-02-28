// Configure your webhook URL here
// This URL will receive all form submissions with calculator data

export const WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/wDoj91sbkfxZnMbow2G5/webhook-trigger/12365034-57b1-4525-8db5-be30cfbd588f";

// To use your webhook:
// 1. Replace the empty string above with your webhook URL
// 2. Example: export const WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/xxxxx";
//
// The webhook will receive a POST request with this JSON structure:
// {
//   "formData": {
//     "agentType": "Solo Agent" | "Have Downline",
//     "downlineCount": "5",
//     "leadsPerMonth": "100-200",
//     "costPerLead": "$35-50",
//     "monthlyIssuedPaid": "$15K-30K",
//     "biggestChallenge": "...",
//     "timelineToScale": "Immediately",
//     "name": "John Smith",
//     "email": "john@example.com",
//     "phone": "(555) 123-4567",
//     "referralSource": "..."
//   },
//   "calculatorInputs": {
//     "leadsPerMonth": 100,
//     "costPerLead": 40,
//     "submitRate": 3,
//     "issuedPaidRate": 50,
//     "targetPremium": 2500,
//     "commissionRate": 100
//   },
//   "calculatedResults": {
//     "vendorNetProfit": 750,
//     "vendorCostPerIssuedApp": 2667,
//     "alphaNetProfit": 12500,
//     "alphaCostPerIssuedApp": 640,
//     "monthlyProfitDifference": 11750,
//     "annualProfitDifference": 141000,
//     "cpaSavings": 2027,
//     "cpaPercentDecrease": 76
//   },
//   "submittedAt": "2024-01-15T10:30:00.000Z"
// }
