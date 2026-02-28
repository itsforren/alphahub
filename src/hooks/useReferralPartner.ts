import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralPartner {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  referral_code: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Get referral partner by user_id (for logged-in partner viewing their dashboard)
export function useReferralPartner(userId: string | undefined) {
  return useQuery({
    queryKey: ['referral-partner', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('referral_partners')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data as ReferralPartner | null;
    },
    enabled: !!userId,
  });
}

// Get all referral partners (admin)
export function useAllReferralPartners() {
  return useQuery({
    queryKey: ['all-referral-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_partners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ReferralPartner[];
    },
  });
}

// Get referral code for a partner
export function usePartnerReferralCode(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-referral-code', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      
      // Call the database function to get or create the referral code
      const { data, error } = await supabase
        .rpc('get_or_create_partner_referral_code', { p_partner_id: partnerId });
      
      if (error) throw error;
      return data as string;
    },
    enabled: !!partnerId,
  });
}

interface PartnerReferralStats {
  totalReferrals: number;
  activeAgents: number;
  pendingRewards: number;
  totalEarnings: number;
  paidEarnings: number;
}

// Get referral stats for a partner
export function usePartnerReferralStats(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-referral-stats', partnerId],
    queryFn: async (): Promise<PartnerReferralStats | null> => {
      if (!partnerId) return null;

      // Get all referrals for this partner using filter (column may not be in generated types yet)
      const referralsResult = await supabase
        .from('referrals')
        .select('id, status')
        .filter('referrer_partner_id', 'eq', partnerId);

      if (referralsResult.error) throw referralsResult.error;
      const referrals = referralsResult.data as { id: string; status: string }[] | null;

      // Get all rewards for this partner
      const rewardsResult = await supabase
        .from('referral_rewards')
        .select('id, amount, status')
        .filter('referrer_partner_id', 'eq', partnerId);

      if (rewardsResult.error) throw rewardsResult.error;
      const rewards = rewardsResult.data as { id: string; amount: number; status: string }[] | null;

      return {
        totalReferrals: referrals?.length || 0,
        activeAgents: referrals?.filter(r => r.status === 'active').length || 0,
        pendingRewards: rewards?.filter(r => r.status === 'pending' || r.status === 'approved')
          .reduce((sum, r) => sum + Number(r.amount), 0) || 0,
        totalEarnings: rewards?.reduce((sum, r) => sum + Number(r.amount), 0) || 0,
        paidEarnings: rewards?.filter(r => r.status === 'paid')
          .reduce((sum, r) => sum + Number(r.amount), 0) || 0,
      };
    },
    enabled: !!partnerId,
  });
}

// Get referral history for a partner
export function usePartnerReferralHistory(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-referral-history', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .filter('referrer_partner_id', 'eq', partnerId)
        .order('referred_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });
}

// Get rewards history for a partner
export function usePartnerRewardsHistory(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-rewards-history', partnerId],
    queryFn: async () => {
      if (!partnerId) return [];

      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .filter('referrer_partner_id', 'eq', partnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });
}
