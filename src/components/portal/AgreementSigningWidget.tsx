import { motion } from 'framer-motion';
import { FileText, ArrowRight } from 'lucide-react';
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

  const signUrl = isAdmin
    ? `/hub/sign-agreement?clientId=${clientId}`
    : '/hub/sign-agreement';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-blue-500/30 bg-blue-500/5 overflow-hidden">
        <div className="bg-blue-500/10 px-4 py-2 flex items-center justify-between border-b border-blue-500/20">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <FileText className="h-5 w-5 text-blue-500" />
            </motion.div>
            <span className="font-semibold text-blue-500">
              Service Agreement Required
            </span>
          </div>
          <Badge className="bg-blue-500/20 text-blue-600 border-0">
            UNSIGNED
          </Badge>
        </div>

        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-blue-500/10">
              <FileText className="h-8 w-8 text-blue-500" />
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
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
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
