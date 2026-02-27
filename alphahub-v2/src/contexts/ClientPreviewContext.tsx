import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ClientPreviewContextType {
  viewAsClientId: string | null;
  setViewAsClientId: (clientId: string | null) => void;
  isPreviewMode: boolean;
  exitPreviewMode: () => void;
  enterPreviewMode: (clientId: string) => void;
}

const ClientPreviewContext = createContext<ClientPreviewContextType | undefined>(undefined);

export function ClientPreviewProvider({ children }: { children: ReactNode }) {
  const [viewAsClientId, setViewAsClientIdState] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize from URL params
  useEffect(() => {
    const viewAs = searchParams.get('viewAs');
    if (viewAs && isAdmin) {
      setViewAsClientIdState(viewAs);
    } else if (!isAdmin && viewAs) {
      // Remove viewAs param if user is not admin
      searchParams.delete('viewAs');
      setSearchParams(searchParams);
    }
  }, [searchParams, isAdmin, setSearchParams]);

  const setViewAsClientId = (clientId: string | null) => {
    setViewAsClientIdState(clientId);
    
    if (clientId) {
      searchParams.set('viewAs', clientId);
    } else {
      searchParams.delete('viewAs');
    }
    setSearchParams(searchParams);
  };

  const enterPreviewMode = (clientId: string) => {
    if (!isAdmin) return;
    
    // Navigate to hub dashboard with viewAs parameter
    navigate(`/hub?viewAs=${clientId}`);
  };

  const exitPreviewMode = () => {
    setViewAsClientIdState(null);
    searchParams.delete('viewAs');
    setSearchParams(searchParams);
    
    // Navigate back to admin clients list
    navigate('/hub/admin/clients');
  };

  const isPreviewMode = isAdmin && !!viewAsClientId;

  return (
    <ClientPreviewContext.Provider
      value={{
        viewAsClientId,
        setViewAsClientId,
        isPreviewMode,
        exitPreviewMode,
        enterPreviewMode,
      }}
    >
      {children}
    </ClientPreviewContext.Provider>
  );
}

export function useClientPreview() {
  const context = useContext(ClientPreviewContext);
  if (context === undefined) {
    throw new Error('useClientPreview must be used within a ClientPreviewProvider');
  }
  return context;
}
