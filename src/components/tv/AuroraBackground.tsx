import { memo, ReactNode } from 'react';

interface AuroraBackgroundProps {
  children: ReactNode;
}

export const AuroraBackground = memo(function AuroraBackground({ 
  children 
}: AuroraBackgroundProps) {
  return (
    <div className="liquid-glass-bg relative min-h-screen">
      <div className="aurora-container">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
});

export default AuroraBackground;
