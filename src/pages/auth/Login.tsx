import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import MFAVerification from '@/components/auth/MFAVerification';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FlowStep = 'email' | 'login' | 'create-account' | 'not-found' | 'mfa' | 'set-password' | 'blocked';

interface ClientStatus {
  exists: boolean;
  hasAccount: boolean;
  needsPasswordSetup?: boolean;
  isStaffMember?: boolean;
  userRole?: string;
  clientName: string | null;
  clientId?: string;
  userId?: string;
  blocked?: boolean;
  blockedReason?: string;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>('email');
  const [clientStatus, setClientStatus] = useState<ClientStatus | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.from?.pathname + ((location.state as any)?.from?.search || '') || '/hub';

  const checkClientEmail = async () => {
    setErrors({});
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('check-client-email', {
        body: { email: email.toLowerCase().trim() }
      });

      if (error) {
        toast({
          title: 'Error',
          description: 'Unable to verify email. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      setClientStatus(data);

      if (data.blocked) {
        setFlowStep('blocked');
      } else if (!data.exists) {
        setFlowStep('not-found');
      } else if (data.needsPasswordSetup) {
        // User exists but needs to set their password (first login after webhook creation)
        setFlowStep('set-password');
      } else if (data.hasAccount) {
        setFlowStep('login');
      } else {
        setFlowStep('create-account');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    setIsLoading(true);
    
    const { error, requiresMFA } = await signIn(email, password);
    
    if (error) {
      toast({
        title: 'Login failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.' 
          : error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Check if MFA verification is required
    if (requiresMFA) {
      setFlowStep('mfa');
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Welcome back!',
      description: 'You have successfully logged in.',
    });
    
    navigate(returnTo);
  };

  const handleMFASuccess = () => {
    toast({
      title: 'Welcome back!',
      description: 'You have successfully logged in.',
    });
    navigate(returnTo);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'password') fieldErrors.password = err.message;
        if (err.path[0] === 'confirmPassword') fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Call the set-client-password edge function
      const { data, error } = await supabase.functions.invoke('set-client-password', {
        body: { 
          email: email.toLowerCase().trim(),
          newPassword: password 
        }
      });

      if (error || !data?.success) {
        toast({
          title: 'Password setup failed',
          description: data?.error || 'Unable to set password. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Now sign in with the new password
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        toast({
          title: 'Password set successfully',
          description: 'Your password was set but login failed. Please try signing in.',
        });
        setFlowStep('login');
        setIsLoading(false);
        return;
      }

      toast({
        title: `Welcome, ${clientStatus?.clientName || 'Client'}!`,
        description: 'Your password has been set successfully.',
      });
      
      navigate(returnTo);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'password') fieldErrors.password = err.message;
        if (err.path[0] === 'confirmPassword') fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('check-client-email', {
        body: { 
          email: email.toLowerCase().trim(),
          action: 'create-account',
          password 
        }
      });

      if (error || !data.success) {
        toast({
          title: 'Account creation failed',
          description: data?.error || 'Unable to create account. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Now sign in with the new credentials
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        toast({
          title: 'Account created',
          description: 'Your account was created but login failed. Please try signing in.',
          variant: 'destructive',
        });
        setFlowStep('login');
        setIsLoading(false);
        return;
      }

      toast({
        title: `Welcome, ${clientStatus?.clientName || 'Client'}!`,
        description: 'Your account has been created successfully.',
      });
      
      navigate(returnTo);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setFlowStep('email');
    setPassword('');
    setConfirmPassword('');
    setErrors({});
    setClientStatus(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-radial opacity-30" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-1 mb-8">
          <span className="text-2xl font-light tracking-tight text-foreground">ALPHA</span>
          <span className="text-2xl font-bold tracking-tight text-primary">AGENT</span>
        </Link>

        <div className="glass-card p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Email Entry */}
            {flowStep === 'email' && (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-foreground mb-2">Client Portal</h1>
                  <p className="text-muted-foreground">Enter your email to access your portal</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); checkClientEmail(); }} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-secondary/50 border-border"
                      disabled={isLoading}
                      autoFocus
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Step 2a: Not Found */}
            {flowStep === 'not-found' && (
              <motion.div
                key="not-found-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className="mb-6">
                  <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
                  <h1 className="text-2xl font-bold text-foreground mb-2">Email Not Found</h1>
                  <p className="text-muted-foreground">
                    This email is not registered as an Alpha Agent client.
                  </p>
                </div>

                <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground">
                    If you believe this is an error, please contact us at{' '}
                    <a href="mailto:support@alphaagent.io" className="text-primary hover:underline">
                      support@alphaagent.io
                    </a>
                  </p>
                </div>

                <div className="space-y-3">
                  <a 
                    href="https://alphaagent.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Submit Your Application to Become a Client
                    </Button>
                  </a>
                  
                  <Button 
                    variant="outline" 
                    onClick={goBack}
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Try a different email
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step: Account Blocked (Cancelled) */}
            {flowStep === 'blocked' && (
              <motion.div
                key="blocked-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className="mb-6">
                  <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
                  <h1 className="text-2xl font-bold text-foreground mb-2">Account Cancelled</h1>
                  <p className="text-muted-foreground">
                    {clientStatus?.blockedReason || 'Your account has been cancelled.'}
                  </p>
                </div>

                <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground">
                    If you believe this is an error, please contact us at{' '}
                    <a href="mailto:support@alphaagent.io" className="text-primary hover:underline">
                      support@alphaagent.io
                    </a>
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={goBack}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Try a different email
                </Button>
              </motion.div>
            )}

            {/* Step 2b: Create Account (First Time) */}
            {flowStep === 'create-account' && (
              <motion.div
                key="create-account-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    Welcome, {clientStatus?.clientName || 'Client'}!
                  </h1>
                  <p className="text-muted-foreground">
                    Set a password to access your client portal
                  </p>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="bg-secondary/30 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground">
                      {email}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Create Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-secondary/50 border-border pr-10"
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-secondary/50 border-border"
                      disabled={isLoading}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account & Sign In'
                    )}
                  </Button>
                </form>

                <Button 
                  variant="ghost" 
                  onClick={goBack}
                  className="w-full mt-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Use a different email
                </Button>
              </motion.div>
            )}

            {/* Step 2c: Set Password (First Login - Webhook Created Account) */}
            {flowStep === 'set-password' && (
              <motion.div
                key="set-password-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    Welcome, {clientStatus?.clientName || 'Client'}!
                  </h1>
                  <p className="text-muted-foreground">
                    Create your password to access your client portal
                  </p>
                </div>

                <form onSubmit={handleSetPassword} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="bg-secondary/30 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground">
                      {email}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="set-password">Create Password</Label>
                    <div className="relative">
                      <Input
                        id="set-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-secondary/50 border-border pr-10"
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-set-password">Confirm Password</Label>
                    <Input
                      id="confirm-set-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-secondary/50 border-border"
                      disabled={isLoading}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting Password...
                      </>
                    ) : (
                      'Set Password & Sign In'
                    )}
                  </Button>
                </form>

                <Button 
                  variant="ghost" 
                  onClick={goBack}
                  className="w-full mt-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Use a different email
                </Button>
              </motion.div>
            )}

            {/* Step 2d: Login (Existing Account) */}
            {flowStep === 'login' && (
              <motion.div
                key="login-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    Welcome Back{clientStatus?.clientName ? `, ${clientStatus.clientName}` : ''}!
                  </h1>
                  <p className="text-muted-foreground">Enter your password to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="bg-secondary/30 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground">
                      {email}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link 
                        to="/forgot-password" 
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-secondary/50 border-border pr-10"
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                <Button 
                  variant="ghost" 
                  onClick={goBack}
                  className="w-full mt-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Use a different email
                </Button>
              </motion.div>
            )}

            {/* Step 3: MFA Verification */}
            {flowStep === 'mfa' && (
              <MFAVerification 
                onSuccess={handleMFASuccess}
                onBack={goBack}
              />
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/" className="hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
