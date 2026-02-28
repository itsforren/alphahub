import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import MFAVerification from '@/components/auth/MFAVerification';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useCallback } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'member' | 'guest';
  requireMFA?: boolean;
  /** Bypass MFA gating for this route (use sparingly) */
  skipMFA?: boolean;
}

export default function ProtectedRoute({ children, requiredRole, requireMFA, skipMFA }: ProtectedRouteProps) {
  const { user, role, loading, mfaStatus, isAdmin, isReferrer, checkMFAStatus } = useAuth();
  const location = useLocation();
  const [mfaVerified, setMfaVerified] = useState(false);

  const handleMFASuccess = useCallback(async () => {
    // Re-check MFA status after successful verification
    await checkMFAStatus();
    setMfaVerified(true);
  }, [checkMFAStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole === 'admin' && role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  if (requiredRole === 'member' && role === 'guest') {
    return <Navigate to="/app" replace />;
  }

  // Referrers can only access referrals page
  if (isReferrer && !location.pathname.startsWith('/hub/referrals')) {
    return <Navigate to="/hub/referrals" replace />;
  }

  // Check MFA requirements for admin routes
  // If user is admin with MFA enabled but not verified, require verification
  // Use local state to track successful verification without page reload
  const shouldRequireMFA = !skipMFA && (requireMFA || (
    requiredRole === 'admin' && 
    isAdmin && 
    mfaStatus.isEnabled && 
    !mfaStatus.isVerified && 
    !mfaVerified
  ));
  
  if (shouldRequireMFA) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-gradient-radial opacity-30" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <Link to="/" className="flex items-center justify-center gap-1 mb-8">
            <span className="text-2xl font-light tracking-tight text-foreground">ALPHA</span>
            <span className="text-2xl font-bold tracking-tight text-primary">AGENT</span>
          </Link>

          <div className="glass-card p-8">
            <MFAVerification 
              onSuccess={handleMFASuccess}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
