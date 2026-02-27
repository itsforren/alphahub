import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthMFAEnrollResponse, AuthMFAVerifyResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
type AppRole = 'admin' | 'member' | 'guest' | 'client' | 'referrer';

interface MFAStatus {
  isEnabled: boolean;
  isVerified: boolean;
  factorId: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  role: AppRole | null;
  loading: boolean;
  mfaStatus: MFAStatus;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; requiresMFA?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isMember: boolean;
  isClient: boolean;
  isReferrer: boolean;
  // MFA methods
  enrollMFA: () => Promise<{ data: AuthMFAEnrollResponse['data'] | null; error: Error | null }>;
  verifyMFA: (code: string, factorId: string) => Promise<{ error: Error | null }>;
  unenrollMFA: (factorId: string) => Promise<{ error: Error | null }>;
  checkMFAStatus: () => Promise<MFAStatus>;
  verifyMFAChallenge: (code: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus>({
    isEnabled: false,
    isVerified: false,
    factorId: null,
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer data fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
            checkMFAStatus();
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setMfaStatus({ isEnabled: false, isVerified: false, factorId: null });
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
        checkMFAStatus();
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch role using the prioritized get_user_role function
      // Priority: admin > member > client > guest
      const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: userId });

      if (roleData) {
        setRole(roleData as AppRole);
      }

      // Auto-link client record if email matches (for new clients logging in)
      try {
        await supabase.rpc('link_client_to_user');
      } catch {
        // Ignore errors – client may not exist or already linked
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkMFAStatus = async (): Promise<MFAStatus> => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error('Error checking MFA status:', error);
        return { isEnabled: false, isVerified: false, factorId: null };
      }

      // Check if user has any verified TOTP factors
      const verifiedFactor = data.totp.find(f => f.status === 'verified');
      const isEnabled = !!verifiedFactor;
      
      // Check the current AAL level to see if MFA is verified for this session
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const isVerified = aalData?.currentLevel === 'aal2';

      const status: MFAStatus = {
        isEnabled,
        isVerified: isEnabled ? isVerified : true, // If MFA not enabled, consider it verified
        factorId: verifiedFactor?.id || null,
      };

      setMfaStatus(status);
      return status;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return { isEnabled: false, isVerified: false, factorId: null };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error };
    }

    // After successful sign in, check if MFA is required
    const status = await checkMFAStatus();
    
    if (status.isEnabled && !status.isVerified) {
      return { error: null, requiresMFA: true };
    }

    return { error: null, requiresMFA: false };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/app`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setMfaStatus({ isEnabled: false, isVerified: false, factorId: null });
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }
    }
  };

  // MFA Methods
  const enrollMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Alpha Agent Authenticator',
      });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  };

  const verifyMFA = async (code: string, factorId: string) => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        return { error: challengeError };
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        return { error: verifyError };
      }

      await checkMFAStatus();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const unenrollMFA = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      
      if (error) {
        return { error };
      }

      await checkMFAStatus();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyMFAChallenge = async (code: string) => {
    try {
      // Get the current factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        return { error: factorsError };
      }

      const verifiedFactor = factorsData.totp.find(f => f.status === 'verified');
      
      if (!verifiedFactor) {
        return { error: new Error('No verified MFA factor found') };
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (challengeError) {
        return { error: challengeError };
      }

      // Verify the challenge with the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        return { error: verifyError };
      }

      // Update MFA status
      await checkMFAStatus();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    profile,
    role,
    loading,
    mfaStatus,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
    isAdmin: role === 'admin',
    isMember: role === 'member' || role === 'admin',
    isClient: role === 'client',
    isReferrer: role === 'referrer',
    // MFA methods
    enrollMFA,
    verifyMFA,
    unenrollMFA,
    checkMFAStatus,
    verifyMFAChallenge,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
