import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2, ExternalLink, Settings2 } from 'lucide-react';
import { format } from 'date-fns';

export function GHLOAuthWidget() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [oauthStatus, setOauthStatus] = useState<{
    connected: boolean;
    expiresAt: string | null;
    companyId: string | null;
  }>({ connected: false, expiresAt: null, companyId: null });

  useEffect(() => {
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
        console.error('Error fetching GHL OAuth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleStartOAuth = () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    window.location.href = `https://${projectId}.supabase.co/functions/v1/crm-oauth-start`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          GHL OAuth Connection
        </CardTitle>
        <CardDescription>
          GoHighLevel API connection for lead injection, calendar lookups, and CRM sync
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Checking connection...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {oauthStatus.connected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-500 text-sm">Connected</p>
                    {oauthStatus.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Token expires: {format(new Date(oauthStatus.expiresAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                    {oauthStatus.companyId && (
                      <p className="text-xs text-muted-foreground">
                        Company: {oauthStatus.companyId}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <div>
                    <p className="font-medium text-destructive text-sm">Not Connected</p>
                    <p className="text-xs text-muted-foreground">
                      OAuth connection required for lead delivery and CRM features
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleStartOAuth}
                variant={oauthStatus.connected ? 'outline' : 'default'}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                {oauthStatus.connected ? 'Reconnect OAuth' : 'Connect GHL OAuth'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/hub/admin/ghl-bridge')}
              >
                Advanced Settings
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
