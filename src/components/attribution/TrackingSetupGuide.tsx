import { useState } from 'react';
import { Copy, Check, Code, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function TrackingSetupGuide() {
  const [open, setOpen] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyCode = async (code: string, name: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedSnippet(name);
    toast.success(`${name} copied!`);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const trackingScriptEmbed = `<!-- AlphaAgent Attribution Tracking -->
<script src="${SUPABASE_URL}/functions/v1/tracking-script"></script>`;

  const formIntegrationCode = `<!-- Add hidden field to your lead form -->
<input type="hidden" name="visitor_id" id="alpha_visitor_id" />

<script>
// Set visitor ID when form loads
document.getElementById('alpha_visitor_id').value = window.alphaGetVisitorId();
</script>`;

  const webhookPayloadExample = `{
  "first_name": "John",
  "last_name": "Doe", 
  "email": "john@example.com",
  "phone": "+1234567890",
  "visitor_id": "v_abc123...",  // From hidden field
  "agent_id": "your-agent-id"
}`;

  const customEventCode = `// Track custom events
window.alphaTrack('cta_clicked', {
  button: 'schedule_call',
  page: 'pricing'
});

// Track form starts
window.alphaTrack('form_start', {
  form_id: 'lead_form'
});`;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="bg-card border-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  Tracking Setup Guide
                </CardTitle>
                <CardDescription>
                  How to embed tracking on external pages and connect lead forms
                </CardDescription>
              </div>
              <Badge variant="outline">Click to expand</Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            <Tabs defaultValue="embed">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="embed">1. Embed Script</TabsTrigger>
                <TabsTrigger value="form">2. Form Setup</TabsTrigger>
                <TabsTrigger value="webhook">3. Webhook</TabsTrigger>
                <TabsTrigger value="events">4. Custom Events</TabsTrigger>
              </TabsList>

              {/* Step 1: Embed Script */}
              <TabsContent value="embed" className="mt-4 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">What this does:</p>
                    <p className="text-muted-foreground">
                      Automatically tracks page views, sessions, button clicks, and form submissions.
                      Captures UTM parameters, referrers, and creates a unique visitor ID.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Add this to your landing pages (before &lt;/body&gt;):</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCode(trackingScriptEmbed, 'Tracking script')}
                    >
                      {copiedSnippet === 'Tracking script' ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                    {trackingScriptEmbed}
                  </pre>
                </div>
              </TabsContent>

              {/* Step 2: Form Setup */}
              <TabsContent value="form" className="mt-4 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Why this matters:</p>
                    <p className="text-muted-foreground">
                      The visitor_id connects the lead to all their previous sessions and events.
                      This is how we know which ad they clicked 3 days ago!
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Add a hidden field to capture visitor ID:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCode(formIntegrationCode, 'Form integration')}
                    >
                      {copiedSnippet === 'Form integration' ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre">
                    {formIntegrationCode}
                  </pre>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Available functions:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><code className="bg-muted px-1 rounded">window.alphaGetVisitorId()</code> - Get visitor ID</li>
                    <li><code className="bg-muted px-1 rounded">window.alphaGetAttribution()</code> - Get full attribution data</li>
                    <li><code className="bg-muted px-1 rounded">window.alphaTrack(event, data)</code> - Track custom event</li>
                  </ul>
                </div>
              </TabsContent>

              {/* Step 3: Webhook */}
              <TabsContent value="webhook" className="mt-4 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">How leads get attributed:</p>
                    <p className="text-muted-foreground">
                      When your form submits, send a POST to our webhook with the visitor_id.
                      We'll match it to the visitor's sessions and create an attribution record.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border border-border mb-4">
                  <p className="text-sm font-medium mb-2">📋 Webhook Types:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li><strong>lead-webhook</strong> — For B2C insurance leads (requires API key, creates lead + attribution)</li>
                    <li><strong>Internal forms</strong> — Homepage & Partner forms save to <code className="bg-muted px-1 rounded">prospects</code> table automatically</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Lead Webhook URL (for external lead forms):</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCode(`${SUPABASE_URL}/functions/v1/lead-webhook`, 'Webhook URL')}
                    >
                      {copiedSnippet === 'Webhook URL' ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                    POST {SUPABASE_URL}/functions/v1/lead-webhook
                  </pre>
                  <p className="text-xs text-muted-foreground">Requires <code className="bg-muted px-1 rounded">x-api-key</code> header</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Example payload (include visitor_id!):</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCode(webhookPayloadExample, 'Payload example')}
                    >
                      {copiedSnippet === 'Payload example' ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre">
                    {webhookPayloadExample}
                  </pre>
                </div>

                <div className="text-sm text-muted-foreground border-t pt-3 mt-3">
                  <p><strong>Supported visitor_id field names:</strong></p>
                  <code className="bg-muted px-2 py-1 rounded block mt-1 text-xs">
                    visitor_id, visitorId, alpha_visitor_id, nfia_visitor_id
                  </code>
                </div>
              </TabsContent>

              {/* Step 4: Custom Events */}
              <TabsContent value="events" className="mt-4 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Track more than page views:</p>
                    <p className="text-muted-foreground">
                      Use custom events to track specific actions like CTA clicks, video views, 
                      scroll depth, or any interaction you want in the customer journey.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Custom event tracking:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCode(customEventCode, 'Custom events')}
                    >
                      {copiedSnippet === 'Custom events' ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre">
                    {customEventCode}
                  </pre>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p><strong>Pro tip:</strong> Add <code className="bg-muted px-1 rounded">data-track="button_name"</code> to any element and it will be tracked automatically on click!</p>
                </div>
              </TabsContent>
            </Tabs>

            {/* UTM Naming Convention */}
            <div className="border-t pt-4">
              <p className="font-medium text-sm mb-3">Recommended UTM Naming Convention:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">utm_source</p>
                  <code className="bg-muted px-2 py-1 rounded block">facebook, google, youtube, email, referral</code>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">utm_medium</p>
                  <code className="bg-muted px-2 py-1 rounded block">paid_social, cpc, paid_video, email, referral</code>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">utm_campaign</p>
                  <code className="bg-muted px-2 py-1 rounded block">june_2024_promo, retargeting_buyers, cold_awareness</code>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">utm_content (Ad Creative)</p>
                  <code className="bg-muted px-2 py-1 rounded block">video_testimonial_v2, static_pricing_a, carousel_benefits</code>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
