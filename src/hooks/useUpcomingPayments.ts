import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';

export interface UpcomingPayment {
  id: string;
  billing_type: 'ad_spend' | 'management';
  amount: number;
  due_date: string | null;
  daysUntilDue: number | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

export function useUpcomingPayments(clientId?: string) {
  return useQuery({
    queryKey: ['upcoming-payments', clientId],
    queryFn: async () => {
      if (!clientId) return { adSpend: null, management: null };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch next pending ad_spend billing record
      const { data: adSpendData } = await supabase
        .from('billing_records')
        .select('id, billing_type, amount, due_date, status, credit_amount_used')
        .eq('client_id', clientId)
        .eq('billing_type', 'ad_spend')
        .eq('status', 'pending')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(1)
        .single();

      // Fetch next pending management billing record
      const { data: managementData } = await supabase
        .from('billing_records')
        .select('id, billing_type, amount, due_date, status, credit_amount_used')
        .eq('client_id', clientId)
        .eq('billing_type', 'management')
        .eq('status', 'pending')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(1)
        .single();

      const processPayment = (data: any): UpcomingPayment | null => {
        if (!data) return null;
        
        let daysUntilDue: number | null = null;
        if (data.due_date) {
          const dueDate = parseISO(data.due_date);
          daysUntilDue = differenceInDays(dueDate, today);
        }

        // Calculate net amount after credits
        const creditUsed = Number(data.credit_amount_used) || 0;
        const netAmount = data.amount - creditUsed;

        return {
          id: data.id,
          billing_type: data.billing_type,
          amount: netAmount,
          due_date: data.due_date,
          daysUntilDue,
          status: data.status,
        };
      };

      return {
        adSpend: processPayment(adSpendData),
        management: processPayment(managementData),
      };
    },
    enabled: !!clientId,
  });
}
