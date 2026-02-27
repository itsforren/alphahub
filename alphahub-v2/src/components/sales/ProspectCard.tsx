import { useState, useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Phone, Calendar, DollarSign, CheckCircle2, XCircle, AlertCircle, Clock,
  Target, HelpCircle, UserCheck, Users, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProspectWithAttribution, useUploadHeadshot } from '@/hooks/useSalesPipeline';
import { format, isPast } from 'date-fns';
import { NEXT_ACTION_CONFIG, NextActionType } from './NextActionSelector';
import { toast } from 'sonner';

interface ProspectCardProps {
  prospect: ProspectWithAttribution;
  onClick: () => void;
}

function getInitials(name?: string | null, email?: string): string {
  const cleaned = (name || '').trim();
  if (cleaned) {
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
}

function AppointmentStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    not_booked: {
      icon: <Calendar className="w-3 h-3" />,
      label: "Not Booked",
      className: "bg-muted text-muted-foreground border-border",
    },
    confirmed: {
      icon: <Clock className="w-3 h-3" />,
      label: "Scheduled",
      className: "bg-primary/10 text-primary border-primary/20",
    },
    scheduled: {
      icon: <Clock className="w-3 h-3" />,
      label: "Scheduled",
      className: "bg-primary/10 text-primary border-primary/20",
    },
    completed: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: "Completed",
      className: "bg-success/10 text-success border-success/20",
    },
    cancelled: {
      icon: <XCircle className="w-3 h-3" />,
      label: "Cancelled",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
    no_show: {
      icon: <AlertCircle className="w-3 h-3" />,
      label: "No Show",
      className: "bg-warning/10 text-warning border-warning/20",
    },
    rescheduled: {
      icon: <Calendar className="w-3 h-3" />,
      label: "Rescheduled",
      className: "bg-muted text-muted-foreground border-border",
    },
  };

  const config = statusConfig[status] || {
    icon: <Clock className="w-3 h-3" />,
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 gap-1", config.className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

function IntentBadge({ intent }: { intent: string | null }) {
  if (!intent || intent === 'unsure') return null;
  
  const config: Record<string, { label: string; className: string }> = {
    join_partner: { label: 'Join Partner', className: 'bg-violet-500/10 text-violet-500' },
    system_only: { label: 'System Only', className: 'bg-blue-500/10 text-blue-500' },
  };
  
  const c = config[intent];
  if (!c) return null;
  
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border-transparent", c.className)}>
      <Target className="w-3 h-3 mr-0.5" />
      {c.label}
    </Badge>
  );
}

function QualStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  
  const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    unreviewed: { 
      icon: <HelpCircle className="w-3 h-3" />,
      label: 'Review', 
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' 
    },
    qualified: { 
      icon: <UserCheck className="w-3 h-3" />,
      label: 'Qualified', 
      className: 'bg-success/10 text-success border-success/20' 
    },
    disqualified: { 
      icon: <XCircle className="w-3 h-3" />,
      label: 'DQ', 
      className: 'bg-destructive/10 text-destructive border-destructive/20' 
    },
  };
  
  const c = config[status];
  if (!c) return null;
  
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 gap-0.5", c.className)}>
      {c.icon}
      {c.label}
    </Badge>
  );
}

function OwnerBadge({ role }: { role: string | null }) {
  if (!role) return null;
  
  const config: Record<string, { label: string; className: string }> = {
    setter: { label: 'Setter', className: 'bg-blue-500/10 text-blue-500' },
    closer: { label: 'Closer', className: 'bg-purple-500/10 text-purple-500' },
    onboarding: { label: 'Onboard', className: 'bg-green-500/10 text-green-500' },
  };
  
  const c = config[role];
  if (!c) return null;
  
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border-transparent", c.className)}>
      <Users className="w-3 h-3 mr-0.5" />
      {c.label}
    </Badge>
  );
}

export function ProspectCard({ prospect, onClick }: ProspectCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadHeadshot = useUploadHeadshot();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prospect.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = prospect.next_action_due_at && isPast(new Date(prospect.next_action_due_at));

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    setIsUploading(true);
    try {
      await uploadHeadshot.mutateAsync({ prospectId: prospect.id, file });
    } finally {
      setIsUploading(false);
    }
  }, [prospect.id, uploadHeadshot]);

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const getSourceBadge = () => {
    // Priority 1: Manual lead_source set to Referral
    if (prospect.lead_source === 'Referral') {
      // Get referrer name from relationship
      const referrer = (prospect as any).referrer;
      if (referrer?.name) {
        const nameParts = referrer.name.split(' ');
        const displayName = nameParts.length > 1 
          ? `${nameParts[0]} ${nameParts[1].charAt(0)}.`
          : nameParts[0];
        return `Ref: ${displayName}`;
      }
      return 'Referral';
    }
    
    // Priority 2: Manual lead_source (other values)
    if (prospect.lead_source) {
      return prospect.lead_source;
    }
    
    // Priority 3: Check for referral code in attribution - show "Ref: {Code}"
    const referralCode = prospect.attribution?.referral_code;
    if (referralCode) {
      // Try to format as name (e.g., "JoshyHarrold" -> "Ref: Joshy H.")
      // Split on camelCase or just show truncated
      const match = referralCode.match(/^([A-Z][a-z]+)([A-Z][a-z]+)/);
      if (match) {
        return `Ref: ${match[1]} ${match[2].charAt(0)}.`;
      }
      const displayCode = referralCode.length > 12 
        ? referralCode.slice(0, 10) + '...' 
        : referralCode;
      return `Ref: ${displayCode}`;
    }
    
    // Priority 4: If first_touch_source is "referral", show as Referral
    const source = prospect.attribution?.first_touch_source || 
                   prospect.attribution?.last_touch_source;
    
    if (source === 'referral') {
      return 'Referral';
    }
    
    // Filter out GHL sources
    if (!source || source.toLowerCase().includes('ghl')) return null;
    
    // Map to friendly names
    const sourceMap: Record<string, string> = {
      'facebook': 'Facebook',
      'fb': 'Facebook',
      'instagram': 'Instagram',
      'ig': 'Instagram',
      'youtube': 'YouTube',
      'yt': 'YouTube',
      'google': 'SEO',
      'organic': 'SEO',
      'partner': 'Partner',
      'direct': 'Direct',
    };
    
    const lowerSource = source.toLowerCase();
    for (const [key, value] of Object.entries(sourceMap)) {
      if (lowerSource.includes(key)) {
        return value;
      }
    }
    
    // If not in map and not ghl, show original (truncated)
    return source.length > 15 ? source.slice(0, 15) + '...' : source;
  };

  const getCallCountLabel = () => {
    const count = prospect.call_count ?? 0;
    if (count === 0) return '1st Call';
    if (count === 1) return '2nd Call';
    if (count === 2) return '3rd Call';
    return `${count + 1}th Call`;
  };

  const sourceBadge = getSourceBadge();
  const displayName = (prospect.name && prospect.name.trim().length > 0)
    ? prospect.name
    : (prospect.email ? prospect.email.split('@')[0] : '');
  const initials = getInitials(prospect.name, prospect.email);

  // Get next action config
  const nextActionConfig = prospect.next_action_type 
    ? NEXT_ACTION_CONFIG[prospect.next_action_type as NextActionType] 
    : null;

  return (
    <Card
      ref={setNodeRef}
      style={{
        ...style,
        touchAction: 'none', // Required for pointer events on touch devices
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "cursor-grab active:cursor-grabbing bg-card/80 hover:bg-card border-white/10 hover:border-primary/30 transition-all duration-200",
        isDragging && "opacity-50 scale-105 rotate-2 shadow-2xl",
        isOverdue && "border-destructive/50 bg-destructive/5"
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Avatar & Name Row */}
        <div className="flex items-start gap-2">
          {/* Avatar with drag-and-drop */}
          <div
            onClick={handleAvatarClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "relative flex-shrink-0 cursor-pointer group",
              isDragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full"
            )}
          >
            <Avatar className="h-9 w-9">
              {prospect.headshot_url ? (
                <AvatarImage src={prospect.headshot_url} alt={displayName} />
              ) : null}
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[8px] font-medium">Edit</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name & Contact */}
          <div className="flex items-start justify-between gap-2 flex-1 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm text-foreground truncate">{displayName}</p>
              {prospect.company && (
                <p className="text-xs text-muted-foreground truncate">{prospect.company}</p>
              )}
            </div>
            {prospect.phone && (
              <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
          </div>
        </div>

        {/* Badges Row 1: Partner, Intent, Call Type */}
        <div className="flex flex-wrap gap-1">
          {/* Partner Badge */}
          {prospect.partner && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 h-5 truncate max-w-full border-transparent text-white"
              style={{ backgroundColor: prospect.partner.color }}
            >
              {prospect.partner.name}
            </Badge>
          )}
          
          {/* Intent Badge */}
          <IntentBadge intent={prospect.intent} />

          {/* Appointment Status Badge */}
          <AppointmentStatusBadge status={prospect.appointment_status ?? null} />
        </div>

        {/* Badges Row 2: Qualification, Owner, Source, Call Count */}
        <div className="flex flex-wrap gap-1">
          {/* Call Count Badge */}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Phone className="w-3 h-3 mr-0.5" />
            {getCallCountLabel()}
          </Badge>
          
          {/* Qualification Status */}
          <QualStatusBadge status={prospect.qual_status} />
          
          {/* Owner Badge */}
          <OwnerBadge role={prospect.owner_role} />
          
          {/* Source Badge */}
          {sourceBadge && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 truncate max-w-full bg-primary/5 text-primary border-primary/20">
              {sourceBadge}
            </Badge>
          )}
        </div>

        {/* Next Action */}
        {nextActionConfig && (
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
            isOverdue ? "bg-destructive/10 text-destructive" : "bg-muted"
          )}>
            <nextActionConfig.icon className={cn("w-3.5 h-3.5", isOverdue ? "" : nextActionConfig.color)} />
            <span className="font-medium">{nextActionConfig.label}</span>
            {prospect.next_action_due_at && (
              <span className="text-[10px] ml-auto opacity-70">
                {format(new Date(prospect.next_action_due_at), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
        )}

        {/* Pending Payment Badge */}
        {prospect.payment_status === 'pending' && (prospect.payment_amount ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-amber-500/10 border border-amber-500/20">
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-medium text-amber-600 dark:text-amber-400">
              Pending ${(prospect.payment_amount ?? 0).toLocaleString()}
            </span>
          </div>
        )}

        {/* Bottom Row: Probability, Deal Value, No-Show Count */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
          {/* Probability */}
          <div className="flex items-center gap-1">
            <div 
              className={cn(
                "w-2 h-2 rounded-full",
                prospect.forecast_probability >= 70 ? "bg-success" :
                prospect.forecast_probability >= 40 ? "bg-warning" :
                "bg-muted-foreground"
              )}
            />
            <span className="text-[10px] text-muted-foreground">
              {prospect.forecast_probability}%
            </span>
          </div>

          {/* No-Show Count */}
          {prospect.appt_count_no_shows > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-warning">
              <AlertCircle className="w-3 h-3" />
              {prospect.appt_count_no_shows} NS
            </div>
          )}

          {/* Deal Value */}
          {prospect.deal_value > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-success">
              <DollarSign className="w-3 h-3" />
              {prospect.deal_value.toLocaleString()}
            </div>
          )}

          {/* Next Follow-up (fallback if no next_action) */}
          {!prospect.next_action_type && prospect.next_follow_up_at && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(new Date(prospect.next_follow_up_at), 'MMM d')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
