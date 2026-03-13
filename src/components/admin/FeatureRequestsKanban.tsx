import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Rocket,
  Loader2,
  MessageSquare,
  User,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FeatureRequest {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string; profile_image_url: string | null };
}

const COLUMNS = [
  { id: 'requested', label: 'Requested', icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'completed', label: 'Completed', icon: Rocket, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { id: 'disapproved', label: 'Disapproved', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
];

const CATEGORY_LABELS: Record<string, string> = {
  campaigns: 'Campaigns',
  billing: 'Billing',
  crm: 'CRM',
  hub: 'Hub',
  other: 'Other',
};

function useFeatureRequests() {
  return useQuery({
    queryKey: ['feature-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*, clients(name, profile_image_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FeatureRequest[];
    },
  });
}

function useUpdateFeatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FeatureRequest> }) => {
      const { error } = await supabase
        .from('feature_requests')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
    },
  });
}

function RequestCard({ request, onStatusChange }: { request: FeatureRequest; onStatusChange: (id: string, status: string) => void }) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(request.admin_notes || '');
  const updateRequest = useUpdateFeatureRequest();

  const saveNotes = () => {
    updateRequest.mutate(
      { id: request.id, updates: { admin_notes: notes || null } },
      { onSuccess: () => toast.success('Notes saved') },
    );
    setShowNotes(false);
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2 hover:border-border transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground leading-tight">{request.title}</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COLUMNS.map((col) => (
              <DropdownMenuItem
                key={col.id}
                onClick={() => onStatusChange(request.id, col.id)}
                disabled={request.status === col.id}
              >
                <col.icon className={cn('w-4 h-4 mr-2', col.color)} />
                {col.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {request.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {request.description}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {request.category && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {CATEGORY_LABELS[request.category] || request.category}
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(request.created_at), 'MMM d')}
        </span>
      </div>

      {/* Client */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {request.clients?.profile_image_url ? (
            <img src={request.clients.profile_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate">{request.clients?.name || 'Unknown'}</span>

        <button
          onClick={() => setShowNotes(!showNotes)}
          className={cn(
            'ml-auto p-1 rounded hover:bg-muted transition-colors',
            request.admin_notes && 'text-primary',
          )}
          title="Admin notes"
        >
          <MessageSquare className="w-3 h-3" />
        </button>
      </div>

      {/* Admin notes */}
      {showNotes && (
        <div className="space-y-1.5 pt-1">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes..."
            rows={2}
            className="text-xs resize-none"
          />
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowNotes(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-6 text-xs" onClick={saveNotes} disabled={updateRequest.isPending}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeatureRequestsKanban() {
  const { data: requests, isLoading } = useFeatureRequests();
  const updateRequest = useUpdateFeatureRequest();

  const handleStatusChange = (id: string, status: string) => {
    updateRequest.mutate(
      { id, updates: { status } },
      { onSuccess: () => toast.success(`Moved to ${COLUMNS.find(c => c.id === status)?.label}`) },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: (requests || []).filter((r) => r.status === col.id),
  }));

  const totalRequests = requests?.length || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold">Feature Requests</h1>
          <Badge variant="secondary" className="rounded-full">{totalRequests}</Badge>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {grouped.map((col) => (
            <div
              key={col.id}
              className={cn('w-72 flex flex-col rounded-xl border', col.border, col.bg)}
            >
              {/* Column Header */}
              <div className="p-3 flex items-center gap-2">
                <col.icon className={cn('w-4 h-4', col.color)} />
                <span className="text-sm font-semibold">{col.label}</span>
                <Badge variant="secondary" className="ml-auto rounded-full text-xs h-5 min-w-[20px] flex items-center justify-center">
                  {col.items.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {col.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/50">
                    <p className="text-xs">No requests</p>
                  </div>
                ) : (
                  col.items.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
