import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  email: z.string().email('Invalid email address').max(255, 'Email is too long'),
  phone: z.string().max(20, 'Phone number is too long').optional(),
  notes: z.string().max(500, 'Notes are too long').optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddReferralPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddReferralPartnerDialog({ open, onOpenChange }: AddReferralPartnerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      notes: '',
    },
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      // 1. Create the referral partner record
      const { data: partner, error: partnerError } = await supabase
        .from('referral_partners')
        .insert({
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          email: data.email.toLowerCase().trim(),
          phone: data.phone?.trim() || null,
          notes: data.notes?.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (partnerError) {
        if (partnerError.code === '23505') {
          toast.error('A partner with this email already exists');
          return;
        }
        throw partnerError;
      }

      // 2. Generate referral code for the partner
      const { error: codeError } = await supabase
        .rpc('get_or_create_partner_referral_code', { p_partner_id: partner.id });

      if (codeError) {
        console.error('Error generating referral code:', codeError);
        // Non-fatal - partner was created
      }

      // 3. Create auth user account for the partner
      const { data: userData, error: userError } = await supabase.functions.invoke('create-user-account', {
        body: {
          email: data.email.toLowerCase().trim(),
          name: `${data.first_name.trim()} ${data.last_name.trim()}`,
          role: 'referrer',
          userType: 'referrer',
          partnerId: partner.id,
        },
      });

      if (userError) {
        console.error('Error creating user account:', userError);
        toast.warning('Partner created but user account setup failed. They may need to be set up manually.');
      } else if (userData?.error) {
        console.error('User account error:', userData.error);
        toast.warning(`Partner created but: ${userData.error}`);
      } else {
        toast.success('Referral partner added! They will receive an email to set their password.');
      }

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['all-referral-partners'] });
      queryClient.invalidateQueries({ queryKey: ['referring-agents'] });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding referral partner:', error);
      toast.error('Failed to add referral partner');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add Referral Partner
          </DialogTitle>
          <DialogDescription>
            Add an external referrer who can earn commissions without being a full Alpha Agent client.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional notes about this partner..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Partner'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
