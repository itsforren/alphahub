import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationData {
  id: number;
  type: 'application' | 'booking';
  name: string;
  states: string[];
  downlineCount?: number;
  monthlyCommission?: string;
  bookingDate?: string;
  isReal?: boolean;
}

interface NotificationContextType {
  notifications: NotificationData[];
  counts: { applications: number; booked: number };
  addNotification: (notif: NotificationData, type: 'application' | 'booking') => void;
  addRealSubmission: (name: string, states: string[], downlineCount?: number, monthlyCommission?: string) => void;
  incrementCount: (type: 'application' | 'booking') => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Seeded random for consistent counts across users
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// Get seed based on current 1-hour window (consistent across all users)
const getHourlySeed = () => {
  const now = Date.now();
  return Math.floor(now / (60 * 60 * 1000)); // Changes every hour
};

const getBaseCountsForLastHour = () => {
  const seed = getHourlySeed();
  const rng = new SeededRandom(seed);
  // Base activity in the last hour: 2-5 applications
  const applications = rng.nextInt(2, 5);
  const bookingRate = 0.6 + (rng.next() * 0.2);
  const booked = Math.max(1, Math.floor(applications * bookingRate));
  return { applications, booked };
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const baseCountsRef = useRef(getBaseCountsForLastHour());
  const addedCountsRef = useRef({ applications: 0, booked: 0 });
  const lastWindowRef = useRef(getHourlySeed());
  const [counts, setCounts] = useState(() => getBaseCountsForLastHour());
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSoundTimeRef = useRef(0);
  const isSoundPlayingRef = useRef(false);

  // Subscribe to realtime updates for synced counts
  useEffect(() => {
    const channel = supabase
      .channel('notification-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_stats'
        },
        () => {
          // When stats update, sync counts across all clients
          const baseCounts = getBaseCountsForLastHour();
          setCounts({
            applications: baseCounts.applications + addedCountsRef.current.applications,
            booked: baseCounts.booked + addedCountsRef.current.booked,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Reset counts when the 1-hour window changes
  useEffect(() => {
    const checkWindow = setInterval(() => {
      const currentWindow = getHourlySeed();
      if (currentWindow !== lastWindowRef.current) {
        lastWindowRef.current = currentWindow;
        baseCountsRef.current = getBaseCountsForLastHour();
        addedCountsRef.current = { applications: 0, booked: 0 };
        setCounts(getBaseCountsForLastHour());
      }
    }, 60000); // Check every minute
    return () => clearInterval(checkWindow);
  }, []);

  const playSound = useCallback((type: 'application' | 'booking') => {
    const now = Date.now();
    if (now - lastSoundTimeRef.current < 3000 || isSoundPlayingRef.current) return;
    lastSoundTimeRef.current = now;
    isSoundPlayingRef.current = true;
    setTimeout(() => { isSoundPlayingRef.current = false; }, 600);

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      const playNote = (freq: number, startTime: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, startTime);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const t = ctx.currentTime;
      if (type === 'booking') {
        // Money cha-ching sound
        playNote(1318.51, t, 0.08, 0.06);
        playNote(1567.98, t + 0.05, 0.08, 0.05);
        playNote(2093.00, t + 0.1, 0.25, 0.07);
        playNote(2637.02, t + 0.12, 0.3, 0.04);
      } else {
        // Soft chime
        playNote(523.25, t, 0.35, 0.06);
        playNote(659.25, t + 0.06, 0.3, 0.05);
        playNote(783.99, t + 0.12, 0.25, 0.03);
      }
    } catch (e) {
      isSoundPlayingRef.current = false;
    }
  }, []);

  const incrementCount = useCallback((type: 'application' | 'booking') => {
    if (type === 'application') {
      addedCountsRef.current.applications += 1;
    } else {
      addedCountsRef.current.booked += 1;
    }
    setCounts({
      applications: baseCountsRef.current.applications + addedCountsRef.current.applications,
      booked: baseCountsRef.current.booked + addedCountsRef.current.booked,
    });
  }, []);

  const addNotification = useCallback((notif: NotificationData, type: 'application' | 'booking') => {
    setNotifications(prev => [notif, ...prev].slice(0, 3));
    playSound(type);
    incrementCount(type);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 6000);
  }, [playSound, incrementCount]);

  const addRealSubmission = useCallback((name: string, states: string[], downlineCount?: number, monthlyCommission?: string) => {
    const notif: NotificationData = {
      id: Date.now(),
      type: 'application',
      name,
      states,
      downlineCount,
      monthlyCommission,
      isReal: true,
    };
    addNotification(notif, 'application');
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, counts, addNotification, addRealSubmission, incrementCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
