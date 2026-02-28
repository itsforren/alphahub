import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface SMSOTPVerificationProps {
  phone: string;
  maskedPhone: string | null;
  isVerified: boolean;
  isSending: boolean;
  isVerifying: boolean;
  error: string | null;
  attemptsRemaining: number | null;
  expiresAt: string | null;
  onSendOTP: () => Promise<boolean>;
  onVerifyOTP: (otp: string) => Promise<boolean>;
}

export function SMSOTPVerification({
  phone,
  maskedPhone,
  isVerified,
  isSending,
  isVerifying,
  error,
  attemptsRemaining,
  expiresAt,
  onSendOTP,
  onVerifyOTP,
}: SMSOTPVerificationProps) {
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Check expiry
  useEffect(() => {
    if (expiresAt) {
      const checkExpiry = () => {
        setIsExpired(new Date(expiresAt) < new Date());
      };
      checkExpiry();
      const interval = setInterval(checkExpiry, 1000);
      return () => clearInterval(interval);
    }
  }, [expiresAt]);

  const handleSendOTP = useCallback(async () => {
    const success = await onSendOTP();
    if (success) {
      setCountdown(60);
      setOtp('');
      setIsExpired(false);
    }
  }, [onSendOTP]);

  const handleOTPChange = useCallback(async (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      await onVerifyOTP(value);
    }
  }, [onVerifyOTP]);

  // Success state
  if (isVerified) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 p-6 bg-primary/5 rounded-xl border border-primary/20"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-lg">Phone Verified</h3>
          <p className="text-sm text-muted-foreground">
            Your identity has been confirmed via SMS
          </p>
        </div>
      </motion.div>
    );
  }

  // Initial state - before sending OTP
  if (!maskedPhone) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-lg mb-2">Verify Your Identity</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We'll send a 6-digit verification code to your phone number on file.
          </p>
        </div>
        <Button
          onClick={handleSendOTP}
          disabled={isSending}
          size="lg"
          className="w-full max-w-xs"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Verification Code
            </>
          )}
        </Button>
      </div>
    );
  }

  // OTP input state
  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageSquare className="w-8 h-8 text-primary" />
      </div>
      
      <div className="text-center">
        <h3 className="font-semibold text-lg mb-2">Enter Verification Code</h3>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium">{maskedPhone}</span>
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {isVerifying ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Verifying...</span>
          </div>
        ) : (
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={handleOTPChange}
            disabled={isExpired}
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
        )}

        {error && !isVerifying && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            {attemptsRemaining !== null && attemptsRemaining > 0 && (
              <span className="text-muted-foreground">
                ({attemptsRemaining} attempts remaining)
              </span>
            )}
          </div>
        )}

        {isExpired && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Code expired. Please request a new one.</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSendOTP}
          disabled={isSending || countdown > 0}
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : countdown > 0 ? (
            `Resend Code (${countdown}s)`
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Resend Code
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Didn't receive the code? Check your phone or request a new one.
        </p>
      </div>
    </div>
  );
}
