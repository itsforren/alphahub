import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, addMonths } from 'date-fns';

export type BillingType = 'ad_spend' | 'management';
export type BillingStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type RecurrenceType = 'one_time' | 'bi_weekly' | 'monthly';

export interface BillingRecord {
  id: string;
  client_id: string;
  billing_type: BillingType;
  amount: number;
  billing_period_start: string | null;
  billing_period_end: string | null;
  due_date: string | null;
  status: BillingStatus;
  payment_link: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_account: string | null;
  paid_at: string | null;
  notes: string | null;
  recurrence_type: RecurrenceType;
  next_due_date: string | null;
  is_recurring_parent: boolean;
  parent_billing_id: string | null;
  payment_reference: string | null;
  credit_applied_id: string | null;
  credit_amount_used: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  source: 'stripe' | 'v1_manual' | 'auto_recharge' | null;
  // Computed client-side
  has_wallet_deposit?: boolean;
  is_duplicate?: boolean;
}

export interface CreateBillingRecordInput {
  client_id: string;
  billing_type: BillingType;
  amount: number;
  billing_period_start?: string;
  billing_period_end?: string;
  due_date?: string;
  status?: BillingStatus;
  payment_link?: string;
  notes?: string;
  recurrence_type?: RecurrenceType;
  is_recurring_parent?: boolean;
  payment_reference?: string;
  credit_applied_id?: string;
  credit_applied_ids?: string[]; // Support multiple credits
}

export interface UpdateBillingRecordInput {
  id: string;
  billing_type?: BillingType;
  amount?: number;
  billing_period_start?: string;
  billing_period_end?: string;
  due_date?: string;
  status?: BillingStatus;
  payment_link?: string;
  paid_at?: string | null;
  notes?: string;
  recurrence_type?: RecurrenceType;
  next_due_date?: string;
  payment_reference?: string;
  credit_applied_id?: string | null; // Allow null to clear
  credit_applied_ids?: string[]; // Support multiple credits
}

function calculateNextDueDate(recurrenceType: RecurrenceType, currentDueDate: Date): Date | null {
  switch (recurrenceType) {
    case 'bi_weekly':
      return addDays(currentDueDate, 14);
    case 'monthly':
      return addMonths(currentDueDate, 1);
    default:
      return null;
  }
}

export function useBillingRecords(clientId?: string, showArchived = false) {
  return useQuery({
    queryKey: ['billing-records', clientId, showArchived],
    queryFn: async () => {
      let query = supabase
        .from('billing_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (showArchived) {
        query = query.not('archived_at', 'is', null);
      } else {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const records = data as BillingRecord[];

      // Fetch which billing_record_ids have wallet deposits
      const depositedIds = new Set<string>();
      if (clientId && records.length > 0) {
        const { data: txRows } = await supabase
          .from('wallet_transactions')
          .select('billing_record_id')
          .eq('client_id', clientId)
          .eq('transaction_type', 'deposit')
          .not('billing_record_id', 'is', null);

        (txRows || []).forEach((tx: any) => {
          if (tx.billing_record_id) depositedIds.add(tx.billing_record_id);
        });
      }

      // Detect duplicates: same billing_type + amount + due_date
      // Uses due_date (unique per invoice) instead of billing_period_start
      // (which can be shared across invoices in the same subscription period)
      const seenKeys = new Map<string, number>();
      records.forEach(r => {
        if (r.due_date) {
          const key = `${r.billing_type}|${r.amount}|${r.due_date}`;
          seenKeys.set(key, (seenKeys.get(key) || 0) + 1);
        }
      });

      return records.map(r => ({
        ...r,
        has_wallet_deposit: depositedIds.has(r.id),
        is_duplicate: r.due_date
          ? (seenKeys.get(`${r.billing_type}|${r.amount}|${r.due_date}`) || 0) > 1
          : false,
      }));
    },
    enabled: !!clientId,
  });
}

export function useCreateBillingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBillingRecordInput) => {
      const { credit_applied_ids, ...insertData } = input;

      // If multiple credits are selected, store the first one on the billing record for reference
      if (credit_applied_ids?.length) {
        insertData.credit_applied_id = credit_applied_ids[0];
      }

      const isRecurring = insertData.recurrence_type && insertData.recurrence_type !== 'one_time';
      
      // Calculate next due date for recurring
      let nextDueDate: string | undefined;
      if (isRecurring && insertData.due_date) {
        const next = calculateNextDueDate(insertData.recurrence_type!, new Date(insertData.due_date));
        if (next) nextDueDate = next.toISOString().split('T')[0];
      }

      // Set paid_at if status is paid
      const paid_at = insertData.status === 'paid' ? new Date().toISOString() : undefined;

      const { data, error } = await supabase
        .from('billing_records')
        .insert({
          ...insertData,
          is_recurring_parent: isRecurring,
          next_due_date: nextDueDate,
          paid_at,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Apply credits (supports multiple credits)
      const creditIds = credit_applied_ids || (insertData.credit_applied_id ? [insertData.credit_applied_id] : []);
      let remainingInvoiceAmount = insertData.amount || 0;
      let totalCreditUsed = 0;
      
      for (const creditId of creditIds) {
        if (remainingInvoiceAmount <= 0) break;
        
        const { data: credit, error: creditFetchError } = await supabase
          .from('client_credits')
          .select('*')
          .eq('id', creditId)
          .single();

        if (!creditFetchError && credit) {
          const creditAvailable = credit.remaining_balance ?? credit.amount;
          const amountToDeduct = Math.min(creditAvailable, remainingInvoiceAmount);
          const newRemaining = Math.max(0, creditAvailable - amountToDeduct);
          
          await supabase
            .from('client_credits')
            .update({
              applied_to_billing_id: data.id,
              applied_at: new Date().toISOString(),
              remaining_balance: newRemaining,
            })
            .eq('id', creditId);
          
          totalCreditUsed += amountToDeduct;
          remainingInvoiceAmount -= amountToDeduct;
        }
      }
      
      // Update the billing record with total credit used
      if (totalCreditUsed > 0) {
        await supabase
          .from('billing_records')
          .update({ credit_amount_used: totalCreditUsed })
          .eq('id', data.id);
      }

      // NOTE: Wallet deposits are no longer created inline when billing records are created.
      // All deposits must come through Stripe via process_successful_charge() webhook handler.
      // Admin can use useAddWalletAdjustment for corrections only.

      return data as BillingRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing-records', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['billing-records'] });
      queryClient.invalidateQueries({ queryKey: ['client-credits', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['available-credits', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client-wallet', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client-wallet-tracking', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['wallet-deposits', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', data.client_id] });
    },
  });
}

export function useUpdateBillingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBillingRecordInput) => {
      const { id, credit_applied_ids, ...updates } = input;
      
      // Get current record to check if status is changing to paid
      const { data: currentRecord } = await supabase
        .from('billing_records')
        .select('*')
        .eq('id', id)
        .single();

      if (!currentRecord) throw new Error('Record not found');
      
      const isBeingMarkedPaid = updates.status === 'paid' && currentRecord.status !== 'paid';
      
      // If status is changing to 'paid', set paid_at
      if (updates.status === 'paid' && !updates.paid_at) {
        updates.paid_at = new Date().toISOString();
      }
      
      // Handle credit application - set credit_applied_id on the billing record
      const creditIds = credit_applied_ids || [];
      if (creditIds.length > 0) {
        // Store the first credit ID on the billing record for reference
        updates.credit_applied_id = creditIds[0];
      }
      
      const { data, error } = await supabase
        .from('billing_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Apply credits (supports multiple credits) - only if new credits are being applied
      if (creditIds.length > 0) {
        let remainingInvoiceAmount = data.amount || 0;
        let totalCreditUsed = 0;
        
        for (const creditId of creditIds) {
          if (remainingInvoiceAmount <= 0) break;
          
          const { data: credit, error: creditFetchError } = await supabase
            .from('client_credits')
            .select('*')
            .eq('id', creditId)
            .single();

          if (!creditFetchError && credit) {
            // Skip if this credit was already fully applied to THIS specific invoice
            if (credit.applied_to_billing_id === data.id && credit.remaining_balance === 0) {
              continue;
            }
            
            const creditAvailable = credit.remaining_balance ?? credit.amount;
            if (creditAvailable <= 0) continue; // Skip exhausted credits
            
            const amountToDeduct = Math.min(creditAvailable, remainingInvoiceAmount);
            const newRemaining = Math.max(0, creditAvailable - amountToDeduct);
            
            await supabase
              .from('client_credits')
              .update({
                applied_to_billing_id: data.id,
                applied_at: new Date().toISOString(),
                remaining_balance: newRemaining,
              })
              .eq('id', creditId);
            
            totalCreditUsed += amountToDeduct;
            remainingInvoiceAmount -= amountToDeduct;
          }
        }
        
        // Update the billing record with total credit used
        if (totalCreditUsed > 0) {
          await supabase
            .from('billing_records')
            .update({ credit_amount_used: totalCreditUsed })
            .eq('id', data.id);
        }
      }
      
      // NOTE: Wallet deposits are no longer created inline when marking records as paid.
      // All deposits must come through Stripe via process_successful_charge() webhook handler.
      // Admin can use useAddWalletAdjustment for corrections only.

      // Generate next recurring charge if this is a recurring record being marked as paid
      // Check if child record already exists to prevent duplicates
      if (isBeingMarkedPaid && data.is_recurring_parent && data.recurrence_type !== 'one_time') {
        // First check if a child record already exists for this parent
        const { data: existingChild } = await supabase
          .from('billing_records')
          .select('id')
          .eq('parent_billing_id', data.id)
          .maybeSingle();

        // Only create if no child exists
        if (!existingChild) {
          // Use the current invoice's period end as the start of the next period
          const periodStart = data.billing_period_end 
            ? new Date(data.billing_period_end)
            : calculateNextDueDate(data.recurrence_type as RecurrenceType, new Date(data.billing_period_start || new Date()));

          if (periodStart) {
            const periodEnd = calculateNextDueDate(data.recurrence_type as RecurrenceType, periodStart);

            await supabase
              .from('billing_records')
              .insert({
                client_id: data.client_id,
                billing_type: data.billing_type,
                amount: data.amount,
                billing_period_start: periodStart.toISOString().split('T')[0],
                billing_period_end: periodEnd?.toISOString().split('T')[0],
                due_date: periodStart.toISOString().split('T')[0],
                status: 'pending',
                payment_link: data.payment_link,
                notes: data.notes,
                recurrence_type: data.recurrence_type,
                is_recurring_parent: true,
                next_due_date: periodEnd?.toISOString().split('T')[0],
                parent_billing_id: data.id,
              });
          }
        }
      }

      // Process referral commission when management fee is marked as paid
      if (isBeingMarkedPaid && data.billing_type === 'management') {
        try {
          console.log('Processing referral commission for billing record:', data.id);
          await supabase.functions.invoke('process-referral-commission', {
            body: {
              billing_record_id: data.id,
              client_id: data.client_id,
              amount: data.amount,
              billing_type: data.billing_type,
              billing_period_start: data.billing_period_start,
              billing_period_end: data.billing_period_end,
            },
          });
        } catch (commissionError) {
          // Don't fail the billing update if commission processing fails
          console.error('Error processing referral commission:', commissionError);
        }
      }
      
      return data as BillingRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing-records', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['billing-records'] });
      queryClient.invalidateQueries({ queryKey: ['client-credits', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['available-credits', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client-wallet', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client-wallet-tracking', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['wallet-deposits', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', data.client_id] });
      // Also invalidate campaign-related queries so Command Center updates
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['command-center-stats'] });
    },
  });
}

export function useDeleteBillingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      // Get the billing record to check if it's ad_spend type
      const { data: billingRecord, error: fetchError } = await supabase
        .from('billing_records')
        .select('billing_type, amount, status')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // If it's a paid ad_spend record, we need to subtract from wallet balance
      if (billingRecord?.billing_type === 'ad_spend' && billingRecord?.status === 'paid') {
        // Get the wallet for this client
        const { data: wallet, error: walletFetchError } = await supabase
          .from('client_wallets')
          .select('id, ad_spend_balance')
          .eq('client_id', clientId)
          .maybeSingle();

        if (walletFetchError) throw walletFetchError;

        if (wallet) {
          // Subtract the amount from wallet balance
          const newBalance = Number(wallet.ad_spend_balance) - Number(billingRecord.amount);
          const { error: walletUpdateError } = await supabase
            .from('client_wallets')
            .update({ 
              ad_spend_balance: Math.max(0, newBalance),
              last_calculated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);

          if (walletUpdateError) throw walletUpdateError;
        }
      }

      // Delete any wallet_transactions referencing this billing record
      const { error: walletError } = await supabase
        .from('wallet_transactions')
        .delete()
        .eq('billing_record_id', id);

      if (walletError) throw walletError;

      // Delete any child billing records that reference this as parent
      const { error: childError } = await supabase
        .from('billing_records')
        .delete()
        .eq('parent_billing_id', id);

      if (childError) throw childError;

      // Now delete the billing record itself
      const { error } = await supabase
        .from('billing_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, clientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing-records', data.clientId] });
      queryClient.invalidateQueries({ queryKey: ['billing-records'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', data.clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-wallet', data.clientId] });
    },
  });
}

export function useArchiveBillingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId, removeWalletDeposit }: { id: string; clientId: string; removeWalletDeposit: boolean }) => {
      if (removeWalletDeposit) {
        await supabase
          .from('wallet_transactions')
          .delete()
          .eq('billing_record_id', id);
      }

      const { error } = await supabase
        .from('billing_records')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { id, clientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing-records', data.clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-wallet', data.clientId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', data.clientId] });
    },
  });
}

export function useRestoreBillingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('billing_records')
        .update({ archived_at: null })
        .eq('id', id);

      if (error) throw error;
      return { id, clientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing-records', data.clientId] });
    },
  });
}

// Create next recurring charge when one is paid
export function useGenerateNextRecurringCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paidRecord: BillingRecord) => {
      if (!paidRecord.is_recurring_parent || paidRecord.recurrence_type === 'one_time') {
        return null;
      }

      const nextDueDate = paidRecord.next_due_date 
        ? new Date(paidRecord.next_due_date)
        : calculateNextDueDate(paidRecord.recurrence_type, new Date(paidRecord.due_date || new Date()));

      if (!nextDueDate) return null;

      // Calculate next period
      const periodStart = nextDueDate;
      const periodEnd = calculateNextDueDate(paidRecord.recurrence_type, nextDueDate);
      const nextNextDue = periodEnd ? calculateNextDueDate(paidRecord.recurrence_type, periodEnd) : null;

      const { data, error } = await supabase
        .from('billing_records')
        .insert({
          client_id: paidRecord.client_id,
          billing_type: paidRecord.billing_type,
          amount: paidRecord.amount,
          billing_period_start: periodStart.toISOString().split('T')[0],
          billing_period_end: periodEnd?.toISOString().split('T')[0],
          due_date: nextDueDate.toISOString().split('T')[0],
          status: 'pending',
          payment_link: paidRecord.payment_link,
          notes: paidRecord.notes,
          recurrence_type: paidRecord.recurrence_type,
          is_recurring_parent: true,
          next_due_date: nextNextDue?.toISOString().split('T')[0],
          parent_billing_id: paidRecord.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BillingRecord;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['billing-records', data.client_id] });
      }
    },
  });
}
