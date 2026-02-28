import { useState, useEffect } from 'react';
import { Shield, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EnrollmentData {
  id: string;
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export default function MFAEnrollment() {
  const [step, setStep] = useState<'idle' | 'enrolling' | 'verifying'>('idle');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { mfaStatus, enrollMFA, verifyMFA, unenrollMFA, checkMFAStatus } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const handleEnroll = async () => {
    setIsLoading(true);
    setError('');

    const { data, error: enrollError } = await enrollMFA();

    if (enrollError || !data) {
      setError(enrollError?.message || 'Failed to start enrollment');
      setIsLoading(false);
      return;
    }

    setEnrollmentData(data as EnrollmentData);
    setStep('enrolling');
    setIsLoading(false);
  };

  const handleVerify = async () => {
    if (!enrollmentData || code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    const { error: verifyError } = await verifyMFA(code, enrollmentData.id);

    if (verifyError) {
      setError('Invalid code. Please try again.');
      setCode('');
      setIsLoading(false);
      return;
    }

    toast({
      title: 'MFA Enabled!',
      description: 'Two-factor authentication has been set up successfully.',
    });

    setStep('idle');
    setEnrollmentData(null);
    setCode('');
    setIsLoading(false);
  };

  const handleDisable = async () => {
    if (!mfaStatus.factorId) return;

    setIsLoading(true);
    setError('');

    const { error: unenrollError } = await unenrollMFA(mfaStatus.factorId);

    if (unenrollError) {
      setError(unenrollError.message);
      setIsLoading(false);
      return;
    }

    toast({
      title: 'MFA Disabled',
      description: 'Two-factor authentication has been disabled.',
    });

    setIsLoading(false);
  };

  const copySecret = () => {
    if (enrollmentData?.totp.secret) {
      navigator.clipboard.writeText(enrollmentData.totp.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCodeComplete = (value: string) => {
    setCode(value);
  };

  if (mfaStatus.isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Your account is protected with 2FA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">MFA Enabled</p>
                <p className="text-sm text-muted-foreground">Using authenticator app</p>
              </div>
            </div>
          </div>

          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Disabling MFA will make your account less secure. You can re-enable it at any time.
            </AlertDescription>
          </Alert>

          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Disabling...
              </>
            ) : (
              'Disable Two-Factor Authentication'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'idle' && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Two-factor authentication adds an extra layer of security by requiring a code from your phone when you sign in.
            </p>
            <Button onClick={handleEnroll} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Enable Two-Factor Authentication
                </>
              )}
            </Button>
          </>
        )}

        {step === 'enrolling' && enrollmentData && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <img 
                  src={enrollmentData.totp.qr_code} 
                  alt="QR Code for MFA setup" 
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Or enter this code manually:
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-secondary px-3 py-1 rounded text-sm font-mono">
                  {enrollmentData.totp.secret}
                </code>
                <Button variant="ghost" size="icon" onClick={copySecret}>
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Enter the 6-digit code from your app to verify:
              </p>
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('idle');
                    setEnrollmentData(null);
                    setCode('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={isLoading || code.length !== 6}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
