import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Maximize2, Target, Gauge, Award, Shield, Bell, Megaphone, Brain, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const CEOBoard = lazy(() => import('@/pages/hub/tv/CEOBoard'));
const InternalSales = lazy(() => import('@/pages/hub/tv/InternalSales'));
const EngineRoom = lazy(() => import('@/pages/hub/tv/EngineRoom'));
const AIAutopilot = lazy(() => import('@/pages/hub/tv/AIAutopilot'));
const ClientSuccess = lazy(() => import('@/pages/hub/tv/ClientSuccess'));
const AgentLeaderboards = lazy(() => import('@/pages/hub/tv/AgentLeaderboards'));
const Watchtower = lazy(() => import('@/pages/hub/tv/Watchtower'));
const AlertCenter = lazy(() => import('@/pages/hub/tv/AlertCenter'));

type ScreenKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

const SCREENS: Record<ScreenKey, { title: string; subtitle: string; icon: typeof Target }> = {
  '1': { title: 'CEO Board', subtitle: 'Financials Only', icon: Target },
  '2': { title: 'Internal Sales', subtitle: 'Agent Acquisition', icon: Megaphone },
  '3': { title: 'Engine Room', subtitle: 'Client Marketing Ops', icon: Gauge },
  '4': { title: 'AI Autopilot', subtitle: 'The Brain', icon: Brain },
  '5': { title: 'Client Success', subtitle: 'Outcomes Only', icon: Award },
  '6': { title: 'Leaderboards', subtitle: 'Agent Rankings', icon: Trophy },
  '7': { title: 'Watchtower', subtitle: 'Ops & Support', icon: Shield },
  '8': { title: 'Alert Center', subtitle: 'Error Feed', icon: Bell },
};

const LoadingFallback = () => (
  <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-background">
    <Loader2 className="w-12 h-12 animate-spin text-primary" />
  </div>
);

export default function TVAnalytics() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('1');

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      else if (['1','2','3','4','5','6','7','8'].includes(e.key)) setActiveScreen(e.key as ScreenKey);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={cn("min-h-screen bg-background", isFullscreen && "p-0")}>
      <div className={cn(
        "flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50",
        isFullscreen && "absolute top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm"
      )}>
        <div className="flex items-center gap-1">
          {(Object.keys(SCREENS) as ScreenKey[]).map((key) => {
            const ScreenIcon = SCREENS[key].icon;
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveScreen(key)}
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                      activeScreen === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <ScreenIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{SCREENS[key].title} ({key})</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-9 w-9">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <motion.div
        key={activeScreen}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(isFullscreen && "pt-16")}
      >
        <Suspense fallback={<LoadingFallback />}>
          {activeScreen === '1' && <CEOBoard />}
          {activeScreen === '2' && <InternalSales />}
          {activeScreen === '3' && <EngineRoom />}
          {activeScreen === '4' && <AIAutopilot />}
          {activeScreen === '5' && <ClientSuccess />}
          {activeScreen === '6' && <AgentLeaderboards />}
          {activeScreen === '7' && <Watchtower />}
          {activeScreen === '8' && <AlertCenter />}
        </Suspense>
      </motion.div>
    </div>
  );
}
