import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  ArrowLeft, 
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
  Search,
  UserPlus,
  Gift
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  type: string;
  label: string;
  timestamp: string;
  details?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string; // Ad creative
  term?: string; // Audience
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

export default function CustomerJourney() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch prospect attribution data (changed from lead_attribution to prospect_attribution)
  const { data: attribution, isLoading: loadingAttribution } = useQuery({
    queryKey: ['prospect-attribution', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('prospect_attribution')
        .select('*')
        .eq('prospect_id', id)
        .single();
      
      if (error) {
        console.error('Error fetching attribution:', error);
        return null;
      }
      return data;
    },
    enabled: !!id,
  });

  // Fetch prospect data (changed from leads to prospects)
  const { data: prospect, isLoading: loadingProspect } = useQuery({
    queryKey: ['prospect-detail', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching prospect:', error);
        return null;
      }
      return data;
    },
    enabled: !!id,
  });

  // Fetch all visitor events
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['visitor-events', attribution?.visitor_id],
    queryFn: async () => {
      if (!attribution?.visitor_id) return [];
      
      const { data, error } = await supabase
        .from('visitor_events')
        .select('*')
        .eq('visitor_id', attribution.visitor_id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching events:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!attribution?.visitor_id,
  });

  // Fetch visitor sessions
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['visitor-sessions', attribution?.visitor_id],
    queryFn: async () => {
      if (!attribution?.visitor_id) return [];
      
      const { data, error } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('visitor_id', attribution.visitor_id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!attribution?.visitor_id,
  });

  // Fetch conversions (sales)
  const { data: conversions } = useQuery({
    queryKey: ['visitor-conversions', attribution?.visitor_id],
    queryFn: async () => {
      if (!attribution?.visitor_id) return [];
      
      const { data, error } = await supabase
        .from('conversions')
        .select('*')
        .eq('visitor_id', attribution.visitor_id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching conversions:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!attribution?.visitor_id,
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Prospect Journey</h1>
          {prospect && (
            <p className="text-muted-foreground">
              {prospect.name} • {prospect.email}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      ) : !attribution ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Attribution Data Found</p>
            <p className="text-muted-foreground">
              This lead doesn't have tracking data linked yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Attribution Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">First Touch</p>
                    <p className="font-semibold capitalize">
                      {attribution.first_touch_source || 'Direct'}
                    </p>
                    {attribution.first_touch_campaign && (
                      <p className="text-xs text-muted-foreground truncate">
                        {attribution.first_touch_campaign}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <MousePointer className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Touch</p>
                    <p className="font-semibold capitalize">
                      {attribution.last_touch_source || 'Direct'}
                    </p>
                    {attribution.last_touch_campaign && (
                      <p className="text-xs text-muted-foreground truncate">
                        {attribution.last_touch_campaign}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time to Convert</p>
                    <p className="font-semibold">
                      {attribution.time_to_conversion_hours 
                        ? `${Number(attribution.time_to_conversion_hours).toFixed(1)}h`
                        : 'Instant'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attribution.total_sessions || 1} sessions, {attribution.total_page_views || 0} pages
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <DollarSign className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="font-semibold">
                      ${totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conversions?.length || 0} transaction(s)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Journey Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No journey events recorded
                </p>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
                  
                  <div className="space-y-6">
                    {timeline.map((event, index) => {
                      const Icon = getEventIcon(event.type);
                      const colorClass = getEventColor(event.type);
                      
                      return (
                        <div key={index} className="relative flex items-start gap-4 pl-2">
                          {/* Icon */}
                          <div className={cn(
                            "z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background",
                            colorClass
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium capitalize">{event.label}</span>
                              <Badge variant="outline" className={colorClass}>
                                {event.type.replace('_', ' ')}
                              </Badge>
                              {event.amount && (
                                <Badge className="bg-success text-success-foreground">
                                  ${event.amount.toLocaleString()}
                                </Badge>
                              )}
                              {/* Platform badge for sessions */}
                              {event.type === 'session_start' && event.source && (
                                <Badge variant="secondary" className="gap-1">
                                  {(() => {
                                    const PlatformIcon = getPlatformIcon(event.source);
                                    return <PlatformIcon className="w-3 h-3" />;
                                  })()}
                                  {event.source}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(event.timestamp), 'MMM d, yyyy • h:mm a')}
                            </p>
                            {/* Enhanced attribution details */}
                            {event.type === 'session_start' && (
                              <div className="mt-2 text-xs space-y-1">
                                {event.campaign && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Target className="w-3 h-3" />
                                    <span>Campaign: <span className="text-foreground">{event.campaign}</span></span>
                                  </div>
                                )}
                                {event.content && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Image className="w-3 h-3" />
                                    <span>Ad: <span className="text-foreground">{event.content}</span></span>
                                  </div>
                                )}
                                {event.term && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Search className="w-3 h-3" />
                                    <span>Search term: <span className="text-foreground">{event.term}</span></span>
                                  </div>
                                )}
                                {event.referralCode && (
                                  <div className="flex items-center gap-2 text-primary">
                                    <UserPlus className="w-3 h-3" />
                                    <span>Referred by: <span className="font-medium">{event.referralCode}</span></span>
                                  </div>
                                )}
                              </div>
                            )}
                            {event.details && event.type !== 'session_start' && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
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
  );
}
