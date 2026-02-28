import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, ExternalLink, RefreshCw, Calendar, AlertCircle, Users, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface GHLApiLog {
  id: string;
  request_type: string;
  company_id: string | null;
  location_id: string | null;
  status: string;
  error_message: string | null;
  response_data: Record<string, any> | null;
  created_at: string;
}

interface OAuthStatus {
  connected: boolean;
  expiresAt: string | null;
  companyId: string | null;
}

export default function GHLBridge() {
  const [searchParams] = useSearchParams();
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>({ connected: false, expiresAt: null, companyId: null });
  const [logs, setLogs] = useState<GHLApiLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingCalendar, setIsTestingCalendar] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  // Assign User to All Calendars state
  const [assignCompanyId, setAssignCompanyId] = useState('');
  const [assignLocationId, setAssignLocationId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignAgentName, setAssignAgentName] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<any>(null);

  // Bulk sync state
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [bulkSyncProgress, setBulkSyncProgress] = useState(0);
  const [bulkSyncResults, setBulkSyncResults] = useState<{ name: string; status: string; error?: string }[]>([]);

  useEffect(() => {
    // Check for success redirect from OAuth
    if (searchParams.get('success') === 'true') {
      toast.success('GHL OAuth connected successfully!');
    }
    
    fetchStatus();
    fetchLogs();
  }, [searchParams]);

  // Pre-fill company ID when OAuth status loads
  useEffect(() => {
    if (oauthStatus.companyId) {
      setAssignCompanyId(oauthStatus.companyId);
    }
  }, [oauthStatus.companyId]);

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('ghl_oauth_tokens')
        .select('expires_at, company_id')
        .maybeSingle();

      if (error) throw error;

      setOauthStatus({
        connected: !!data,
        expiresAt: data?.expires_at || null,
        companyId: data?.company_id || null,
      });
    } catch (error) {
      console.error('Error fetching OAuth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('ghl_api_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Type cast the data properly
      const typedLogs: GHLApiLog[] = (data || []).map(log => ({
        id: log.id,
        request_type: log.request_type,
        company_id: log.company_id,
        location_id: log.location_id,
        status: log.status,
        error_message: log.error_message,
        response_data: log.response_data as Record<string, any> | null,
        created_at: log.created_at,
      }));
      
      setLogs(typedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleStartOAuth = () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    window.location.href = `https://${projectId}.supabase.co/functions/v1/crm-oauth-start`;
  };

  const handleTestCalendar = async () => {
    if (!companyId || !locationId) {
      toast.error('Please enter both Company ID and Location ID');
      return;
    }

    setIsTestingCalendar(true);
    setTestResult(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/crm-discovery-calendar?companyId=${encodeURIComponent(companyId)}&locationId=${encodeURIComponent(locationId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      setTestResult({ status: response.status, data });
      
      if (response.ok) {
        toast.success(`Found Discovery Calendar: ${data.matchedName}`);
      } else {
        toast.error(data.error || 'Failed to find Discovery calendar');
      }
      
      // Refresh logs
      fetchLogs();
    } catch (error: any) {
      console.error('Test failed:', error);
      setTestResult({ status: 500, data: { error: error.message } });
      toast.error('Test failed: ' + error.message);
    } finally {
      setIsTestingCalendar(false);
    }
  };

  const handleAssignUserToAllCalendars = async () => {
    if (!assignCompanyId || !assignLocationId || !assignUserId) {
      toast.error('Please enter Company ID, Location ID, and User ID');
      return;
    }

    setIsAssigning(true);
    setAssignResult(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ghl-assign-user-to-all-calendars`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId: assignCompanyId,
            locationId: assignLocationId,
            userId: assignUserId,
            agentName: assignAgentName || undefined,
            activateCalendars: true,
          }),
        }
      );

      const data = await response.json();
      setAssignResult({ status: response.status, data });

      if (response.ok && data.success) {
        toast.success(`Assigned user to ${data.updatedCalendars?.length || 0} calendars`);
      } else {
        toast.error(data.error || 'Failed to assign user to calendars');
      }

      // Refresh logs
      fetchLogs();
    } catch (error: any) {
      console.error('Assign failed:', error);
      setAssignResult({ status: 500, data: { error: error.message } });
      toast.error('Assign failed: ' + error.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkSyncFields = async () => {
    setIsBulkSyncing(true);
    setBulkSyncProgress(0);
    setBulkSyncResults([]);

    try {
      // Fetch all clients with subaccount_id configured
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, subaccount_id')
        .not('subaccount_id', 'is', null)
        .neq('subaccount_id', '')
        .order('name');

      if (error) throw error;

      if (!clients || clients.length === 0) {
        toast.info('No clients with subaccount IDs configured');
        setIsBulkSyncing(false);
        return;
      }

      const results: { name: string; status: string; error?: string }[] = [];
      
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        setBulkSyncProgress(Math.round(((i + 1) / clients.length) * 100));

        try {
          const { data, error: syncError } = await supabase.functions.invoke('ghl-sync-custom-fields', {
            body: { clientId: client.id, locationId: client.subaccount_id },
          });

          if (syncError) throw syncError;
          if (data?.error) throw new Error(data.error);

          results.push({
            name: client.name,
            status: 'success',
          });
        } catch (err: any) {
          results.push({
            name: client.name,
            status: 'error',
            error: err.message || 'Unknown error',
          });
        }

        setBulkSyncResults([...results]);
      }

      const successCount = results.filter(r => r.status === 'success').length;
      toast.success(`Synced ${successCount}/${clients.length} clients`);
    } catch (error: any) {
      console.error('Bulk sync failed:', error);
      toast.error('Bulk sync failed: ' + error.message);
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'not_found':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Not Found</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GHL Token Bridge</h1>
        <p className="text-muted-foreground">
          Manage GoHighLevel OAuth connection and fetch Discovery calendar IDs for new subaccounts.
        </p>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            OAuth Connection Status
          </CardTitle>
          <CardDescription>
            Connect your GoHighLevel Marketplace App to enable calendar lookups.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {oauthStatus.connected ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-green-500">Connected</p>
                  {oauthStatus.expiresAt && (
                    <p className="text-sm text-muted-foreground">
                      Token expires: {format(new Date(oauthStatus.expiresAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                  {oauthStatus.companyId && (
                    <p className="text-sm text-muted-foreground">
                      Company ID: {oauthStatus.companyId}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Not Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Click the button below to install the GHL Marketplace App.
                  </p>
                </div>
              </>
            )}
          </div>

          <Button onClick={handleStartOAuth} variant={oauthStatus.connected ? 'outline' : 'default'}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {oauthStatus.connected ? 'Reconnect OAuth' : 'Start OAuth Install'}
          </Button>
        </CardContent>
      </Card>

      {/* Test Calendar Lookup Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Discovery Calendar Lookup</CardTitle>
          <CardDescription>
            Enter a Company ID and Location ID to test fetching the Discovery calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyId">Company ID</Label>
              <Input
                id="companyId"
                placeholder="Enter GHL Company ID"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationId">Location ID</Label>
              <Input
                id="locationId"
                placeholder="Enter GHL Location ID (subaccount)"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleTestCalendar}
            disabled={isTestingCalendar || !oauthStatus.connected}
          >
            {isTestingCalendar ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing... (may take up to 50s with retries)
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Calendar Lookup
              </>
            )}
          </Button>

          {!oauthStatus.connected && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Connect OAuth first to enable testing.
            </div>
          )}

          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.status === 200 
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-destructive/10 border-destructive/20'
            }`}>
              <p className="font-mono text-sm whitespace-pre-wrap">
                {JSON.stringify(testResult.data, null, 2)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign User to All Calendars Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Setup Agent Calendars
          </CardTitle>
          <CardDescription>
            Assign user to all calendars, activate them, and rename with agent name (e.g., "IUL Discovery | John Smith").
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignCompanyId">Company ID</Label>
              <Input
                id="assignCompanyId"
                placeholder="Enter GHL Company ID"
                value={assignCompanyId}
                onChange={(e) => setAssignCompanyId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignLocationId">Location ID</Label>
              <Input
                id="assignLocationId"
                placeholder="Enter GHL Location ID"
                value={assignLocationId}
                onChange={(e) => setAssignLocationId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignUserId">User ID</Label>
              <Input
                id="assignUserId"
                placeholder="Enter GHL User ID"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignAgentName">Agent Name (for calendar rename)</Label>
              <Input
                id="assignAgentName"
                placeholder="e.g., John Smith"
                value={assignAgentName}
                onChange={(e) => setAssignAgentName(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleAssignUserToAllCalendars}
            disabled={isAssigning || !oauthStatus.connected}
          >
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up calendars...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Setup All Calendars
              </>
            )}
          </Button>

          {!oauthStatus.connected && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Connect OAuth first to enable assignment.
            </div>
          )}

          {assignResult && (
            <div className={`p-4 rounded-lg border ${
              assignResult.status === 200 && assignResult.data?.success
                ? 'bg-green-500/10 border-green-500/20' 
                : 'bg-destructive/10 border-destructive/20'
            }`}>
              <p className="font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                {JSON.stringify(assignResult.data, null, 2)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Sync Custom Fields Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Bulk Sync Custom Field Mappings
          </CardTitle>
          <CardDescription>
            Sync GHL custom fields for all clients with subaccount IDs configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleBulkSyncFields}
            disabled={isBulkSyncing || !oauthStatus.connected}
          >
            {isBulkSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing... {bulkSyncProgress}%
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All Clients
              </>
            )}
          </Button>

          {!oauthStatus.connected && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Connect OAuth first to enable bulk sync.
            </div>
          )}

          {isBulkSyncing && (
            <Progress value={bulkSyncProgress} className="h-2" />
          )}

          {bulkSyncResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bulkSyncResults.map((result, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    result.status === 'success' 
                      ? 'bg-green-500/10 text-green-600' 
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  <span>{result.name}</span>
                  {result.status === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-xs truncate max-w-[200px]">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Logs Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>API Logs</CardTitle>
            <CardDescription>Last 20 API requests</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No API logs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company ID</TableHead>
                    <TableHead>Location ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, h:mm:ss a')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.request_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.company_id || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.location_id || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs">
                        {log.error_message || (log.response_data ? JSON.stringify(log.response_data) : '-')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
