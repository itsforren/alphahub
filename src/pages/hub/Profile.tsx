import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  FileText,
  Calendar,
  Link as LinkIcon,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientPreview } from '@/contexts/ClientPreviewContext';
import { useClient } from '@/hooks/useClientData';
import { useClient as useClientById } from '@/hooks/useClients';
import { useSuccessManagerSettings } from '@/hooks/useSuccessManagerSettings';
import { usePortalSettings } from '@/hooks/usePortalSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SuccessManagerCard } from '@/components/portal/SuccessManagerCard';
import { ClientSelfOnboarding } from '@/components/portal/ClientSelfOnboarding';
import { AgreementSigningWidget } from '@/components/portal/AgreementSigningWidget';
import { OnboardingPaymentFlow } from '@/components/portal/OnboardingPaymentFlow';
import { PaymentMethodCard } from '@/components/portal/PaymentMethodCard';


export default function HubProfile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const { viewAsClientId, isPreviewMode } = useClientPreview();
  const [paymentWizardOpen, setPaymentWizardOpen] = useState(false);

  // Auto-open payment wizard if redirected from agreement signing
  useEffect(() => {
    if (searchParams.get('openPayment') === 'true') {
      setPaymentWizardOpen(true);
      searchParams.delete('openPayment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  // Fetch own client data using user_id matching
  const { data: ownClient, isLoading: ownLoading } = useClient();
  // Fetch preview client data if in preview mode
  const { data: previewClient, isLoading: previewLoading } = useClientById(viewAsClientId || undefined);
  
  const { data: smDefaults } = useSuccessManagerSettings();
  const { data: portalSettings, isLoading: settingsLoading } = usePortalSettings();

  // Determine which client to show
  const isLoading = ownLoading || settingsLoading || (isPreviewMode && previewLoading);
  const rawClient = isPreviewMode ? previewClient : ownClient;
  // Use type assertion to access all client fields
  const client = rawClient as (typeof rawClient & {
    success_manager_name?: string | null;
    success_manager_email?: string | null;
    success_manager_phone?: string | null;
    success_manager_image_url?: string | null;
    tfwp_profile_link?: string | null;
    agreement_link?: string | null;
  }) | null;

  // Get success manager info (client-specific or defaults)
  const successManagerName = client?.success_manager_name || smDefaults?.default_success_manager_name || null;
  const successManagerEmail = client?.success_manager_email || smDefaults?.default_success_manager_email || null;
  const successManagerPhone = client?.success_manager_phone || smDefaults?.default_success_manager_phone || null;
  const successManagerImage = client?.success_manager_image_url || smDefaults?.default_success_manager_image_url || null;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <User className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">No Profile Found</h2>
        <p className="text-muted-foreground max-w-md">
          Your account hasn't been linked to a client profile yet. Please contact support for assistance.
        </p>
        <Button className="mt-4" onClick={() => navigate('/hub/chat')}>
          Contact Support
        </Button>
      </div>
    );
  }

  const statusColor = client.status === 'active' ? 'bg-emerald-500' : 
                      client.status === 'paused' ? 'bg-amber-500' : 'bg-muted';

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">View your account details and status</p>
      </motion.div>

      {/* Agreement Signing Widget - Show for any client who hasn't signed */}
      {client.id && !client.contract_signed_at && (
        <AgreementSigningWidget clientId={client.id} />
      )}

      {/* Onboarding Payment Flow - Guided steps */}
      {client.id && (
        <OnboardingPaymentFlow
          clientId={client.id}
          hasSignedAgreement={!!client.contract_signed_at}
          clientEmail={client.email}
          open={paymentWizardOpen}
          onOpenChange={setPaymentWizardOpen}
        />
      )}

      {/* Payment Methods on File */}
      {client.id && (
        <PaymentMethodCard clientId={client.id} />
      )}

      {/* Self-Onboarding Checklist - Show for all clients (component handles hiding when complete) */}
      {client.id && (
        <ClientSelfOnboarding 
          clientId={client.id} 
          hasSignedAgreement={!!client.contract_signed_at}
          clientCreatedAt={client.created_at}
          clientName={client.name}
          onOpenPaymentWizard={() => setPaymentWizardOpen(true)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                My Details
              </CardTitle>
              <CardDescription>Your contact information and account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Name</label>
                  <p className="font-medium text-foreground">{client.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <a href={`mailto:${client.email}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {client.email}
                    </a>
                  </div>
                </div>
                {client.phone && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Phone</label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      <a href={`tel:${client.phone}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {client.phone}
                      </a>
                    </div>
                  </div>
                )}
                {client.states && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">States Served</label>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <p className="font-medium text-foreground">{client.states}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Info */}
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Account Status</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                    <span className="text-sm capitalize">{client.status}</span>
                  </div>
                  {client.package_type && (
                    <Badge variant="outline" className="w-fit capitalize">
                      {client.package_type.replace('_', ' ')}
                    </Badge>
                  )}
                  {client.ads_live && (
                    <div className="flex items-center gap-1.5 text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm">Ads Live</span>
                    </div>
                  )}
                  {client.onboarding_status && client.onboarding_status !== 'completed' && (
                    <div className="flex items-center gap-1.5 text-amber-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm capitalize">Onboarding: {client.onboarding_status}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Success Manager - Right column */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SuccessManagerCard
            name={successManagerName}
            email={successManagerEmail}
            phone={successManagerPhone}
            imageUrl={successManagerImage}
          />
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-primary" />
                Quick Links
              </CardTitle>
              <CardDescription>Access your important resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {client.tfwp_profile_link && (
                  <Button variant="outline" asChild className="justify-start gap-2">
                    <a href={client.tfwp_profile_link} target="_blank" rel="noopener noreferrer">
                      <Shield className="w-4 h-4 text-primary" />
                      TFWP Profile
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </a>
                  </Button>
                )}
                {client.agreement_link && (
                  <Button variant="outline" asChild className="justify-start gap-2">
                    <a href={client.agreement_link} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 text-primary" />
                      Agreement
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </a>
                  </Button>
                )}
                {client.nfia_link && (
                  <Button variant="outline" asChild className="justify-start gap-2">
                    <a href={client.nfia_link} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 text-primary" />
                      NFIA
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </a>
                  </Button>
                )}
                {(client as any).scheduler_link && (
                  <Button variant="outline" asChild className="justify-start gap-2">
                    <a href={(client as any).scheduler_link} target="_blank" rel="noopener noreferrer">
                      <Calendar className="w-4 h-4 text-primary" />
                      Book a Call
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </a>
                  </Button>
                )}
              </div>
              {!client.tfwp_profile_link && !client.agreement_link && !client.nfia_link && !(client as any).scheduler_link && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No quick links configured yet.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
