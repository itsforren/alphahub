import { motion, AnimatePresence } from "framer-motion";
import { Calendar, UserPlus, TrendingUp, Clock } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useIsMobile } from "@/hooks/use-mobile";

// Calculate time until next Sunday midnight (end of week)
const getTimeUntilWeekEnd = () => {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7; // Days until next Sunday
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(23, 59, 59, 999);
  return nextSunday.getTime() - now.getTime();
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  return `${hours}h ${minutes}m ${seconds}s`;
};

// Seeded random number generator for consistency across users
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
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

const getIntervalSeed = () => Math.floor(Date.now() / 90000); // Every 90 seconds - slower updates

const FIRST_NAMES_MALE = [
  "James", "Michael", "Robert", "David", "William", "Richard", "Joseph", "Thomas", "Christopher", "Charles",
  "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth",
  "Kevin", "Brian", "George", "Timothy", "Ronald", "Edward", "Jason", "Jeffrey", "Ryan", "Jacob"
];

const FIRST_NAMES_FEMALE = [
  "Mary", "Patricia", "Jennifer", "Linda", "Barbara", "Elizabeth", "Susan", "Jessica", "Sarah", "Karen",
  "Lisa", "Nancy", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"
];

const STATES = ["TX", "FL", "CA", "AZ", "GA", "NC", "OH", "MI", "PA", "IL", "TN", "VA", "NV", "CO", "SC"];

const STATE_NAMES: Record<string, string> = {
  "TX": "Texas", "FL": "Florida", "CA": "California", "AZ": "Arizona", "GA": "Georgia",
  "NC": "North Carolina", "OH": "Ohio", "MI": "Michigan", "PA": "Pennsylvania", "IL": "Illinois",
  "TN": "Tennessee", "VA": "Virginia", "NV": "Nevada", "CO": "Colorado", "SC": "South Carolina"
};

const MONTHLY_COMMISSIONS = ["$5K-15K", "$15K-30K", "$30K-50K", "$50K-100K", "$100K+"];

const generateNotificationFromSeed = (seed: number, isBooking: boolean, linkedName?: string, linkedStates?: string[]) => {
  const rng = new SeededRandom(seed);
  const isMale = rng.next() > 0.5;
  const firstNames = isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE;
  const firstName = rng.pick(firstNames);
  const lastName = rng.pick(LAST_NAMES);
  const name = linkedName || `${firstName} ${lastName.charAt(0)}.`;

  const numStates = rng.nextInt(1, 3);
  const states: string[] = linkedStates || [];
  if (!linkedStates) {
    const availableStates = [...STATES];
    for (let i = 0; i < numStates; i++) {
      const idx = rng.nextInt(0, availableStates.length - 1);
      states.push(availableStates.splice(idx, 1)[0]);
    }
  }

  if (isBooking) {
    const daysAhead = rng.nextInt(1, 14);
    const hours = rng.nextInt(9, 17);
    const minutes = [0, 15, 30, 45][rng.nextInt(0, 3)];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(hours, minutes, 0, 0);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateStr = futureDate.toLocaleDateString('en-US', options);
    const timeStr = futureDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return { id: seed, type: 'booking' as const, name, states, bookingDate: `${dateStr} at ${timeStr}` };
  }

  const hasDownline = rng.next() > 0.6;
  const downlineCount = hasDownline ? rng.nextInt(2, 26) : undefined;
  const monthlyCommission = rng.pick(MONTHLY_COMMISSIONS);
  return { id: seed, type: 'application' as const, name, states, downlineCount, monthlyCommission };
};

const LiveNotifications = () => {
  const { notifications, counts, addNotification } = useNotifications();
  const isMobile = useIsMobile();
  const lastIntervalRef = useRef(getIntervalSeed());
  const pendingBookingRef = useRef<{ name: string; states: string[]; showAt: number } | null>(null);
  const [isGlowing, setIsGlowing] = useState(false);
  const prevCountRef = useRef(counts.applications + counts.booked);
  const [countdown, setCountdown] = useState(getTimeUntilWeekEnd());

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getTimeUntilWeekEnd());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Trigger glow effect when counts change
  useEffect(() => {
    const currentCount = counts.applications + counts.booked;
    if (currentCount > prevCountRef.current) {
      setIsGlowing(true);
      const timer = setTimeout(() => setIsGlowing(false), 1500);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = currentCount;
  }, [counts]);

  // Fake notification generator
  useEffect(() => {
    const checkForUpdates = () => {
      const currentInterval = getIntervalSeed();
      const now = Date.now();

      if (pendingBookingRef.current && now >= pendingBookingRef.current.showAt) {
        const { name, states } = pendingBookingRef.current;
        const bookingNotif = generateNotificationFromSeed(now, true, name, states);
        addNotification(bookingNotif, 'booking');
        pendingBookingRef.current = null;
        return;
      }

      if (currentInterval !== lastIntervalRef.current) {
        lastIntervalRef.current = currentInterval;
        const rng = new SeededRandom(currentInterval);
        if (rng.next() < 0.4) { // 40% chance instead of 50% - even slower
          const appNotif = generateNotificationFromSeed(currentInterval, false);
          addNotification(appNotif, 'application');
          if (rng.next() < 0.7) { // 70% chance of follow-up booking
            const bookingDelay = 25000 + (rng.next() * 10000);
            pendingBookingRef.current = { name: appNotif.name, states: appNotif.states, showAt: now + bookingDelay };
          }
        }
      }
    };

    const interval = setInterval(checkForUpdates, 1000);
    return () => clearInterval(interval);
  }, [addNotification]);

  // Mobile compact view
  if (isMobile) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        {/* Notifications float above widget - absolute positioned */}
        <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1.5 w-52">
          <AnimatePresence mode="popLayout">
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -30, y: 20 }}
                animate={{ opacity: 1 - (index * 0.2), x: 0, y: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <div className="backdrop-blur-xl border border-white/5 rounded-lg px-2.5 py-2 overflow-hidden relative" style={{ background: 'transparent' }}>
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${notification.type === 'application' ? 'bg-primary/60' : 'bg-blue-500/60'}`} />
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notification.type === 'application' ? 'bg-primary/10' : 'bg-blue-500/10'
                    }`}>
                      {notification.type === 'application' ? (
                        <UserPlus className="w-3 h-3 text-primary" />
                      ) : (
                        <Calendar className="w-3 h-3 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{notification.name}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={notification.type === 'application' ? 'text-primary' : 'text-blue-500'}>
                          {notification.type === 'application' ? 'Applied' : 'Booked'}
                        </span>
                        <span>•</span>
                        <span className="truncate">{notification.states.join(", ")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Stationary Widget - 100% transparent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="backdrop-blur-xl border border-white/5 rounded-lg px-2.5 py-2"
          style={{ background: 'transparent' }}
        >
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingUp className="w-3 h-3 text-primary/80" />
            <span className="text-[9px] font-semibold text-muted-foreground/80 tracking-wide">LAST HOUR</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-foreground/90">{counts.applications}</span>
              <span className="text-[9px] text-muted-foreground/70">Apps</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-foreground/90">{counts.booked}</span>
              <span className="text-[9px] text-muted-foreground/70">Calls</span>
            </div>
          </div>
          
          {/* Spots Left + Countdown */}
          <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-white/5">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground/70">Spots:</span>
              <span className="text-sm font-black text-red-500 animate-pulse" style={{ textShadow: '0 0 10px rgba(239,68,68,0.6)' }}>8</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-red-400/70" />
              <span className="text-[8px] text-red-400/80 font-medium">{formatCountdown(countdown)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-1 mt-1 pt-1 border-t border-white/5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            <span className="text-[10px] text-muted-foreground/70">Live</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Desktop larger view
  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Notifications float above widget - absolute positioned */}
      <div className="absolute bottom-full left-0 mb-3 flex flex-col gap-2 w-80">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -40, y: 20 }}
              animate={{ opacity: 1 - (index * 0.15), x: 0, y: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div 
                className="backdrop-blur-xl border border-white/5 rounded-xl px-4 py-3 overflow-hidden relative"
                style={{ background: 'transparent' }}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 ${notification.type === 'application' ? 'bg-primary/60' : 'bg-blue-500/60'}`} />
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.type === 'application' ? 'bg-primary/10' : 'bg-blue-500/10'
                  }`}>
                    {notification.type === 'application' ? (
                      <UserPlus className="w-5 h-5 text-primary" />
                    ) : (
                      <Calendar className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground/90">{notification.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                      <span className={`font-medium ${notification.type === 'application' ? 'text-primary' : 'text-blue-500'}`}>
                        {notification.type === 'application' ? 'Applied' : 'Booked a call'}
                      </span>
                      <span>•</span>
                      <span>{notification.states.join(", ")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Stationary Widget - 100% transparent */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.4 }}
        className="backdrop-blur-xl border border-white/5 rounded-xl px-4 py-3"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-primary/80" />
          <span className="text-[10px] font-semibold text-muted-foreground/80 tracking-wider">LAST HOUR</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-foreground/90">{counts.applications}</span>
            <span className="text-xs text-muted-foreground/70">Applications</span>
          </div>
          <div className="w-px h-9 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-foreground/90">{counts.booked}</span>
            <span className="text-xs text-muted-foreground/70">Calls Booked</span>
          </div>
        </div>
        
        {/* Spots Left + Countdown */}
        <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/70">Spots Left:</span>
            <span className="text-lg font-black text-red-500 animate-pulse" style={{ textShadow: '0 0 15px rgba(239,68,68,0.6)' }}>8</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-red-400/70" />
            <span className="text-[10px] text-red-400/80 font-medium">{formatCountdown(countdown)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-white/5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
          </span>
          <span className="text-xs text-muted-foreground/70">Live</span>
        </div>
      </motion.div>
    </div>
  );
};

export default LiveNotifications;
