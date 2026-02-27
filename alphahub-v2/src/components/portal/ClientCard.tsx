import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, AlertTriangle, Archive } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ClientWithPerformance } from '@/hooks/useClientData';
import ClientAvatar from './ClientAvatar';
import StatusBadge from './StatusBadge';
import { CompactWalletWidget } from './CompactWalletWidget';
import { useComputedWalletBalance } from '@/hooks/useComputedWalletBalance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClientCardProps {
  client: ClientWithPerformance;
  isAdmin?: boolean;
}

export default function ClientCard({ client, isAdmin = false }: ClientCardProps) {
  const navigate = useNavigate();
  const performance = client.performance;
  const isAgedPackage = client.package_type?.toLowerCase() === 'aged';
  
  const renewalDays = client.renewal_date 
    ? differenceInDays(parseISO(client.renewal_date), new Date())
    : null;
  const renewalSoon = renewalDays !== null && renewalDays <= 7 && renewalDays >= 0;

  // Use the computed wallet balance hook which applies performance percentage
  const { 
    totalDeposits, 
    displayedSpend, 
    remainingBalance, 
    trackingStartDate 
  } = useComputedWalletBalance(client.id);

  // Fetch wallet threshold
  const { data: wallet } = useQuery({
    queryKey: ['client-wallet-threshold', client.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_wallets')
        .select('low_balance_threshold')
        .eq('client_id', client.id)
        .maybeSingle();
      return data;
    },
  });

  // Calculate metrics
  const mtdLeads = client.mtd_leads ?? 0;
  const bookedCalls = client.booked_calls ?? 0;
  const cpl = mtdLeads > 0 ? (client.mtd_ad_spend ?? 0) / mtdLeads : 0;
  const leadToCallRate = mtdLeads > 0 ? (bookedCalls / mtdLeads) * 100 : 0;

  const handleClick = () => {
    if (isAdmin) {
      navigate(`/hub/admin/clients/${client.id}`);
    } else {
      navigate('/hub');
    }
  };

  return (
    <div
      onClick={handleClick}
      className="frosted-card-hover p-6 group"
    >
      {/* Renewal Warning */}
      {renewalSoon && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-alert/20 text-alert rounded-full text-xs font-medium">
          <AlertTriangle className="w-3 h-3" />
          {renewalDays === 0 ? 'Today' : `${renewalDays}d`}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <ClientAvatar 
          name={client.name} 
          src={client.profile_image_url} 
          cacheKey={(client as any).headshot_updated_at || client.updated_at}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {client.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">{client.email}</p>
          <div className="mt-2">
            <StatusBadge status={client.status} size="sm" />
          </div>
        </div>
      </div>

      {/* Content based on package type */}
      {isAgedPackage ? (
        /* AGED Clients - Minimal display */
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-muted/20 border border-border/30 text-center">
            <Archive className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Aged Leads Package</p>
            <p className="text-xs text-muted-foreground/70 mt-1">No live ad spend tracking</p>
          </div>
          
          {/* Renewal Info */}
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/5 pt-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Fee: ${(client.management_fee ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {client.renewal_date 
                  ? format(parseISO(client.renewal_date), 'MMM d')
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* LIVE Clients - Full metrics */
        <>
          {/* Compact Wallet Widget */}
          <div className="mb-4">
            <CompactWalletWidget
              remainingBalance={remainingBalance}
              trackedSpend={displayedSpend}
              totalDeposits={totalDeposits}
              threshold={wallet?.low_balance_threshold ?? 150}
              trackingStartDate={trackingStartDate}
            />
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center p-2 rounded-lg bg-background/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CPL</p>
              <p className="text-sm font-bold">${cpl.toFixed(0)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Leads</p>
              <p className="text-sm font-bold">{mtdLeads}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Calls</p>
              <p className="text-sm font-bold">{bookedCalls}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">L→C</p>
              <p className="text-sm font-bold">{leadToCallRate.toFixed(0)}%</p>
            </div>
          </div>

          {/* Renewal Info */}
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/5 pt-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Fee: ${(client.management_fee ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {client.renewal_date 
                  ? format(parseISO(client.renewal_date), 'MMM d')
                  : '—'}
              </span>
            </div>
          </div>

          {/* Performance Status Bar */}
          {performance && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Performance</span>
                <div className={`w-2 h-2 rounded-full ${
                  performance.fulfillment_status === 'green' ? 'bg-success' :
                  performance.fulfillment_status === 'yellow' ? 'bg-yellow-500' : 'bg-alert'
                }`} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
