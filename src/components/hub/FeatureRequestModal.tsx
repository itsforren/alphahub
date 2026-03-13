import { useState } from 'react';
import { Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { useClient } from '@/hooks/useClientData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FeatureRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureRequestModal({ open, onOpenChange }: FeatureRequestModalProps) {
  const { data: client } = useClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !client?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('feature_requests')
        .insert({
          client_id: client.id,
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          status: 'requested',
        });

      if (error) throw error;

      toast.success('Feature request submitted! We review every single one.');
      setTitle('');
      setDescription('');
      setCategory('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-md p-0 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl bg-background/95 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-900 via-purple-800 to-indigo-800 px-5 sm:px-6 pt-6 pb-8 text-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
          <div className="relative z-10 flex items-center justify-center gap-2 mb-2">
            <Lightbulb className="w-6 h-6 text-amber-300" />
            <Sparkles className="w-4 h-4 text-purple-300" />
          </div>
          <DialogTitle className="text-white text-lg sm:text-xl font-bold relative z-10 tracking-tight">
            Request a Feature
          </DialogTitle>
          <p className="text-white/60 text-xs mt-1.5 relative z-10">
            Your ideas shape what we build next
          </p>
        </div>

        {/* Form */}
        <div className="px-5 sm:px-6 pt-4 pb-5 sm:pb-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              What do you need? <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Show my ROI breakdown by state"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Tell us more <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <Textarea
              placeholder="Describe how this would help your business..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Category <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="campaigns">Campaigns & Ads</SelectItem>
                <SelectItem value="billing">Billing & Payments</SelectItem>
                <SelectItem value="crm">CRM & Leads</SelectItem>
                <SelectItem value="hub">Hub & Dashboard</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="w-full bg-gradient-to-r from-violet-900 to-indigo-800 hover:from-violet-950 hover:to-indigo-900 text-white font-semibold py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Lightbulb className="w-4 h-4 mr-2" />
            )}
            Submit Request
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            We read every request and use them to prioritize what we build.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
