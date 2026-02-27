import { format, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { 
  MousePointer, 
  Eye, 
  FormInput, 
  DollarSign,
  Calendar,
  Mail,
  Globe,
  Target,
  Clock,
  User,
  Image,
  Users,
  Facebook,
  Youtube,
  X,
  Search,
  UserPlus,
  Gift
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CustomerJourneyDialogProps {
  prospectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TimelineEvent {
  type: string;
  label: string;
  timestamp: string;
  details?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  amount?: number;
  referralCode?: string;
}

function getPlatformIcon(source: string | undefined) {
  switch (source?.toLowerCase()) {
    case 'facebook':
      return Facebook;
    case 'youtube':
      return Youtube;
    case 'referral':
      return UserPlus;
    default:
      return Globe;
  }
}

function getEventIcon(type: string) {
  switch (type) {
    case 'session_start':
      return Globe;
    case 'page_view':
      return Eye;
    case 'button_click':
      return MousePointer;
    case 'form_start':
    case 'form_submit':
      return FormInput;
    case 'lead':
    case 'booking':
      return Mail;
    case 'sale':
      return DollarSign;
    case 'referral_link_clicked':
      return UserPlus;
    default:
      return Calendar;
  }
}

function getEventColor(type: string) {
  switch (type) {
    case 'session_start':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'page_view':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'button_click':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'form_start':
    case 'form_submit':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'lead':
    case 'booking':
      return 'bg-success/10 text-success border-success/20';
    case 'sale':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'referral_link_clicked':
      return 'bg-primary/10 text-primary border-primary/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function CustomerJourneyDialog({ prospectId, open, onOpenChange }: CustomerJourneyDialogProps) {
  // Fetch prospect data
  const { data: prospect, isLoading: loadingProspect } = useQuery({
    queryKey: ['prospect-detail', prospectId],
    queryFn: async () => {
      if (!prospectId) return null;
      
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', prospectId)
        .single();
      
      if (error) {
        console.error('Error fetching prospect:', error);
        return null;
      }
      return data;
    },
    enabled: !!prospectId && open,
  });

  // Fetch prospect attribution data
  const { data: attribution, isLoading: loadingAttribution } = useQuery({
    queryKey: ['prospect-attribution', prospectId],
    queryFn: async () => {
      if (!prospectId) return null;
      
      const { data, error } = await supabase
        .from('prospect_attribution')
        .select('*')
        .eq('prospect_id', prospectId)
        .single();
      
      if (error) {
        console.error('Error fetching attribution:', error);
        return null;
      }
      return data;
    },
    enabled: !!prospectId && open,
  });

  // Get all possible visitor IDs to look up (from attribution AND prospect directly)
  const visitorIds = [
    attribution?.visitor_id,
    prospect?.visitor_id,
  ].filter(Boolean).filter((id, idx, arr) => arr.indexOf(id) === idx);

  // Fetch all visitor events using ALL possible visitor IDs
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['visitor-events', visitorIds],
    queryFn: async () => {
      if (visitorIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('visitor_events')
        .select('*')
        .in('visitor_id', visitorIds)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching events:', error);
        return [];
      }
      return data || [];
    },
    enabled: visitorIds.length > 0 && open,
  });

  // Fetch visitor sessions using ALL possible visitor IDs
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['visitor-sessions', visitorIds],
    queryFn: async () => {
      if (visitorIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('visitor_sessions')
        .select('*')
        .in('visitor_id', visitorIds)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }
      return data || [];
    },
    enabled: visitorIds.length > 0 && open,
  });

  // Fetch conversions (sales)
  const { data: conversions } = useQuery({
    queryKey: ['visitor-conversions', visitorIds],
    queryFn: async () => {
      if (visitorIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('conversions')
        .select('*')
        .in('visitor_id', visitorIds)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching conversions:', error);
        return [];
      }
      return data || [];
    },
    enabled: visitorIds.length > 0 && open,
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
  (events || []).forEach((event) => {
    if (event.event_type === 'session_start') return; // Skip, handled above
    
    // Special handling for referral_link_clicked events
    if (event.event_type === 'referral_link_clicked') {
      const eventData = event.event_data as { referral_code?: string; is_first_touch?: boolean; existing_code?: string } | null;
      const isFirstTouch = eventData?.is_first_touch === true;
      const refCode = eventData?.referral_code || 'Unknown';
      
      timeline.push({
        type: event.event_type,
        label: isFirstTouch 
          ? `First Referral: ${refCode}` 
          : `Referral Click: ${refCode}`,
        timestamp: event.created_at,
        details: isFirstTouch 
          ? `✓ Gets commission credit` 
          : `Ignored (first-touch: ${eventData?.existing_code || 'unknown'})`,
        referralCode: refCode,
      });
      return;
    }
    
    timeline.push({
      type: event.event_type,
      label: event.element_text || event.event_type.replace(/_/g, ' '),
      timestamp: event.created_at,
      details: event.page_url,
    });
  });

  // Add prospect creation (booking/application)
  if (prospect) {
    timeline.push({
      type: 'booking',
      label: prospect.appointment_status ? 'Call Booked' : 'Application Submitted',
      timestamp: prospect.created_at,
      details: `${prospect.name} - ${prospect.email}`,
    });
  }

  // Add conversions (sales)
  (conversions || []).forEach((conv) => {
    timeline.push({
      type: 'sale',
      label: 'Purchase Completed',
      timestamp: conv.created_at,
      amount: Number(conv.amount),
      details: conv.product_name,
    });
  });

  // Sort by timestamp
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const isLoading = loadingAttribution || loadingProspect || loadingEvents || loadingSessions;

  // Calculate total revenue
  const totalRevenue = (conversions || []).reduce((sum, c) => sum + Number(c.amount), 0);

  // Calculate time from first session to booking
  const firstSession = sessions?.[0]?.created_at;
  const bookingTime = prospect?.created_at;
  let timeToConvert: string | null = null;
  
  if (firstSession && bookingTime) {
    const diffMs = new Date(bookingTime).getTime() - new Date(firstSession).getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) {
      timeToConvert = `${diffMins} min`;
    } else {
      timeToConvert = `${(diffMins / 60).toFixed(1)} hrs`;
    }
  }

  const hasJourneyData = timeline.length > 1 || (sessions && sessions.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Prospect Journey</DialogTitle>
              {prospect && (
                <p className="text-sm text-muted-foreground mt-1">
                  {prospect.name} • {prospect.email}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-100px)]">
          <div className="p-6 pt-4 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-48" />
              </div>
            ) : !hasJourneyData ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <User className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-lg font-medium">No Journey Data Found</p>
                  <p className="text-sm text-muted-foreground">
                    This prospect's website activity couldn't be tracked. They may have booked directly through a shared calendar link.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Attribution Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">First Touch</p>
                        <p className="font-semibold text-sm capitalize truncate">
                          {attribution?.first_touch_source || sessions?.[0]?.utm_source || 'Direct'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-orange-500/10">
                        <MousePointer className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Last Touch</p>
                        <p className="font-semibold text-sm capitalize truncate">
                          {attribution?.last_touch_source || sessions?.[sessions.length - 1]?.utm_source || 'Direct'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <Clock className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Time to Convert</p>
                        <p className="font-semibold text-sm">
                          {timeToConvert || 'Instant'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-success/10">
                        <DollarSign className="w-4 h-4 text-success" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="font-semibold text-sm">
                          ${totalRevenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Timeline */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Journey Timeline
                    </h3>
                    
                    {timeline.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6">
                        No journey events recorded
                      </p>
                    ) : (
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
                                      {event.referralCode && (
                                        <div className="flex items-center gap-1.5 text-primary">
                                          <UserPlus className="w-3 h-3" />
                                          <span>Referred by: <span className="font-medium">{event.referralCode}</span></span>
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
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
