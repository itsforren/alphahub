import { memo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, Bell, Activity, RefreshCw, Zap, ShieldAlert,
  DollarSign, TrendingDown, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { useWatchtowerData } from '@/hooks/useWatchtowerData';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Get severity color
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'text-red-500';
    case 'warning': return 'text-amber-500';
    case 'info': return 'text-blue-400';
    default: return 'text-muted-foreground';
  }
};

const getSeverityBg = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-red-500/10 border-red-500/30';
    case 'warning': return 'bg-amber-500/10 border-amber-500/30';
    case 'info': return 'bg-blue-500/10 border-blue-500/30';
    default: return 'bg-muted/10 border-muted/30';
  }
};

const getActionIcon = (action: string) => {
  if (action.includes('BUDGET')) return DollarSign;
  if (action.includes('SAFE_MODE')) return ShieldAlert;
  if (action.includes('PROPOSAL')) return Zap;
  if (action.includes('IGNORED')) return XCircle;
  return Activity;
};

// Live Pulse Indicator
const LivePulse = memo(function LivePulse({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative"
      >
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
      </motion.div>
      <span className="text-sm font-medium text-green-500">
        {isLoading ? 'SYNCING...' : 'LIVE FEED'}
      </span>
      {isLoading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
    </div>
  );
});

// Single Change Entry
const ChangeEntry = memo(function ChangeEntry({ 
  change, 
  index 
}: { 
  change: { id: string; user: string; action: string; clientName: string; timestamp: string };
  index: number;
}) {
  const ActionIcon = getActionIcon(change.action);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-center gap-4 py-4 px-6 border-b border-white/5 hover:bg-white/5 transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <ActionIcon className="w-5 h-5 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-white">{change.user}</span>
          <span className="text-base text-muted-foreground">{change.action.replace(/_/g, ' ')}</span>
        </div>
        <span className="text-xl font-medium text-emerald-400">{change.clientName}</span>
      </div>
      
      <div className="text-right shrink-0">
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(change.timestamp), { addSuffix: true })}
        </span>
      </div>
    </motion.div>
  );
});

// Single Alert Entry
const AlertEntry = memo(function AlertEntry({ 
  alert, 
  index,
  type
}: { 
  alert: { id: string; name?: string; clientName?: string; value?: string | number; message?: string; severity?: string };
  index: number;
  type: 'budget' | 'zero-leads' | 'cpa' | 'system';
}) {
  const getIcon = () => {
    switch (type) {
      case 'budget': return DollarSign;
      case 'zero-leads': return TrendingDown;
      case 'cpa': return AlertTriangle;
      case 'system': return Bell;
      default: return AlertTriangle;
    }
  };
  
  const Icon = getIcon();
  const severity = alert.severity || (type === 'system' ? 'warning' : 'critical');
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={cn(
        "flex items-center gap-4 py-4 px-6 border rounded-lg transition-all",
        getSeverityBg(severity)
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
        severity === 'critical' ? "bg-red-500/30" : "bg-amber-500/30"
      )}>
        <Icon className={cn("w-6 h-6", getSeverityColor(severity))} />
      </div>
      
      <div className="flex-1 min-w-0">
        <span className="text-xl font-semibold text-white block">
          {alert.name || alert.clientName || alert.message || 'Unknown'}
        </span>
        <span className="text-sm text-muted-foreground uppercase tracking-wide">
          {type.replace('-', ' ')}
        </span>
      </div>
      
      {alert.value && (
        <div className={cn(
          "text-2xl font-bold shrink-0",
          getSeverityColor(severity)
        )}>
          {alert.value}
        </div>
      )}
    </motion.div>
  );
});

// Stats Bar
const StatsBar = memo(function StatsBar({ 
  changesCount, 
  alertsCount,
  cpaAlarmCount,
  systemAlertCount
}: { 
  changesCount: number;
  alertsCount: number;
  cpaAlarmCount: number;
  systemAlertCount: number;
}) {
  return (
    <div className="flex items-center gap-8 px-6 py-4 bg-white/5 rounded-xl border border-white/10">
      <div className="flex items-center gap-3">
        <Activity className="w-5 h-5 text-primary" />
        <span className="text-sm text-muted-foreground">Recent Changes</span>
        <span className="text-2xl font-bold text-white">{changesCount}</span>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <span className="text-sm text-muted-foreground">Budget Critical</span>
        <span className="text-2xl font-bold text-amber-500">{alertsCount}</span>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div className="flex items-center gap-3">
        <TrendingDown className="w-5 h-5 text-red-500" />
        <span className="text-sm text-muted-foreground">CPA Alarms</span>
        <span className="text-2xl font-bold text-red-500">{cpaAlarmCount}</span>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-blue-400" />
        <span className="text-sm text-muted-foreground">System Alerts</span>
        <span className="text-2xl font-bold text-blue-400">{systemAlertCount}</span>
      </div>
    </div>
  );
});

export default function AlertCenter() {
  const { data, isLoading } = useWatchtowerData();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Combine all alerts
  const allAlerts = [
    ...(data?.cpaAlarmClients.map(c => ({ 
      ...c, 
      name: c.name, 
      value: `$${c.cpl} CPL`, 
      severity: 'critical',
      type: 'cpa' as const
    })) || []),
    ...(data?.budgetCriticalClients.map(c => ({ 
      ...c, 
      value: `${c.daysRemaining}d left`, 
      severity: 'warning',
      type: 'budget' as const
    })) || []),
    ...(data?.zeroLeadCampaigns.map(c => ({ 
      ...c, 
      name: c.clientName, 
      value: `$${c.spend} / 0 leads`, 
      severity: 'warning',
      type: 'zero-leads' as const
    })) || []),
    ...(data?.systemAlerts.map(a => ({ 
      ...a, 
      name: a.title, 
      message: a.message,
      severity: a.severity,
      type: 'system' as const
    })) || []),
  ];

  return (
    <div className="h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-8 py-6 border-b border-white/10 shrink-0"
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Bell className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Alert Center</h1>
              <p className="text-muted-foreground">Real-time Errors & Notifications</p>
            </div>
          </div>
          <LivePulse isLoading={isLoading} />
        </div>
        
        <div className="text-right">
          <div className="text-4xl font-mono font-bold tabular-nums">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <div className="px-8 py-4 shrink-0">
        <StatsBar 
          changesCount={data?.recentChanges.length || 0}
          alertsCount={data?.budgetCriticalClients.length || 0}
          cpaAlarmCount={data?.cpaAlarmClients.length || 0}
          systemAlertCount={data?.systemAlerts.length || 0}
        />
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-2 gap-6 px-8 pb-6 min-h-0">
        {/* Left: Recent Changes Feed */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <Activity className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Recent Changes</h2>
          </div>
          <div className="flex-1 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {(data?.recentChanges || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mb-4 text-green-500" />
                    <span className="text-lg">No recent changes</span>
                  </div>
                ) : (
                  (data?.recentChanges || []).map((change, i) => (
                    <ChangeEntry key={change.id} change={change} index={i} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right: Critical Alerts */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold">Critical Alerts</h2>
            {allAlerts.length > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="ml-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50"
              >
                <span className="text-sm font-bold text-red-500">{allAlerts.length}</span>
              </motion.div>
            )}
          </div>
          <div className="flex-1 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="h-full overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {allAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mb-4 text-green-500" />
                    <span className="text-lg">All systems operational</span>
                  </div>
                ) : (
                  allAlerts.map((alert, i) => (
                    <AlertEntry 
                      key={alert.id} 
                      alert={alert} 
                      index={i}
                      type={alert.type}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
