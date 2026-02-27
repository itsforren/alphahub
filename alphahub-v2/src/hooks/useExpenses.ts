import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExpenseCategory {
  id: string;
  name: string;
  parent_id: string | null;
  color: string;
  icon: string;
  is_tax_deductible: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  plaid_item_id: string | null;
  institution_name: string;
  institution_id: string | null;
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  mask: string | null;
  current_balance: number;
  available_balance: number | null;
  currency_code: string;
  last_synced_at: string | null;
  is_active: boolean;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  bank_account_id: string | null;
  category_id: string | null;
  plaid_transaction_id: string | null;
  transaction_date: string;
  posted_date: string | null;
  merchant_name: string | null;
  description: string;
  amount: number;
  currency_code: string;
  is_pending: boolean;
  is_recurring: boolean;
  is_manual_entry: boolean;
  is_auto_categorized: boolean;
  receipt_url: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory | null;
  bank_account?: { id: string; institution_name: string; account_name: string; mask: string | null } | null;
}

export interface CategorizationRule {
  id: string;
  category_id: string;
  rule_name: string;
  match_type: 'exact' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
  match_value: string;
  match_field: 'merchant_name' | 'description';
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory;
}

// Expense Categories
export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });
}

// Bank Accounts
export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BankAccount[];
    },
  });
}

export function useCreateManualBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: {
      institution_name: string;
      account_name: string;
      account_type: string;
      current_balance?: number;
    }) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          ...account,
          is_manual: true,
          current_balance: account.current_balance || 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as BankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

// Expenses
export function useExpenses(filters?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  bankAccountId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          category:expense_categories(*),
          bank_account:bank_accounts(id, institution_name, account_name, mask)
        `)
        .order('transaction_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.bankAccountId) {
        query = query.eq('bank_account_id', filters.bankAccountId);
      }
      if (filters?.search) {
        query = query.or(`merchant_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.limit(500);
      
      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: {
      bank_account_id?: string;
      category_id?: string;
      transaction_date: string;
      merchant_name?: string;
      description: string;
      amount: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expense,
          is_manual_entry: true,
        })
        .select(`
          *,
          category:expense_categories(*),
          bank_account:bank_accounts(id, institution_name, account_name, mask)
        `)
        .single();
      
      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useBulkUpdateExpenseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseIds, categoryId }: { expenseIds: string[]; categoryId: string }) => {
      const { error } = await supabase
        .from('expenses')
        .update({ category_id: categoryId, is_auto_categorized: false })
        .in('id', expenseIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

// Categorization Rules
export function useCategorizationRules() {
  return useQuery({
    queryKey: ['categorization-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorization_rules')
        .select(`
          *,
          category:expense_categories(*)
        `)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as CategorizationRule[];
    },
  });
}

export function useCreateCategorizationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: {
      category_id: string;
      rule_name: string;
      match_type: string;
      match_value: string;
      match_field?: string;
      priority?: number;
    }) => {
      const { data, error } = await supabase
        .from('categorization_rules')
        .insert(rule)
        .select(`
          *,
          category:expense_categories(*)
        `)
        .single();
      
      if (error) throw error;
      return data as CategorizationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
    },
  });
}

export function useUpdateCategorizationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CategorizationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('categorization_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as CategorizationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
    },
  });
}

export function useDeleteCategorizationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorization_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorization-rules'] });
    },
  });
}

// Expense Summary
export function useExpenseSummary(period: 'month' | 'quarter' | 'year' = 'month') {
  return useQuery({
    queryKey: ['expense-summary', period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          amount,
          category:expense_categories(id, name, color, is_tax_deductible)
        `)
        .gte('transaction_date', startDate.toISOString().split('T')[0]);

      if (error) throw error;

      // Calculate totals by category
      const byCategory: Record<string, { name: string; color: string; total: number; isTaxDeductible: boolean }> = {};
      let total = 0;
      let taxDeductible = 0;

      for (const expense of data || []) {
        total += expense.amount;
        const cat = expense.category as ExpenseCategory | null;
        
        if (cat) {
          if (!byCategory[cat.id]) {
            byCategory[cat.id] = {
              name: cat.name,
              color: cat.color,
              total: 0,
              isTaxDeductible: cat.is_tax_deductible,
            };
          }
          byCategory[cat.id].total += expense.amount;
          if (cat.is_tax_deductible) {
            taxDeductible += expense.amount;
          }
        }
      }

      return {
        total,
        taxDeductible,
        byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
      };
    },
  });
}
