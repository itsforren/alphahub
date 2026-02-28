import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, parseISO } from 'date-fns';
import { 
  TrendingUp, 
  Users, 
  MousePointer, 
  Link2,
  Eye,
  Target,
  RefreshCw,
  DollarSign,
  ExternalLink,
  Wrench,
  CreditCard,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  UserCheck,
  Play,
  RotateCcw,
  Database,
  Globe,
  Facebook,
  Youtube,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UTMBuilder } from '@/components/attribution/UTMBuilder';
import { TrackingSetupGuide } from '@/components/attribution/TrackingSetupGuide';
import { CampaignDrilldown } from '@/components/attribution/CampaignDrilldown';
import { GHLWebhookSetup } from '@/components/sales/GHLWebhookSetup';
import { CustomerJourneyDialog } from '@/components/attribution/CustomerJourneyDialog';

// Stat Card component
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  change,
  color 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  change?: string;
  color: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {change && (
              <p className="text-xs text-success mt-1">{change}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", color)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Attribution debug data type
interface AttributionDebug {
  visitorId: string | null;
  firstTouch: Record<string, any> | null;
  lastTouch: Record<string, any> | null;
}

export default function Attribution() {
  const queryClient = useQueryClient();
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [journeyDialogOpen, setJourneyDialogOpen] = useState(false);
  const [dateRange] = useState({ 
    start: subDays(new Date(), 30), 
    end: new Date() 
  });
  const [attributionDebug, setAttributionDebug] = useState<AttributionDebug>({
    visitorId: null,
    firstTouch: null,
    lastTouch: null,
  });

  // Load current localStorage attribution data
  useEffect(() => {
    const loadAttribution = () => {
      try {
        const visitorId = localStorage.getItem('alpha_visitor_id');
        const firstTouchRaw = localStorage.getItem('alpha_first_touch');
        const lastTouchRaw = localStorage.getItem('alpha_last_touch');
        
        setAttributionDebug({
          visitorId,
          firstTouch: firstTouchRaw ? JSON.parse(firstTouchRaw) : null,
          lastTouch: lastTouchRaw ? JSON.parse(lastTouchRaw) : null,
        });
      } catch (e) {
        console.error('Error loading attribution debug data', e);
      }
    };

    loadAttribution();
    // Refresh when window gains focus (user might have visited test page)
    window.addEventListener('focus', loadAttribution);
    return () => window.removeEventListener('focus', loadAttribution);
  }, []);

  // Clear localStorage attribution for fresh testing
  const clearAttribution = () => {
    localStorage.removeItem('alpha_visitor_id');
    localStorage.removeItem('alpha_first_touch');
    localStorage.removeItem('alpha_last_touch');
    localStorage.removeItem('alpha_referral_code');
    sessionStorage.removeItem('alpha_session_id');
    sessionStorage.removeItem('_session_started');

    // Also clear referral cookie used for referral tracking
    document.cookie = 'aa_ref=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';

    setAttributionDebug({ visitorId: null, firstTouch: null, lastTouch: null });
    toast.success('Attribution data cleared! Visit a page with UTMs to start fresh.');
  };

  // Generate test URL with UTM params
  const generateTestUrl = (scenario: 'facebook' | 'youtube' | 'google' | 'direct') => {
    // Use homepage (root path) for attribution testing
    const baseUrl = window.location.origin;
    
    const utmConfigs: Record<string, string> = {
      facebook: `${baseUrl}?utm_source=facebook&utm_medium=paid_social&utm_campaign=test_fb_jan2026&utm_content=video_testimonial&utm_term=agency_owners`,
      youtube: `${baseUrl}?utm_source=youtube&utm_medium=paid_video&utm_campaign=test_yt_jan2026&utm_content=demo_walkthrough&utm_term=insurance_agents`,
      google: `${baseUrl}?utm_source=google&utm_medium=cpc&utm_campaign=test_search_jan2026&utm_content=headline_v1&utm_term=lead_generation`,
      direct: baseUrl,
    };
    
    return utmConfigs[scenario];
  };

  // Open test URL in new tab
  const openTestUrl = (scenario: 'facebook' | 'youtube' | 'google' | 'direct', clearFirst: boolean = false) => {
    if (clearFirst) {
      clearAttribution();
    }
    window.open(generateTestUrl(scenario), '_blank');
    toast.info(`Opened ${scenario === 'direct' ? 'direct visit' : scenario + ' ad'} test page`, {
      description: 'Fill out the form with a test email (@example.com) to complete the test.'
    });
  };

  // Simulate Stripe sale mutation
  const simulateStripeSale = useMutation({
    mutationFn: async () => {
      const mockPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: `cs_test_${Date.now()}`,
            customer_email: 'john.doe.test@example.com',
            amount_total: 9700, // $97.00 in cents
            currency: 'usd',
            customer: 'cus_test_123',
            metadata: {
              product_name: 'Test Product'
            }
          }
        }
      };

      const response = await supabase.functions.invoke('stripe-webhook', {
        body: mockPayload
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.duplicate) {
        toast.info('Duplicate transaction - already recorded');
      } else {
        toast.success(`Conversion recorded! ID: ${data.conversion_id}`, {
          description: data.attributed ? 'Successfully attributed to visitor' : 'No visitor match found'
        });
      }
      queryClient.invalidateQueries({ queryKey: ['b2b-attribution-stats'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-prospects'] });
    },
    onError: (error) => {
      toast.error('Failed to simulate sale', { description: error.message });
    }
  });

  // Purge test data mutation
  const purgeTestData = useMutation({
    mutationFn: async () => {
      const results = { deleted: { prospects: 0, prospectAttrs: 0, sessions: 0, events: 0, conversions: 0 } };

      // Delete test prospect_attribution
      const { data: prospectAttrDel } = await supabase
        .from('prospect_attribution')
        .delete()
        .ilike('visitor_id', 'test-%')
        .select('id');
      results.deleted.prospectAttrs = prospectAttrDel?.length || 0;

      // Delete test prospects
      const { data: prospectsDel } = await supabase
        .from('prospects')
        .delete()
        .or('email.ilike.%@example.com,visitor_id.ilike.test-%')
        .select('id');
      results.deleted.prospects = prospectsDel?.length || 0;

      // Delete test conversions
      const { data: convDel } = await supabase
        .from('conversions')
        .delete()
        .or('email.ilike.%@example.com,visitor_id.ilike.test-%')
        .select('id');
      results.deleted.conversions = convDel?.length || 0;

      // Delete test visitor_events
      const { data: eventsDel } = await supabase
        .from('visitor_events')
        .delete()
        .ilike('visitor_id', 'test-%')
        .select('id');
      results.deleted.events = eventsDel?.length || 0;

      // Delete test visitor_sessions
      const { data: sessionsDel } = await supabase
        .from('visitor_sessions')
        .delete()
        .or('email.ilike.%@example.com,visitor_id.ilike.test-%')
        .select('id');
      results.deleted.sessions = sessionsDel?.length || 0;

      return results;
    },
    onSuccess: (data) => {
      const total = Object.values(data.deleted).reduce((a, b) => a + b, 0);
      toast.success(`Purged ${total} test records`, {
        description: `Prospects: ${data.deleted.prospects}, Sessions: ${data.deleted.sessions}, Events: ${data.deleted.events}, Conversions: ${data.deleted.conversions}`
      });
      queryClient.invalidateQueries({ queryKey: ['b2b-attribution-stats'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-prospects'] });
    },
    onError: (error) => {
      toast.error('Failed to purge test data', { description: error.message });
    }
  });

  // Fetch B2B attribution stats (prospects from AlphaAgent) - parallelized
  const { data: stats, isLoading: loadingStats, refetch } = useQuery({
    queryKey: ['b2b-attribution-stats', dateRange],
    queryFn: async () => {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      // Fetch all data in parallel
      const [
        homepageSessionsResult,
        prospectsCountResult,
        statusDataResult,
        calendarSessionsResult,
        confirmedEventsResult
      ] = await Promise.all([
        // Homepage sessions
        supabase
          .from('visitor_sessions')
          .select('visitor_id, landing_page')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        // Total prospects count
        supabase
          .from('prospects')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        // Prospects by status
        supabase
          .from('prospects')
          .select('status')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        // Calendar page sessions
        supabase
          .from('visitor_sessions')
          .select('visitor_id')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .or('landing_page.ilike.%book%,landing_page.ilike.%calendar%'),
        // Call confirmed events
        supabase
          .from('visitor_events')
          .select('visitor_id')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .or('page_url.ilike.%call-confirmed%,page_url.ilike.%confirmed%,page_url.ilike.%thank%')
      ]);

      // Process homepage visitors
      const homepageVisitorIds = new Set(
        (homepageSessionsResult.data || [])
          .filter(s => {
            const path = s.landing_page || '';
            return path === '/' || path === '' || path.match(/^https?:\/\/[^\/]+\/?$/);
          })
          .map(s => s.visitor_id)
      );
      const homePageVisitors = homepageVisitorIds.size;

      const totalProspects = prospectsCountResult.count || 0;
      const bookedCount = (statusDataResult.data || []).filter(p => p.status === 'booked' || p.status === 'converted').length;
      const calendarVisitors = new Set((calendarSessionsResult.data || []).map(s => s.visitor_id)).size;
      const callConfirmedVisitors = new Set((confirmedEventsResult.data || []).map(e => e.visitor_id)).size;

      // Calculate conversion rates
      const applicationRate = homePageVisitors > 0 
        ? ((totalProspects || 0) / homePageVisitors * 100).toFixed(1) 
        : '0';
      
      const bookingRate = calendarVisitors > 0 
        ? (callConfirmedVisitors / calendarVisitors * 100).toFixed(1) 
        : '0';

      return {
        homePageVisitors,
        totalProspects,
        applicationRate,
        bookedCalls: callConfirmedVisitors,
        calendarVisitors,
        bookingRate,
      };
    },
  });

  // Fetch top sources from prospect_attribution
  const { data: topSources, isLoading: loadingSources } = useQuery({
    queryKey: ['b2b-sources', dateRange],
    queryFn: async () => {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const { data } = await supabase
        .from('prospect_attribution')
        .select('first_touch_source')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Aggregate by source
      const sourceMap: Record<string, number> = {};
      (data || []).forEach(attr => {
        const source = attr.first_touch_source || 'direct';
        sourceMap[source] = (sourceMap[source] || 0) + 1;
      });

      return Object.entries(sourceMap)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Fetch top campaigns from prospect_attribution
  const { data: topCampaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['b2b-campaigns', dateRange],
    queryFn: async () => {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const { data } = await supabase
        .from('prospect_attribution')
        .select('first_touch_campaign, first_touch_source, first_touch_medium')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .not('first_touch_campaign', 'is', null);

      // Aggregate by campaign
      const campaignMap: Record<string, { count: number; source: string; medium: string }> = {};
      (data || []).forEach(attr => {
        if (attr.first_touch_campaign) {
          if (!campaignMap[attr.first_touch_campaign]) {
            campaignMap[attr.first_touch_campaign] = { 
              count: 0, 
              source: attr.first_touch_source || '', 
              medium: attr.first_touch_medium || '' 
            };
          }
          campaignMap[attr.first_touch_campaign].count++;
        }
      });

      return Object.entries(campaignMap)
        .map(([campaign, data]) => ({ campaign, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });

  // Fetch recent prospects with attribution
  const { data: recentProspects, isLoading: loadingProspects } = useQuery({
    queryKey: ['b2b-prospects'],
    queryFn: async () => {
      // Get prospects with their attribution
      const { data: prospects } = await supabase
        .from('prospects')
        .select(`
          id,
          name,
          email,
          phone,
          team_size,
          status,
          source_page,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!prospects || prospects.length === 0) return [];

      // Get attribution for these prospects
      const prospectIds = prospects.map(p => p.id);
      const { data: attributions } = await supabase
        .from('prospect_attribution')
        .select('*')
        .in('prospect_id', prospectIds);

      const attrMap = new Map(attributions?.map(a => [a.prospect_id, a]) || []);

      return prospects.map(p => ({
        ...p,
        attribution: attrMap.get(p.id) || null
      }));
    },
  });

  // Fetch recent events (page views on AlphaAgent)
  const { data: recentEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['b2b-recent-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('visitor_events')
        .select('*')
        .or('page_url.ilike.%/partner%,page_url.ilike.%alphaagent%,page_url.ilike.%book-partner%,page_url.ilike.%book-call%')
        .order('created_at', { ascending: false })
        .limit(20);

      return data || [];
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AlphaAgent Attribution</h1>
          <p className="text-muted-foreground">Track B2B prospect journeys from ad → application → sale</p>
        </div>
        <div className="flex items-center gap-2">
          <UTMBuilder />
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Developer Tools */}
      <Collapsible open={devToolsOpen} onOpenChange={setDevToolsOpen}>
        <Card className="bg-card border-border border-dashed border-yellow-500/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-600">
                  <Wrench className="w-5 h-5" />
                  Developer Tools
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600/50">Dev</Badge>
                </div>
                {devToolsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              {/* Test Attribution Journey Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">Test Attribution Journey</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click a scenario to open the partner page with UTM parameters. Works on any domain with the tracking script.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTestUrl('facebook', true)}
                    className="border-blue-500/50 text-blue-600 hover:bg-blue-500/10"
                  >
                    <Facebook className="w-4 h-4 mr-2" />
                    Facebook Ad
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTestUrl('youtube', true)}
                    className="border-red-500/50 text-red-600 hover:bg-red-500/10"
                  >
                    <Youtube className="w-4 h-4 mr-2" />
                    YouTube Ad
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTestUrl('google', true)}
                    className="border-green-500/50 text-green-600 hover:bg-green-500/10"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Google Ad
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTestUrl('direct', true)}
                    className="border-muted-foreground/50 text-muted-foreground hover:bg-muted"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Direct Visit
                  </Button>
                </div>
              </div>

              {/* Current Attribution Debug */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    <p className="font-medium text-sm">Current Browser Attribution</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAttribution}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-24">visitor_id:</span>
                    <span className={attributionDebug.visitorId ? 'text-foreground' : 'text-muted-foreground'}>
                      {attributionDebug.visitorId || '(none)'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">first_touch:</span>
                    <span className={attributionDebug.firstTouch ? 'text-foreground' : 'text-muted-foreground'}>
                      {attributionDebug.firstTouch 
                        ? `${attributionDebug.firstTouch.source}/${attributionDebug.firstTouch.medium} - ${attributionDebug.firstTouch.campaign || '(no campaign)'}`
                        : '(none)'
                      }
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-24 shrink-0">last_touch:</span>
                    <span className={attributionDebug.lastTouch ? 'text-foreground' : 'text-muted-foreground'}>
                      {attributionDebug.lastTouch 
                        ? `${attributionDebug.lastTouch.source}/${attributionDebug.lastTouch.medium} - ${attributionDebug.lastTouch.campaign || '(no campaign)'}`
                        : '(none)'
                      }
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This shows what's stored in your browser's localStorage. Click a test link above to populate.
                </p>
              </div>

              <div className="border-t pt-4" />

              {/* Other Dev Tools */}
              <div className="flex flex-wrap gap-3">
                {/* Simulate Stripe Sale */}
                <Button 
                  variant="outline" 
                  onClick={() => simulateStripeSale.mutate()}
                  disabled={simulateStripeSale.isPending}
                  className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                >
                  {simulateStripeSale.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Simulate Stripe Sale ($97)
                </Button>

                {/* Purge Test Data */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Purge Test Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        Purge All Test Data?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>This will permanently delete:</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>All prospects with <code className="bg-muted px-1 rounded">@example.com</code> emails</li>
                          <li>All sessions with IDs starting with <code className="bg-muted px-1 rounded">test-</code></li>
                          <li>Related events, attributions, and conversions</li>
                        </ul>
                        <p className="font-medium mt-2">This action cannot be undone.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => purgeTestData.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {purgeTestData.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Purge Test Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <p className="text-xs text-muted-foreground">
                Simulate Sale uses email: <code className="bg-muted px-1 rounded">john.doe.test@example.com</code>
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Tracking Setup Guide */}
      <TrackingSetupGuide />

      {/* Stats Overview */}
      {loadingStats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Home Page Visitors" 
            value={stats?.homePageVisitors || 0}
            icon={Eye}
            color="bg-slate-500/10 text-slate-500"
          />
          <StatCard 
            title="Applications" 
            value={stats?.totalProspects || 0}
            icon={Users}
            change={`${stats?.applicationRate || 0}% conversion`}
            color="bg-blue-500/10 text-blue-500"
          />
          <StatCard 
            title="Calendar Visitors" 
            value={stats?.calendarVisitors || 0}
            icon={MousePointer}
            color="bg-orange-500/10 text-orange-500"
          />
          <StatCard 
            title="Calls Scheduled" 
            value={stats?.bookedCalls || 0}
            icon={UserCheck}
            change={`${stats?.bookingRate || 0}% of calendar visitors`}
            color="bg-purple-500/10 text-purple-500"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Prospects with Attribution */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recent Prospects
            </CardTitle>
            <CardDescription>
              Agency partners who applied through AlphaAgent.io
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProspects ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : recentProspects && recentProspects.length > 0 ? (
              <div className="space-y-2">
                {recentProspects.map((prospect: any) => (
                  <div 
                    key={prospect.id}
                    onClick={() => {
                      setSelectedProspectId(prospect.id);
                      setJourneyDialogOpen(true);
                    }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{prospect.name}</p>
                        <p className="text-sm text-muted-foreground">{prospect.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          prospect.status === 'converted' && 'bg-success/10 text-success border-success/20',
                          prospect.status === 'booked' && 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                          prospect.status === 'applied' && 'bg-orange-500/10 text-orange-500 border-orange-500/20',
                        )}
                      >
                        {prospect.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {prospect.attribution?.first_touch_source || 'direct'}
                      </Badge>
                      <span className="text-muted-foreground hidden md:block">
                        {prospect.team_size} agents
                      </span>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No prospects yet. Partner applications will appear here.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Drill-Down */}
      <CampaignDrilldown />

      {/* Sources, Campaigns, Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Sources */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Top Traffic Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSources ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : topSources && topSources.length > 0 ? (
              <div className="space-y-3">
                {topSources.map((source, index) => (
                  <div key={source.source} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm w-6">{index + 1}.</span>
                      <span className="font-medium capitalize">{source.source}</span>
                    </div>
                    <Badge variant="secondary">{source.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No traffic data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Campaigns */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Top Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCampaigns ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : topCampaigns && topCampaigns.length > 0 ? (
              <div className="space-y-3">
                {topCampaigns.map((campaign, index) => (
                  <div key={campaign.campaign} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm w-6">{index + 1}.</span>
                        <span className="font-medium truncate">{campaign.campaign}</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-8">
                        {campaign.source} / {campaign.medium}
                      </p>
                    </div>
                    <Badge variant="secondary">{campaign.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No campaign data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="w-5 h-5" />
              Recent Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : recentEvents && recentEvents.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentEvents.map((event) => (
                  <div key={event.id} className="p-2 rounded-lg bg-muted/30 text-sm">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          event.event_type === 'form_submit' && 'bg-success/10 text-success border-success/20',
                          event.event_type === 'page_view' && 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                          event.event_type === 'button_click' && 'bg-orange-500/10 text-orange-500 border-orange-500/20',
                        )}
                      >
                        {event.event_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(event.created_at), 'HH:mm')}
                      </span>
                    </div>
                    {event.page_url && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {event.page_url}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No events yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GHL Webhook Setup Guide */}
      <GHLWebhookSetup />

      {/* Customer Journey Dialog */}
      <CustomerJourneyDialog 
        prospectId={selectedProspectId}
        open={journeyDialogOpen}
        onOpenChange={setJourneyDialogOpen}
      />
    </div>
  );
}
