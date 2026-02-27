import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  MousePointer, 
  Eye, 
  FormInput, 
  DollarSign,
  Calendar,
  Globe,
  Target,
  Clock,
  CheckCircle2,
  Activity,
  Image,
  Search,
  Phone,
  Facebook,
  Youtube,
  UserPlus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface JourneyTimelineProps {
  prospectId: string | null;
  prospect: any;
}

interface TimelineEvent {
  type: string;
  label: string;
  timestamp: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  details?: string;
  amount?: number;
  referralCode?: string;
}

// Helper function to get icon for traffic source
function getPlatformIcon(source: string | undefined) {
  if (!source) return Globe;
  const lowerSource = source.toLowerCase();
  if (lowerSource === 'referral') {
    return UserPlus;
  }
  if (lowerSource.includes('facebook') || lowerSource.includes('fb') || lowerSource.includes('instagram') || lowerSource.includes('ig')) {
    return Facebook;
  }
  if (lowerSource.includes('youtube') || lowerSource.includes('yt')) {
    return Youtube;
  }
  return Globe;
}

// Helper to get icon for event type
function getEventIcon(type: string) {
  switch (type) {
    case 'page_view':
      return Eye;
    case 'button_click':
    case 'click':
      return MousePointer;
    case 'form_start':
    case 'form_submit':
      return FormInput;
    case 'session_start':
      return Globe;
    case 'booking':
    case 'application':
      return CheckCircle2;
    case 'sale':
      return DollarSign;
    case 'call_scheduled':
      return Calendar;
    case 'call_completed':
      return Phone;
    default:
      return Activity;
  }
}

// Helper to get color class for event type
function getEventColor(type: string) {
  switch (type) {
    case 'session_start':
      return 'border-green-500 text-green-500';
    case 'page_view':
      return 'border-blue-500 text-blue-500';
    case 'button_click':
    case 'click':
      return 'border-yellow-500 text-yellow-500';
    case 'form_start':
    case 'form_submit':
      return 'border-orange-500 text-orange-500';
    case 'booking':
    case 'application':
      return 'border-emerald-500 text-emerald-500';
    case 'sale':
      return 'border-green-600 text-green-600';
    case 'call_scheduled':
    case 'call_completed':
      return 'border-primary text-primary';
    default:
      return 'border-muted-foreground text-muted-foreground';
  }
}

export function JourneyTimeline({ prospectId, prospect }: JourneyTimelineProps) {
  // Get visitor_id from prospect
  const visitorId = prospect?.visitor_id;

  // Fetch visitor sessions
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['prospect-sessions', visitorId],
    queryFn: async () => {
      if (!visitorId) return [];
      
      const { data, error } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('visitor_id', visitorId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!visitorId,
  });

  // Fetch visitor events
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['prospect-events', visitorId],
    queryFn: async () => {
      if (!visitorId) return [];
      
      const { data, error } = await supabase
        .from('visitor_events')
        .select('*')
        .eq('visitor_id', visitorId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching events:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!visitorId,
  });

  // Build timeline
  const timeline: TimelineEvent[] = [];

  // Add sessions as "entry points"
  (sessions || []).forEach((session: any) => {
    const hasReferral = session.referral_code && session.referral_code !== '';
    
    const adLabel = hasReferral
      ? `Referral: ${session.referral_code}`
      : session.utm_content 
        ? `Ad: ${session.utm_content}` 
        : session.utm_campaign 
          ? `Campaign: ${session.utm_campaign}`
          : session.referrer_url 
            ? `Referrer: ${session.referrer_url}`
            : 'Direct visit';
    
    // Build a descriptive label including medium (organic, cpc, etc.)
    const sourceName = hasReferral
      ? 'Referral'
      : session.utm_source 
        ? session.utm_source.charAt(0).toUpperCase() + session.utm_source.slice(1)
        : 'Direct';
    const mediumLabel = !hasReferral && session.utm_medium && session.utm_medium !== 'none'
      ? ` (${session.utm_medium})`
      : '';
    
    timeline.push({
      type: 'session_start',
      label: `Visited From ${sourceName}${mediumLabel}`,
      timestamp: session.created_at,
      source: hasReferral ? 'referral' : session.utm_source,
      medium: session.utm_medium,
      campaign: session.utm_campaign,
      content: session.utm_content,
      term: session.utm_term,
      details: `${adLabel} • ${session.landing_page || '/'}`,
      referralCode: session.referral_code,
    });
  });

  // Add events (dedupe by filtering out session_start since we handle those above)
  (events || []).forEach((event: any) => {
    if (event.event_type === 'session_start') return; // Skip, handled above
    
    timeline.push({
      type: event.event_type,
      label: event.element_text || event.event_type.replace(/_/g, ' '),
      timestamp: event.created_at,
      details: event.page_url,
    });
  });

  // Add application submission
  if (prospect?.application_submitted_at) {
    timeline.push({
      type: 'application',
      label: 'Application Submitted',
      timestamp: prospect.application_submitted_at,
      details: `${prospect.name} - ${prospect.email}`,
    });
  } else if (prospect?.created_at) {
    timeline.push({
      type: 'booking',
      label: prospect.source_page === 'ghl_webhook' ? 'Booking Created' : 'Lead Created',
      timestamp: prospect.created_at,
      details: `${prospect.name} - ${prospect.email}`,
    });
  }

  // Add scheduled call
  if (prospect?.appt_start_at) {
    timeline.push({
      type: 'call_scheduled',
      label: prospect.call_type === 'onboarding_call' ? 'Onboarding Call Scheduled' : 'Discovery Call Scheduled',
      timestamp: prospect.appt_start_at,
    });
  }

  // Add conversion
  if (prospect?.payment_status === 'paid' && prospect?.converted_at) {
    timeline.push({
      type: 'sale',
      label: 'Payment Received',
      timestamp: prospect.converted_at,
      amount: prospect.payment_amount,
    });
  }

  // Sort by timestamp
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const isLoading = loadingSessions || loadingEvents;

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-white/10">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!visitorId || timeline.length === 0) {
    return (
      <Card className="bg-card/50 border-white/10">
        <CardContent className="p-6 text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No journey data available</p>
          <p className="text-xs text-muted-foreground mt-1">
            This prospect may have booked directly through a shared link
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-white/10">
      <CardContent className="p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          
          <div className="space-y-4">
            {timeline.map((event, index) => {
              const Icon = getEventIcon(event.type);
              const colorClass = getEventColor(event.type);
              
              return (
                <div key={index} className="relative flex items-start gap-3 pl-0">
                  {/* Icon */}
                  <div className={cn(
                    "z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background shrink-0",
                    colorClass
                  )}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-medium text-sm capitalize truncate">{event.label}</span>
                      <Badge variant="outline" className={cn("text-xs", colorClass)}>
                        {event.type.replace(/_/g, ' ')}
                      </Badge>
                      {event.amount && (
                        <Badge className="bg-success text-success-foreground text-xs">
                          ${event.amount.toLocaleString()}
                        </Badge>
                      )}
                      {/* Platform badge for sessions */}
                      {event.type === 'session_start' && event.source && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          {(() => {
                            const PlatformIcon = getPlatformIcon(event.source);
                            return <PlatformIcon className="w-3 h-3" />;
                          })()}
                          {event.source}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(event.timestamp), 'MMM d, yyyy • h:mm a')}
                    </p>
                    {/* Attribution details */}
                    {event.type === 'session_start' && (
                      <div className="mt-1 text-xs space-y-0.5">
                        {event.referralCode && (
                          <div className="flex items-center gap-1.5 text-primary">
                            <UserPlus className="w-3 h-3" />
                            <span>Referred by: <span className="font-medium">{event.referralCode}</span></span>
                          </div>
                        )}
                        {event.campaign && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Target className="w-3 h-3" />
                            <span>Campaign: <span className="text-foreground">{event.campaign}</span></span>
                          </div>
                        )}
                        {event.content && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Image className="w-3 h-3" />
                            <span>Ad: <span className="text-foreground">{event.content}</span></span>
                          </div>
                        )}
                        {event.term && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Search className="w-3 h-3" />
                            <span>Search term: <span className="text-foreground">{event.term}</span></span>
                          </div>
                        )}
                      </div>
                    )}
                    {event.details && event.type !== 'session_start' && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {event.details}
                      </p>
                    )}
                    {event.type === 'session_start' && event.details && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {event.details}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}