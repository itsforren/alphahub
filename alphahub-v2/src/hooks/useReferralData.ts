import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralCode {
  id: string;
  client_id: string;
  code: string;
  created_at: string;
  is_active: boolean;
}

export interface ReferralWithReferrer {
  id: string;
  referrer_client_id: string;
  referred_client_id: string | null;
  referral_code_id: string;
  referred_email: string;
  referred_name: string | null;
  status: 'pending' | 'signed_up' | 'active' | 'churned';
  referred_at: string;
  signed_up_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  referrer?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface Referral {
  id: string;
  referrer_client_id: string;
  referred_client_id: string | null;
  referral_code_id: string;
  referred_email: string;
  referred_name: string | null;
  status: 'pending' | 'signed_up' | 'active' | 'churned';
  referred_at: string;
  signed_up_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralReward {
  id: string;
  referral_id: string;
  referrer_client_id: string;
  amount: number;
  reward_type: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralStats {
  totalReferrals: number;
  activeAgents: number;
  pendingRewards: number;
  totalEarnings: number;
  paidEarnings: number;
}

// Get or create referral code for a client
export function useReferralCode(clientId: string | undefined) {
  return useQuery({
    queryKey: ['referral-code', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      // Call the database function to get or create the referral code
      const { data, error } = await supabase
        .rpc('get_or_create_referral_code', { p_client_id: clientId });
      
      if (error) throw error;
      return data as string;
    },
    enabled: !!clientId,
  });
}

// Fetch referral stats for a client
export function useReferralStats(clientId: string | undefined) {
  return useQuery({
    queryKey: ['referral-stats', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      // Get all referrals for this client
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_client_id', clientId);

      if (referralsError) throw referralsError;

      // Get all rewards for this client
      const { data: rewards, error: rewardsError } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('referrer_client_id', clientId);

      if (rewardsError) throw rewardsError;

      const stats: ReferralStats = {
        totalReferrals: referrals?.length || 0,
        activeAgents: referrals?.filter(r => r.status === 'active').length || 0,
        pendingRewards: rewards?.filter(r => r.status === 'pending' || r.status === 'approved')
          .reduce((sum, r) => sum + Number(r.amount), 0) || 0,
        totalEarnings: rewards?.reduce((sum, r) => sum + Number(r.amount), 0) || 0,
        paidEarnings: rewards?.filter(r => r.status === 'paid')
          .reduce((sum, r) => sum + Number(r.amount), 0) || 0,
      };

      return stats;
    },
    enabled: !!clientId,
  });
}

// Fetch referral history for a client
export function useReferralHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: ['referral-history', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_client_id', clientId)
        .order('referred_at', { ascending: false });

      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!clientId,
  });
}

// Fetch rewards history for a client
export function useRewardsHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: ['rewards-history', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('referral_rewards')
        .select('*')
        .eq('referrer_client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReferralReward[];
    },
    enabled: !!clientId,
  });
}

// Admin: Create a new referral (for testing or manual entry)
export function useCreateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      referrer_client_id: string;
      referred_email: string;
      referred_name?: string;
    }) => {
      // Get the referral code for this client
      const { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('client_id', data.referrer_client_id)
        .single();

      if (codeError) throw codeError;

      const { data: referral, error } = await supabase
        .from('referrals')
        .insert({
          referrer_client_id: data.referrer_client_id,
          referral_code_id: codeData.id,
          referred_email: data.referred_email,
          referred_name: data.referred_name,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return referral;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['referral-history', variables.referrer_client_id] });
      queryClient.invalidateQueries({ queryKey: ['referral-stats', variables.referrer_client_id] });
    },
  });
}

// Admin: Update referral status
export function useUpdateReferralStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      referralId, 
      status,
      referred_client_id 
    }: { 
      referralId: string; 
      status: 'pending' | 'signed_up' | 'active' | 'churned';
      referred_client_id?: string;
    }) => {
      const updates: Record<string, unknown> = { 
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'signed_up') {
        updates.signed_up_at = new Date().toISOString();
      } else if (status === 'active') {
        updates.activated_at = new Date().toISOString();
      }

      if (referred_client_id) {
        updates.referred_client_id = referred_client_id;
      }

      const { data, error } = await supabase
        .from('referrals')
        .update(updates)
        .eq('id', referralId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-history'] });
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
    },
  });
}

// Admin: Create a reward for a referral
export function useCreateReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      referral_id: string;
      referrer_client_id: string;
      amount: number;
      reward_type: string;
      notes?: string;
    }) => {
      const { data: reward, error } = await supabase
        .from('referral_rewards')
        .insert({
          referral_id: data.referral_id,
          referrer_client_id: data.referrer_client_id,
          amount: data.amount,
          reward_type: data.reward_type,
          notes: data.notes,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return reward;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rewards-history', variables.referrer_client_id] });
      queryClient.invalidateQueries({ queryKey: ['referral-stats', variables.referrer_client_id] });
    },
  });
}

// Admin: Update reward status
export function useUpdateRewardStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      rewardId, 
      status,
      payment_reference 
    }: { 
      rewardId: string; 
      status: 'pending' | 'approved' | 'paid' | 'cancelled';
      payment_reference?: string;
    }) => {
      const updates: Record<string, unknown> = { 
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
        if (payment_reference) {
          updates.payment_reference = payment_reference;
        }
      }

      const { data, error } = await supabase
        .from('referral_rewards')
        .update(updates)
        .eq('id', rewardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards-history'] });
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
    },
  });
}

// Admin: Fetch all referrals with referrer info
export function useAllReferrals() {
  return useQuery({
    queryKey: ['all-referrals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referrer:clients!referrals_referrer_client_id_fkey(id, name, email)
        `)
        .order('referred_at', { ascending: false });

      if (error) throw error;
      return data as ReferralWithReferrer[];
    },
  });
}

// Admin: Fetch all referral rewards with referrer info and referred client name
export function useAllReferralRewards() {
  return useQuery({
    queryKey: ['all-referral-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_rewards')
        .select(`
          *,
          referrer:clients!referral_rewards_referrer_client_id_fkey(id, name, email),
          referral:referrals!referral_rewards_referral_id_fkey(referred_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (ReferralReward & { 
        referrer?: { id: string; name: string; email: string } | null;
        referral?: { referred_name: string | null } | null;
      })[];
    },
  });
}
