import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WebhookSettingsWidget } from '@/components/portal/WebhookSettingsWidget';
import { LeadBulkImport } from '@/components/portal/LeadBulkImport';
import { ClientBulkImport } from '@/components/portal/ClientBulkImport';
import { OnboardingSettingsWidget } from '@/components/portal/OnboardingSettingsWidget';
import { SuccessManagerSettingsWidget } from '@/components/admin/SuccessManagerSettingsWidget';
import { PortalVisibilityWidget } from '@/components/admin/PortalVisibilityWidget';
import { PerformancePercentageWidget } from '@/components/admin/PerformancePercentageWidget';
import { AutomationEmailWidget } from '@/components/admin/AutomationEmailWidget';
import { SupportAgentsWidget } from '@/components/admin/SupportAgentsWidget';
import { SLASettingsWidget } from '@/components/admin/SLASettingsWidget';
import { AgreementTemplateWidget } from '@/components/admin/AgreementTemplateWidget';
import InternalMarketingSettingsWidget from '@/components/admin/InternalMarketingSettingsWidget';
import ProspectFieldMappingWidget from '@/components/admin/ProspectFieldMappingWidget';
import EnhancedConversionsAdmin from '@/components/admin/EnhancedConversionsAdmin';
import { GHLOAuthWidget } from '@/components/admin/GHLOAuthWidget';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PortalAdminSettings() {
  const [isPurging, setIsPurging] = useState(false);
  const navigate = useNavigate();

  const handlePurgeTestData = async () => {
    setIsPurging(true);
    try {
      // Delete test conversions
      const { error: convError } = await supabase
        .from('conversions')
        .delete()
        .like('email', '%@example.com');
      
      // Delete test lead attributions
      const { error: attrError } = await supabase
        .from('lead_attribution')
        .delete()
        .like('visitor_id', 'test-%');
      
      // Delete test visitor events
      const { error: eventsError } = await supabase
        .from('visitor_events')
        .delete()
        .like('visitor_id', 'test-%');
      
      // Delete test visitor sessions
      const { error: sessionsError } = await supabase
        .from('visitor_sessions')
        .delete()
        .like('visitor_id', 'test-%');
      
      // Delete test leads
      const { error: leadsError } = await supabase
        .from('leads')
        .delete()
        .like('email', '%@example.com');

      if (convError || attrError || eventsError || sessionsError || leadsError) {
        throw new Error('Failed to delete some test data');
      }

      toast.success('Test data purged successfully');
    } catch (error) {
      console.error('Error purging test data:', error);
      toast.error('Failed to purge test data');
    } finally {
      setIsPurging(false);
    }
  };
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hub/admin/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
          <p className="text-muted-foreground">Configure success manager defaults, portal visibility, webhooks, and data imports</p>
        </div>
      </div>

      {/* SLA & KPI Settings */}
      <SLASettingsWidget />

      {/* Performance Percentage Settings */}
      <PerformancePercentageWidget />

      {/* Support Agents Configuration */}
      <SupportAgentsWidget />

      {/* Default Success Manager Settings */}
      <SuccessManagerSettingsWidget />

      {/* Agent Portal Visibility Settings */}
      <PortalVisibilityWidget />

      {/* Automation Error Email Settings */}
      <AutomationEmailWidget />

      {/* Agreement Template Settings */}
      <AgreementTemplateWidget />

      {/* Internal Marketing Tracking (CEO Board) */}
      <InternalMarketingSettingsWidget />

      {/* Campaign Auto-Creation Settings */}
      <OnboardingSettingsWidget />

      {/* Prospect Custom Field Mapping */}
      <ProspectFieldMappingWidget />

      {/* Enhanced Conversions (Google Ads) */}
      <EnhancedConversionsAdmin />

      {/* GHL OAuth Connection */}
      <GHLOAuthWidget />

      {/* Lead Webhook Settings */}
      <WebhookSettingsWidget />

      {/* Bulk Import Clients */}
      <ClientBulkImport />

      {/* Bulk Import Leads */}
      <LeadBulkImport />

      {/* Developer Tools */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Developer Tools
          </CardTitle>
          <CardDescription>
            Dangerous actions for development and testing. Use with caution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isPurging}>
                <Trash2 className="h-4 w-4 mr-2" />
                {isPurging ? 'Purging...' : 'Purge Test Data'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Purge All Test Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all test records including:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Leads with @example.com emails</li>
                    <li>Visitor sessions with test- visitor IDs</li>
                    <li>Related attribution and conversion data</li>
                  </ul>
                  <p className="mt-2 font-medium">This action cannot be undone.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handlePurgeTestData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Purge Test Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-sm text-muted-foreground mt-2">
            Only deletes data matching test patterns. Real production data is not affected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
