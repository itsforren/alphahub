import { useState, useEffect } from 'react';
import { RefreshCw, Send, CheckCircle2, XCircle, ChevronDown, ChevronRight, Filter, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CONVERSION_API_KEY } from '@/config/conversion';

interface ConversionLog {
  id: string;
  created_at: string;
  conversion_type: string;
  email_provided: string | null;
  phone_provided: string | null;
  first_name_provided: string | null;
  last_name_provided: string | null;
  source: string | null;
  google_api_status: number | null;
  google_api_response: Record<string, unknown> | null;
  success: boolean | null;
  error_message: string | null;
  gclid: string | null;
}

function maskEmail(email: string | null): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!local || !domain) return email.substring(0, 3) + '***';
  return local.substring(0, 3) + '***@' + domain;
}

export default function EnhancedConversionsAdmin() {
  const [logs, setLogs] = useState<ConversionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryAllProgress, setRetryAllProgress] = useState<{ current: number; total: number; successes: number } | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('enhanced_conversion_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filterType !== 'all') {
      query = query.eq('conversion_type', filterType);
    }
    if (filterStatus === 'success') {
      query = query.eq('success', true);
    } else if (filterStatus === 'failure') {
      query = query.eq('success', false);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching conversion logs:', error);
    } else {
      setLogs((data || []) as ConversionLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [filterType, filterStatus]);

  const handleTestConversion = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('google-ads-enhanced-conversion', {
        body: {
          conversionType: 'Agent_Lead_API',
          email: 'test@test.com',
          phone: '+15555555555',
          firstName: 'Test',
          lastName: 'User',
        },
        headers: { 'x-api-key': CONVERSION_API_KEY },
      });

      if (error) {
        setTestResult({ error: error.message });
        toast.error('Test conversion failed');
      } else {
        setTestResult(data);
        toast.success('Test conversion sent — check log below');
        fetchLogs();
      }
    } catch (err) {
      setTestResult({ error: String(err) });
      toast.error('Test conversion failed');
    }
    setTesting(false);
  };

  const handleRetry = async (log: ConversionLog) => {
    setRetryingId(log.id);
    try {
      const { data, error } = await supabase.functions.invoke('google-ads-enhanced-conversion', {
        body: {
          conversionType: log.conversion_type,
          email: log.email_provided || '',
          phone: log.phone_provided || '',
          firstName: log.first_name_provided || '',
          lastName: log.last_name_provided || '',
          gclid: (log.gclid && log.gclid !== 'null') ? log.gclid : '',
          originalDateTime: log.created_at,
        },
        headers: { 'x-api-key': CONVERSION_API_KEY },
      });

      if (error) {
        toast.error(`Retry failed: ${error.message}`);
      } else if (data?.success) {
        // Mark original failed record as retried
        await supabase.from('enhanced_conversion_logs').update({
          error_message: `[RETRIED OK] Original error: ${log.error_message || 'unknown'}`,
        }).eq('id', log.id);
        toast.success(`Retry succeeded for ${log.conversion_type}`);
        fetchLogs();
      } else {
        toast.error(`Retry sent but Google rejected: status ${data?.googleStatus}`);
        fetchLogs();
      }
    } catch (err) {
      toast.error(`Retry error: ${String(err)}`);
    }
    setRetryingId(null);
  };

  const isRetried = (log: ConversionLog) => log.error_message?.startsWith('[RETRIED OK]');

  const handleRetryAllFailed = async () => {
    const failedLogs = logs.filter(l => !l.success && l.conversion_type !== 'Agent_Lead_API_FAKE' && !isRetried(l));
    if (failedLogs.length === 0) {
      toast.info('No failed conversions to retry');
      return;
    }
    setRetryAllProgress({ current: 0, total: failedLogs.length, successes: 0 });
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < failedLogs.length; i++) {
      const log = failedLogs[i];
      setRetryAllProgress({ current: i + 1, total: failedLogs.length, successes: successCount });
      try {
        const { data, error } = await supabase.functions.invoke('google-ads-enhanced-conversion', {
          body: {
            conversionType: log.conversion_type,
            email: log.email_provided || '',
            phone: log.phone_provided || '',
            firstName: log.first_name_provided || '',
            lastName: log.last_name_provided || '',
            gclid: (log.gclid && log.gclid !== 'null') ? log.gclid : '',
            originalDateTime: log.created_at,
          },
          headers: { 'x-api-key': CONVERSION_API_KEY },
        });
        if (!error && data?.success) {
          await supabase.from('enhanced_conversion_logs').update({
            error_message: `[RETRIED OK] Original error: ${log.error_message || 'unknown'}`,
          }).eq('id', log.id);
          successCount++;
        } else failCount++;
      } catch {
        failCount++;
      }
    }
    setRetryAllProgress(null);
    toast.success(`Retry complete: ${successCount} succeeded, ${failCount} failed`);
    fetchLogs();
  };

  const lastSuccessLead = logs.find(l => l.conversion_type === 'Agent_Lead_API' && l.success);
  const lastSuccessCall = logs.find(l => l.conversion_type === 'Agent_CallBooked_API' && l.success);
  const lastSuccessSale = logs.find(l => l.conversion_type === 'Agent_Sale_API' && l.success);
  const failedCount = logs.filter(l => !l.success && l.conversion_type !== 'Agent_Lead_API_FAKE' && !isRetried(l)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Enhanced Conversions (Google Ads)
        </CardTitle>
        <CardDescription>
          Monitor Agent_Lead_API ($50), Agent_CallBooked_API ($150), and Agent_Sale_API ($1,497) conversion events sent to Google Ads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Customer ID</p>
            <p className="font-mono text-sm">6551751244</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Last Agent_Lead_API ✓</p>
            <p className="text-sm">{lastSuccessLead ? new Date(lastSuccessLead.created_at).toLocaleString() : 'Never'}</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Last Agent_CallBooked_API ✓</p>
            <p className="text-sm">{lastSuccessCall ? new Date(lastSuccessCall.created_at).toLocaleString() : 'Never'}</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Last Agent_Sale_API ✓</p>
            <p className="text-sm">{lastSuccessSale ? new Date(lastSuccessSale.created_at).toLocaleString() : 'Never'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleTestConversion} disabled={testing}>
            <Send className="h-4 w-4 mr-1" />
            {testing ? 'Sending...' : 'Send Test Conversion'}
          </Button>
          {failedCount > 0 && !retryAllProgress && (
            <Button variant="destructive" size="sm" onClick={handleRetryAllFailed}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Retry All Failed ({failedCount})
            </Button>
          )}
          {retryAllProgress && (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Retrying {retryAllProgress.current}/{retryAllProgress.total} — {retryAllProgress.successes} succeeded
              </span>
            </div>
          )}
          {testResult && (
            <pre className="text-xs bg-muted rounded p-2 max-w-md overflow-auto max-h-24">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          )}
        </div>

        {/* Filters & Refresh */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Agent_Lead_API">Agent_Lead_API</SelectItem>
              <SelectItem value="Agent_CallBooked_API">Agent_CallBooked_API</SelectItem>
              <SelectItem value="Agent_Sale_API">Agent_Sale_API</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Log Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left w-8"></th>
                  <th className="p-2 text-left">Timestamp</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Source</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">API Code</th>
                  <th className="p-2 text-left w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      {loading ? 'Loading...' : 'No conversion logs yet'}
                    </td>
                  </tr>
                )}
                {logs.map(log => (
                  <tr key={log.id} className="group">
                    <td colSpan={8} className="p-0">
                      <div
                        className={`flex items-center gap-0 cursor-pointer hover:bg-muted/30 transition-colors ${
                          log.success ? '' : 'bg-destructive/5'
                        }`}
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        <div className="p-2 w-8">
                          {expandedRow === log.id ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-2 flex-1 min-w-[140px]">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                        <div className="p-2 flex-1">
                          <Badge variant={
                            log.conversion_type === 'Agent_Sale_API' ? 'default' :
                            log.conversion_type === 'Agent_CallBooked_API' ? 'secondary' : 'outline'
                          }>
                            {log.conversion_type}
                          </Badge>
                        </div>
                        <div className="p-2 flex-1 text-muted-foreground">{log.source || '—'}</div>
                        <div className="p-2 flex-1 font-mono text-xs">{maskEmail(log.email_provided)}</div>
                        <div className="p-2 flex-1">
                          {log.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : isRetried(log) ? (
                            <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="p-2 flex-1 font-mono">{log.google_api_status ?? '—'}</div>
                        <div className="p-2 w-20">
                          {!log.success && !isRetried(log) && log.conversion_type !== 'Agent_Lead_API_FAKE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              disabled={retryingId === log.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetry(log);
                              }}
                            >
                              <RotateCcw className={`h-3 w-3 mr-1 ${retryingId === log.id ? 'animate-spin' : ''}`} />
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                      {expandedRow === log.id && (
                        <div className="px-4 pb-4 space-y-2 border-t bg-muted/10">
                          {log.gclid && (
                            <div>
                              <p className="text-xs font-medium mt-2">GCLID</p>
                              <p className="text-xs font-mono bg-muted rounded p-2">{log.gclid}</p>
                            </div>
                          )}
                          {log.error_message && (
                            <div>
                              <p className="text-xs font-medium text-destructive mt-2">Error</p>
                              <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-32">{log.error_message}</pre>
                            </div>
                          )}
                          {log.google_api_response && (
                            <div>
                              <p className="text-xs font-medium mt-2">Google API Response</p>
                              <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-48">
                                {JSON.stringify(log.google_api_response, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
