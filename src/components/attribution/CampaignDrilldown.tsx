import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Target, Image, Users, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { subDays } from 'date-fns';

interface CampaignData {
  campaign: string;
  source: string;
  medium: string;
  sessions: number;
  ads: {
    content: string;
    sessions: number;
    leads: number;
    revenue: number;
    audiences: {
      term: string;
      sessions: number;
      leads: number;
    }[];
  }[];
  totalLeads: number;
  totalRevenue: number;
}

export function CampaignDrilldown() {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAds, setExpandedAds] = useState<Set<string>>(new Set());
  const [dateRange] = useState({ 
    start: subDays(new Date(), 30), 
    end: new Date() 
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaign-drilldown', dateRange],
    queryFn: async () => {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      // Get all sessions with full UTM data
      const { data: sessions } = await supabase
        .from('visitor_sessions')
        .select('visitor_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .not('utm_campaign', 'is', null);

      // Get lead attributions
      const { data: leads } = await supabase
        .from('lead_attribution')
        .select('visitor_id, first_touch_campaign, first_touch_content, first_touch_term')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Get conversions
      const { data: conversions } = await supabase
        .from('conversions')
        .select('visitor_id, amount, first_touch_campaign')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Build campaign hierarchy
      const campaignMap = new Map<string, CampaignData>();

      (sessions || []).forEach(session => {
        const campaignKey = session.utm_campaign || 'unknown';
        
        if (!campaignMap.has(campaignKey)) {
          campaignMap.set(campaignKey, {
            campaign: campaignKey,
            source: session.utm_source || 'direct',
            medium: session.utm_medium || 'none',
            sessions: 0,
            ads: [],
            totalLeads: 0,
            totalRevenue: 0,
          });
        }

        const campaign = campaignMap.get(campaignKey)!;
        campaign.sessions++;

        // Track by ad content
        const contentKey = session.utm_content || '(no ad creative)';
        let ad = campaign.ads.find(a => a.content === contentKey);
        
        if (!ad) {
          ad = { content: contentKey, sessions: 0, leads: 0, revenue: 0, audiences: [] };
          campaign.ads.push(ad);
        }
        
        ad.sessions++;

        // Track by audience/term
        if (session.utm_term) {
          let audience = ad.audiences.find(a => a.term === session.utm_term);
          if (!audience) {
            audience = { term: session.utm_term, sessions: 0, leads: 0 };
            ad.audiences.push(audience);
          }
          audience.sessions++;
        }
      });

      // Attribute leads to campaigns/ads
      (leads || []).forEach(lead => {
        const campaignKey = lead.first_touch_campaign || 'unknown';
        const campaign = campaignMap.get(campaignKey);
        
        if (campaign) {
          campaign.totalLeads++;
          
          const contentKey = lead.first_touch_content || '(no ad creative)';
          const ad = campaign.ads.find(a => a.content === contentKey);
          if (ad) {
            ad.leads++;
            
            if (lead.first_touch_term) {
              const audience = ad.audiences.find(a => a.term === lead.first_touch_term);
              if (audience) audience.leads++;
            }
          }
        }
      });

      // Attribute revenue
      (conversions || []).forEach(conv => {
        const campaignKey = conv.first_touch_campaign || 'unknown';
        const campaign = campaignMap.get(campaignKey);
        
        if (campaign) {
          campaign.totalRevenue += Number(conv.amount) || 0;
        }
      });

      // Sort and return
      return Array.from(campaignMap.values())
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 15);
    },
  });

  const toggleCampaign = (campaign: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(campaign)) {
      newExpanded.delete(campaign);
    } else {
      newExpanded.add(campaign);
    }
    setExpandedCampaigns(newExpanded);
  };

  const toggleAd = (key: string) => {
    const newExpanded = new Set(expandedAds);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedAds(newExpanded);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Campaign Performance (Drill-Down)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {campaigns && campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <div key={campaign.campaign} className="border rounded-lg overflow-hidden">
              {/* Campaign Row */}
              <button
                onClick={() => toggleCampaign(campaign.campaign)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {expandedCampaigns.has(campaign.campaign) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{campaign.campaign}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.source} / {campaign.medium}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{campaign.sessions}</p>
                    <p className="text-xs text-muted-foreground">sessions</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-primary">{campaign.totalLeads}</p>
                    <p className="text-xs text-muted-foreground">leads</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-success">${campaign.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">revenue</p>
                  </div>
                </div>
              </button>

              {/* Ads Level */}
              {expandedCampaigns.has(campaign.campaign) && campaign.ads.length > 0 && (
                <div className="border-t bg-muted/20">
                  {campaign.ads.map((ad, adIndex) => (
                    <div key={`${campaign.campaign}-${ad.content}`}>
                      <button
                        onClick={() => toggleAd(`${campaign.campaign}-${ad.content}`)}
                        className="w-full flex items-center justify-between p-3 pl-10 hover:bg-muted/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          {ad.audiences.length > 0 ? (
                            expandedAds.has(`${campaign.campaign}-${ad.content}`) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )
                          ) : (
                            <div className="w-4" />
                          )}
                          <Image className="w-4 h-4 text-orange-500" />
                          <span className="text-sm">{ad.content}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant="outline">{ad.sessions}</Badge>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {ad.leads} leads
                          </Badge>
                        </div>
                      </button>

                      {/* Audience Level */}
                      {expandedAds.has(`${campaign.campaign}-${ad.content}`) && ad.audiences.length > 0 && (
                        <div className="bg-muted/40">
                          {ad.audiences.map((audience) => (
                            <div
                              key={`${campaign.campaign}-${ad.content}-${audience.term}`}
                              className="flex items-center justify-between p-2 pl-20 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <Users className="w-3 h-3 text-purple-500" />
                                <span className="text-muted-foreground">{audience.term}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs">{audience.sessions} sessions</span>
                                <Badge variant="secondary" className="text-xs">
                                  {audience.leads} leads
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No campaign data yet. Add UTM parameters to your ad URLs to start tracking.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
