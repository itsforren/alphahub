import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MFAVerificationProps {
  onSuccess: () => void;
  onBack?: () => void;
}

export default function MFAVerification({ onSuccess, onBack }: MFAVerificationProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { verifyMFAChallenge } = useAuth();
  const { toast } = useToast();

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    const { error: verifyError } = await verifyMFAChallenge(code);

    if (verifyError) {
      setError('Invalid verification code. Please try again.');
      setCode('');
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Verified!',
      description: 'Two-factor authentication successful.',
    });
    
    onSuccess();
  };

  const handleCodeComplete = (value: string) => {
    setCode(value);
    if (value.length === 6) {
      // Auto-submit when complete
      setTimeout(() => {
        const form = document.getElementById('mfa-form') as HTMLFormElement;
        form?.requestSubmit();
      }, 100);
    }
  };

  return (
    <motion.div
      key="mfa-step"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Two-Factor Authentication</h1>
        <p className="text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <form 
        id="mfa-form"
        onSubmit={(e) => { e.preventDefault(); handleVerify(); }} 
        className="space-y-6"
      >
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={handleCodeComplete}
            disabled={isLoading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button 
          type="submit" 
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isLoading || code.length !== 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </Button>
      </form>

      {onBack && (
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="w-full mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to login
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center mt-6">
        Open your authenticator app (Google Authenticator, Authy, etc.) to get your verification code.
      </p>
    </motion.div>
  );
}
