import { motion } from 'framer-motion';
import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { getSignedAgreementsDownloadUrl } from '@/lib/agreementsStorage';

interface AgreementSignedWidgetProps {
  clientId: string;
  signedAt: string;
  pdfUrl?: string | null;
}

export function AgreementSignedWidget({ signedAt, pdfUrl }: AgreementSignedWidgetProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAgreement = async () => {
    if (!pdfUrl) {
      toast.error('Agreement PDF not available');
      return;
    }
    
    setIsDownloading(true);
    try {
      const signedUrl = await getSignedAgreementsDownloadUrl(pdfUrl);
      
      // Fetch as blob to bypass ad-blocker issues
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error('Failed to fetch PDF');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'Service-Agreement.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      toast.success('Agreement downloaded successfully');
    } catch (e) {
      console.error('Failed to download agreement:', e);
      toast.error('Unable to download agreement. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Service Agreement</span>
                  <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                    Signed
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Signed on {format(new Date(signedAt), 'MMMM d, yyyy')} at {format(new Date(signedAt), 'h:mm a')}
                </p>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadAgreement}
              disabled={isDownloading || !pdfUrl}
              className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download Agreement
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
