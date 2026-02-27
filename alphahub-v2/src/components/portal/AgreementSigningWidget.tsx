import { motion } from 'framer-motion';
import { AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AgreementSigningWidgetProps {
  clientId: string;
}

export function AgreementSigningWidget({ clientId }: AgreementSigningWidgetProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // For admins, include clientId in the URL so they can preview
  const signUrl = isAdmin 
    ? `/hub/sign-agreement?clientId=${clientId}` 
    : '/hub/sign-agreement';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-destructive bg-destructive/5 overflow-hidden">
        <div className="bg-destructive/10 px-4 py-2 flex items-center justify-between border-b border-destructive/20">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </motion.div>
            <span className="font-semibold text-destructive">
              URGENT: Service Agreement Required
            </span>
          </div>
          <Badge variant="destructive" className="animate-pulse">
            UNSIGNED
          </Badge>
        </div>
        
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <FileText className="h-8 w-8 text-destructive" />
            </div>
            
            <div className="flex-1">
              <p className="text-muted-foreground mb-4">
                {isAdmin 
                  ? "This client must sign the Service Agreement before their advertising campaigns can go live."
                  : "You must sign the Service Agreement before your advertising campaigns can go live. This is a legally binding contract that outlines our partnership terms."
                }
              </p>
              
              <Button 
                onClick={() => navigate(signUrl)}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isAdmin ? 'Preview Agreement' : 'Review & Sign Agreement'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
