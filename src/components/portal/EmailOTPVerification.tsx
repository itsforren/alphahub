import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, CheckCircle2, RefreshCw, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface EmailOTPVerificationProps {
  email: string;
  maskedEmail: string | null;
  expiresAt: string | null;
  isVerified: boolean;
  isSending: boolean;
  isVerifying: boolean;
  error: string | null;
  attemptsRemaining: number | null;
  onSendOTP: () => void;
  onVerifyOTP: (otp: string) => void;
}

export function EmailOTPVerification({
  email,
  maskedEmail,
  expiresAt,
  isVerified,
  isSending,
  isVerifying,
  error,
  attemptsRemaining,
  onSendOTP,
  onVerifyOTP,
}: EmailOTPVerificationProps) {
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [hasExpired, setHasExpired] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Check expiry
  useEffect(() => {
    if (!expiresAt) return;
    
    const checkExpiry = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      setHasExpired(now >= expires);
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleSendOTP = useCallback(() => {
    onSendOTP();
    setCountdown(60);
    setOtp('');
    setHasExpired(false);
  }, [onSendOTP]);

  const handleOTPChange = useCallback((value: string) => {
    setOtp(value);
    if (value.length === 6) {
      onVerifyOTP(value);
    }
  }, [onVerifyOTP]);

  // Already verified
  if (isVerified) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-500/10"
        >
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </motion.div>
        <h3 className="text-xl font-semibold text-emerald-500 mb-2">Email Verified</h3>
        <p className="text-muted-foreground">{email}</p>
      </motion.div>
    );
  }

  // Initial state - hasn't sent OTP yet
  if (!maskedEmail) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center mx-auto mb-6 ring-4 ring-amber-500/10">
          <Mail className="h-10 w-10 text-amber-500" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">Verify Your Email</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          We'll send a 6-digit verification code to:
        </p>
        
        <div className="bg-muted/50 rounded-lg px-6 py-3 inline-block mb-6">
          <span className="font-mono text-lg">{email}</span>
        </div>
        
        <div>
          <Button
            size="lg"
            onClick={handleSendOTP}
            disabled={isSending}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold px-8"
          >
            {isSending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 mr-2" />
                Send Verification Code
              </>
            )}
          </Button>
        </div>
      </motion.div>
    );
  }

  // OTP sent - show input
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-8"
    >
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center mx-auto mb-6 ring-4 ring-amber-500/10">
        <Mail className="h-10 w-10 text-amber-500" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">Enter Verification Code</h3>
      <p className="text-muted-foreground mb-6">
        We sent a 6-digit code to <span className="font-medium text-foreground">{maskedEmail}</span>
      </p>
      
      {/* OTP Input */}
      <div className="flex justify-center mb-6">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={handleOTPChange}
          disabled={isVerifying}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} className="w-12 h-14 text-2xl font-bold" />
            <InputOTPSlot index={1} className="w-12 h-14 text-2xl font-bold" />
            <InputOTPSlot index={2} className="w-12 h-14 text-2xl font-bold" />
            <InputOTPSlot index={3} className="w-12 h-14 text-2xl font-bold" />
            <InputOTPSlot index={4} className="w-12 h-14 text-2xl font-bold" />
            <InputOTPSlot index={5} className="w-12 h-14 text-2xl font-bold" />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {/* Verifying state */}
      <AnimatePresence mode="wait">
        {isVerifying && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center justify-center gap-2 text-amber-500 mb-4"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verifying...</span>
          </motion.div>
        )}

        {/* Error state */}
        {error && !isVerifying && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center justify-center gap-2 text-destructive mb-4"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
            {attemptsRemaining !== null && (
              <span className="text-muted-foreground">
                ({attemptsRemaining} attempts left)
              </span>
            )}
          </motion.div>
        )}

        {/* Expired state */}
        {hasExpired && !isVerifying && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center justify-center gap-2 text-amber-500 mb-4"
          >
            <AlertCircle className="h-4 w-4" />
            <span>Code expired. Please request a new one.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resend button */}
      <div className="mt-4">
        {countdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            Didn't receive it? Resend in <span className="font-medium text-foreground">{countdown}s</span>
          </p>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSendOTP}
            disabled={isSending}
            className="text-amber-500 hover:text-amber-600"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Resend Code
          </Button>
        )}
      </div>
    </motion.div>
  );
}
