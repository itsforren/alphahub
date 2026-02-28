import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  ChevronDown, 
  Webhook, 
  Settings2,
  CheckCheck,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePartners } from '@/hooks/usePartners';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function GHLWebhookSetup() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { data: partners } = usePartners();

  const baseWebhookUrl = `${SUPABASE_URL}/functions/v1/prospect-booking-webhook`;

  const copyUrl = async (url: string, label: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast({
      title: "Copied!",
      description: `${label} webhook URL copied to clipboard`,
    });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const steps = [
    {
      title: "Go to your Sales Sub-account in GHL",
      description: "Navigate to Automations → Workflows in your B2B sales sub-account",
    },
    {
      title: "Create a new Workflow",
      description: "Name it 'Alpha Hub Sales Tracker Sync' or similar",
    },
    {
      title: "Add Trigger: Appointment Status",
      description: "Select ALL status types: Booked, Confirmed, Cancelled, No Show, Showed/Completed, Rescheduled",
    },
    {
      title: "Add Action: Webhook (POST)",
      description: "Paste the appropriate webhook URL (Direct or Partner). Method: POST, Content-Type: application/json",
    },
    {
      title: "Publish & Test",
      description: "Activate the workflow. Book a test appointment to verify it appears in the Sales Tracker.",
    },
  ];

  return (
    <Card className="border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Webhook className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">GHL Appointment Webhook Setup</CardTitle>
                  <CardDescription>
                    Configure GHL to send appointment events to Alpha Hub
                  </CardDescription>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Direct Sales Webhook URL */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Direct Sales Webhook URL</span>
                <Badge variant="outline" className="text-xs">
                  POST
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-background rounded-lg text-xs text-muted-foreground font-mono break-all border border-border">
                  {baseWebhookUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyUrl(baseWebhookUrl, 'Direct Sales')}
                  className="flex-shrink-0"
                >
                  {copiedUrl === baseWebhookUrl ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use this URL for your direct Alpha Agent sales funnel
              </p>
            </div>

            {/* Partner Webhook URLs */}
            {partners && partners.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Partner Webhook URLs
                </h4>
                {partners.map((partner) => {
                  const partnerUrl = `${baseWebhookUrl}?partner=${partner.slug}`;
                  return (
                    <div 
                      key={partner.id}
                      className="p-4 rounded-lg border"
                      style={{ borderColor: partner.color + '40', backgroundColor: partner.color + '10' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: partner.color }}
                          />
                          <span className="text-sm font-medium text-foreground">{partner.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          POST
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-3 bg-background rounded-lg text-xs text-muted-foreground font-mono break-all border border-border">
                          {partnerUrl}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyUrl(partnerUrl, partner.name)}
                          className="flex-shrink-0"
                        >
                          {copiedUrl === partnerUrl ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Use this URL in {partner.name}'s GHL sub-account workflow
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Supported Events */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Supported Events
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { status: 'Booked', color: 'bg-primary/10 text-primary' },
                  { status: 'Confirmed', color: 'bg-primary/10 text-primary' },
                  { status: 'Cancelled', color: 'bg-destructive/10 text-destructive' },
                  { status: 'No Show', color: 'bg-warning/10 text-warning' },
                  { status: 'Completed', color: 'bg-success/10 text-success' },
                  { status: 'Rescheduled', color: 'bg-muted text-muted-foreground' },
                ].map((event) => (
                  <div 
                    key={event.status}
                    className={`px-3 py-2 rounded-lg text-xs font-medium ${event.color} border border-current/10`}
                  >
                    {event.status}
                  </div>
                ))}
              </div>
            </div>

            {/* Setup Steps */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-primary" />
                Setup Steps
              </h4>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div 
                    key={index}
                    className="flex gap-3 p-3 rounded-lg bg-secondary/30 border border-border"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payload Example */}
            <div>
              <h4 className="text-sm font-medium mb-2">Expected Payload Fields</h4>
              <pre className="p-3 rounded-lg bg-background border border-border text-xs overflow-x-auto">
{`{
  "id": "ghl_appointment_id",
  "appointmentStatus": "confirmed|cancelled|noshow|showed",
  "startTime": "2024-01-15T10:00:00Z",
  "contact": {
    "id": "ghl_contact_id",
    "email": "prospect@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "calendarName": "Discovery Call"
}`}
              </pre>
            </div>

            {/* Help Link */}
            <div className="pt-2 border-t border-border">
              <a 
                href="https://help.gohighlevel.com/support/solutions/articles/48001204904-workflows-overview"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                GHL Workflows Documentation
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
