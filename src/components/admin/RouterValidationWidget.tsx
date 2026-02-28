import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouterStatus, RouterStatus } from '@/hooks/useRouterStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Zap, Loader2, ExternalLink, ToggleLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function RouterValidationWidget() {
  const navigate = useNavigate();
  const { data: statuses, isLoading, refetch } = useRouterStatus();
  const [testingAgentId, setTestingAgentId] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const sendTestLead = async (clientId: string, clientName: string) => {
    setTestingAgentId(clientId);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-lead', {
        body: { clientId },
      });

      if (error) throw error;

      if (data.success) {
        const status = data.delivery?.success ? 'delivered' : data.delivery?.error ? 'failed' : 'created';
        setTestResults(prev => ({
          ...prev,
          [clientId]: {
            success: status !== 'failed',
            message: status === 'delivered' 
              ? `Delivered to GHL (Contact: ${data.delivery.contactId})`
              : status === 'failed'
                ? `Failed: ${data.delivery.error}`
                : 'Lead created (CRM delivery disabled)',
          },
        }));
        toast.success(`Test lead sent to ${clientName}`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setTestResults(prev => ({
        ...prev,
        [clientId]: { success: false, message },
      }));
      toast.error(`Failed to send test lead: ${message}`);
    } finally {
      setTestingAgentId(null);
    }
  };

  const testAllAgents = async () => {
    const readyAgents = statuses?.filter(s => s.status === 'ready' || s.status === 'partial') || [];
    if (readyAgents.length === 0) {
      toast.error('No agents ready for testing');
      return;
    }

    setTestingAll(true);
    setTestResults({});

    for (const agent of readyAgents) {
      await sendTestLead(agent.clientId, agent.clientName);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setTestingAll(false);
    toast.success(`Tested ${readyAgents.length} agents`);
    refetch();
  };

  const getStatusBadge = (status: RouterStatus['status']) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'not_ready':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Not Ready</Badge>;
      case 'disabled':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><ToggleLeft className="h-3 w-3 mr-1" />Disabled</Badge>;
    }
  };

  const readyCount = statuses?.filter(s => s.status === 'ready').length || 0;
  const partialCount = statuses?.filter(s => s.status === 'partial').length || 0;
  const notReadyCount = statuses?.filter(s => s.status === 'not_ready').length || 0;
  const disabledCount = statuses?.filter(s => s.status === 'disabled').length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Router Validation</CardTitle>
            <CardDescription>
              {readyCount} ready, {partialCount} partial, {notReadyCount} not ready, {disabledCount} disabled
            </CardDescription>
          </div>
          <Button 
            onClick={testAllAgents} 
            disabled={testingAll || isLoading}
            size="sm"
          >
            {testingAll ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" />Test All Ready Agents</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Test Result</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses?.map(agent => (
                  <TableRow key={agent.clientId}>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/hub/admin/clients/${agent.clientId}`)}
                        className="font-medium text-left hover:underline text-primary"
                      >
                        {agent.clientName}
                      </button>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell>
                      {agent.issues.length > 0 ? (
                        <ul className="text-xs text-muted-foreground">
                          {agent.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-green-500">All configured</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{agent.leadCount}</TableCell>
                    <TableCell className="text-right text-green-500">{agent.deliveredCount}</TableCell>
                    <TableCell className="text-right text-red-500">{agent.failedCount}</TableCell>
                    <TableCell>
                      {testResults[agent.clientId] && (
                        <span className={`text-xs ${testResults[agent.clientId].success ? 'text-green-500' : 'text-red-500'}`}>
                          {testResults[agent.clientId].message}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendTestLead(agent.clientId, agent.clientName)}
                        disabled={testingAgentId === agent.clientId || agent.status === 'not_ready'}
                      >
                        {testingAgentId === agent.clientId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
