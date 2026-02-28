// Static stats - updated monthly, not live
interface LiveStats {
  targetPremium: number;
  applications: number;
  callsBooked: number;
}

// Static values - these are updated monthly
const STATIC_STATS: LiveStats = {
  targetPremium: 4571,
  applications: 67,
  callsBooked: 42,
};

export const useLiveStats = () => {
  // Return static values - no animation, no real-time updates
  return STATIC_STATS;
};

export const formatCurrencyShort = (num: number): string => {
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toLocaleString()}`;
};