import { useState } from 'react';
import { Shield, Loader2, Download, AlertTriangle, Copy, Check, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useClientDisputes } from '@/hooks/useClientDisputes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface FightDisputeButtonProps {
  clientId: string;
  clientName: string;
}

export function FightDisputeButton({ clientId, clientName }: FightDisputeButtonProps) {
  const { data: disputes = [] } = useClientDisputes(clientId);
  const [open, setOpen] = useState(false);
  const [adminContext, setAdminContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [evidenceData, setEvidenceData] = useState<any>(null);

  const activeDispute = disputes[0];

  const handleGenerate = async () => {
    if (!adminContext.trim()) {
      toast.error('Please describe what happened before generating.');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dispute-evidence', {
        body: { clientId, adminContext },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setEvidenceData(data);
      setStep(2);
      toast.success('Evidence generated! Copy text sections and download files below.');
    } catch (err: any) {
      console.error('Dispute evidence error:', err);
      toast.error(err.message || 'Failed to generate evidence package.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dispute-evidence', {
        body: { clientId, adminContext },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setEvidenceData(data);
      toast.success('Evidence regenerated successfully.');
    } catch (err: any) {
      console.error('Dispute evidence retry error:', err);
      toast.error(err.message || 'Failed to regenerate evidence.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => { setStep(1); setEvidenceData(null); }, 300);
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Shield className="w-4 h-4" />
        FIGHT DISPUTE
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={step === 2 ? "max-w-3xl max-h-[90vh] overflow-y-auto" : "max-w-lg"}>
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="w-5 h-5" />
                  Fight Dispute — {clientName}
                </DialogTitle>
                <DialogDescription>
                  Generate a complete evidence package to respond to this dispute.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {activeDispute ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Amount</span>
                      <span className="font-bold text-destructive">${activeDispute.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Reason</span>
                      <Badge variant="outline" className="text-xs">{activeDispute.reason || 'Unknown'}</Badge>
                    </div>
                    {activeDispute.evidenceDueBy && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Evidence Due</span>
                        <span className="text-sm font-medium text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {new Date(activeDispute.evidenceDueBy).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
                    No active dispute found. You can still generate an evidence package preemptively.
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Describe what happened and why we should win this dispute *
                  </label>
                  <Textarea
                    placeholder="e.g. Martin filed a dispute before even having a zoom call with us. We delivered 47 leads, spent $2,100 on ads, and he signed a non-refundable agreement. He admitted in an email that the dispute was filed as a 'protective measure'..."
                    value={adminContext}
                    onChange={(e) => setAdminContext(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Include any client admissions, emails, or specific issues they're disputing. The more detail you provide, the stronger the AI response will be.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleGenerate}
                  disabled={isGenerating || !adminContext.trim()}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Generate Evidence
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="w-5 h-5" />
                  Dispute Evidence — {clientName}
                </DialogTitle>
                <DialogDescription>
                  Copy the text sections below into the dispute form, then download the supporting files.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {/* Retry Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleRetry}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {isGenerating ? 'Regenerating...' : 'Retry / Regenerate'}
                  </Button>
                </div>

                {/* Copy/Paste Text Sections */}
                <CopySection title="Product Description" text={evidenceData?.narrative?.productDescription} />
                <CopySection title="Cancellation Policy Disclosure" text={evidenceData?.narrative?.cancellationDisclosure} />
                <CopySection title="Refund Refusal Explanation" text={evidenceData?.narrative?.refundRefusal} />
                <CopySection title="Refund Policy Disclosure" text={evidenceData?.narrative?.refundDisclosure} />
                <CopySection title="Additional Information / Final Details" text={evidenceData?.narrative?.additionalInfo} />

                {/* Activity Log */}
                <CopySection 
                  title="Complete Activity Log (Alpha Hub + CRM)" 
                  text={evidenceData?.activityLog}
                  expandable
                />

                {/* Download Files */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Download Files</h3>
                  <div className="grid gap-2">
                    <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => generateCommunicationsPDF(evidenceData)}>
                      <Download className="w-4 h-4" /> customer-communications.pdf
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => generateSupportingEvidencePDF(evidenceData)}>
                      <Download className="w-4 h-4" /> supporting-evidence.pdf
                    </Button>
                    {evidenceData?.agreement?.pdfUrl && (
                      <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => downloadAgreementPDF(evidenceData.agreement.pdfUrl)}>
                        <Download className="w-4 h-4" /> service-agreement.pdf
                      </Button>
                    )}
                  </div>
                </div>

                {/* Ad Spend Note */}
                <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Take a screenshot of the ad spend chart from the client's Billing tab to include as proof of ad spend.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Formatting Utilities ───

function stripFormatting(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1');
}

// ─── Copy Section Component ───

function CopySection({ title, text, expandable }: { title: string; text?: string; expandable?: boolean }) {
  const [copied, setCopied] = useState(false);
  const content = text ? stripFormatting(text) : 'No content generated.';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <div className={`rounded-md border bg-muted/20 p-3 text-xs leading-relaxed whitespace-pre-wrap overflow-y-auto ${expandable ? 'max-h-60' : 'max-h-40'}`}>
        {content}
      </div>
    </div>
  );
}

// ─── PDF Generators ───

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, 15, y);
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  return y;
}

function generateCommunicationsPDF(data: any) {
  const doc = new jsPDF({ compress: true });
  let y = 20;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Customer Communications Log", 15, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Client: ${data.client.name} | Total Messages: ${data.chatMessages.length}`, 15, y);
  y += 10;

  if (data.chatMessages.length === 0) {
    doc.text("No chat messages found for this client.", 15, y);
  } else {
    for (const msg of data.chatMessages) {
      if (y > 260) { doc.addPage(); y = 20; }
      const date = new Date(msg.date).toLocaleString();
      const sender = `${msg.sender} (${msg.role})`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`${date} — ${sender}`, 15, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      y = addWrappedText(doc, msg.message, 15, y, 175, 4);
      y += 3;
    }
  }

  doc.save(`customer-communications-${data.client.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

function generateSupportingEvidencePDF(data: any) {
  const doc = new jsPDF({ compress: true });
  let y = 20;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Supporting Evidence", 15, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Client: ${data.client.name} | Generated: ${new Date().toLocaleString()}`, 15, y);
  y += 6;

  if (data.adSpendTotals) {
    doc.setFontSize(9);
    doc.text(`Ad Spend Totals — Spent: $${data.adSpendTotals.totalSpend.toFixed(2)} | Clicks: ${data.adSpendTotals.totalClicks} | Impressions: ${data.adSpendTotals.totalImpressions.toLocaleString()}`, 15, y);
    y += 8;
  }

  // Leads Delivered
  y = addSectionHeader(doc, `Leads Delivered (${data.leads.length} total)`, y);
  if (data.leads.length > 0) {
    for (const lead of data.leads) {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(lead.name || 'Unknown', 15, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Email: ${lead.email || 'N/A'} | Phone: ${lead.phone || 'N/A'}`, 15, y);
      y += 4;
      doc.text(`Lead Date: ${lead.date ? new Date(lead.date).toLocaleDateString() : 'N/A'} | Delivered: ${lead.deliveredAt ? new Date(lead.deliveredAt).toLocaleDateString() : 'N/A'} | Booked Call: ${lead.bookedCallAt ? new Date(lead.bookedCallAt).toLocaleDateString() : '—'}`, 15, y);
      y += 6;
    }
  } else {
    doc.text("No delivered leads found.", 15, y);
    y += 5;
  }
  y += 6;

  // Transaction Records
  y = addSectionHeader(doc, "Transaction & Billing Records", y);
  if (data.billing.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Date", 15, y);
    doc.text("Amount", 55, y);
    doc.text("Type", 85, y);
    doc.text("Status", 125, y);
    doc.text("Paid At", 155, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    for (const b of data.billing) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(new Date(b.date).toLocaleDateString(), 15, y);
      doc.text(`$${b.amount}`, 55, y);
      doc.text((b.type || '').substring(0, 15), 85, y);
      doc.text((b.status || '').substring(0, 12), 125, y);
      doc.text(b.paidAt ? new Date(b.paidAt).toLocaleDateString() : '—', 155, y);
      y += 4;
    }
  }

  doc.save(`supporting-evidence-${data.client.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

async function downloadAgreementPDF(pdfUrl: string) {
  try {
    const { data: signedUrlData, error } = await supabase.storage
      .from('agreements')
      .createSignedUrl(pdfUrl.replace(/^agreements\//, ''), 300);

    if (error || !signedUrlData?.signedUrl) {
      console.error('Failed to create signed URL for agreement:', error);
      toast.error('Could not download the signed agreement PDF.');
      return;
    }

    const response = await fetch(signedUrlData.signedUrl);
    const blob = await response.blob();

    if (blob.size > 4 * 1024 * 1024) {
      toast.warning('Agreement PDF is over 4MB. You may need to compress it before uploading.');
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service-agreement.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error downloading agreement:', err);
    toast.error('Failed to download agreement PDF.');
  }
}
