import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Clock, CheckCircle, AlertTriangle, Loader2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
];

function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.some((t) => t.value === tz)) return tz;
  } catch {}
  return 'America/New_York';
}

interface SlotPickerProps {
  agentId: string;
  calendarType: 'discovery' | 'strategy' | 'callback';
  calendarId?: string;  // Pass directly to skip search — used for per-user callback calendars
  onSlotSelected: (slot: string, calendarId: string) => void;
  onCancel: () => void;
  title?: string;
}

interface DaySlots {
  date: string;
  slots: string[];
}

export function SlotPicker({ agentId, calendarType, calendarId: directCalendarId, onSlotSelected, onCancel, title }: SlotPickerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slotsByDate, setSlotsByDate] = useState<DaySlots[]>([]);
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [calendarName, setCalendarName] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [timezone, setTimezone] = useState(detectTimezone);

  useEffect(() => {
    fetchSlots();
  }, [agentId, calendarType, timezone]);

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + weekOffset * 7);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 14);

      // Call edge function directly to avoid Supabase client JWT issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/get-calendar-slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          agent_id: agentId,
          calendar_type: calendarType,
          calendar_id: directCalendarId || undefined,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          timezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data?.error) throw new Error(data.error);

      setCalendarId(data.calendar_id);
      setCalendarName(data.calendar_name || '');
      setSlotsByDate(data.slots_by_date || []);

      // Auto-select first date with slots
      if (data.slots_by_date?.length > 0 && !selectedDate) {
        setSelectedDate(data.slots_by_date[0].date);
      }
    } catch (err: any) {
      console.error('Failed to fetch slots:', err);
      setError(err.message || 'Failed to load calendar slots');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedSlot && calendarId) {
      onSlotSelected(selectedSlot, calendarId);
    }
  };

  // Get slots for selected date
  const currentDaySlots = slotsByDate.find((d) => d.date === selectedDate)?.slots || [];

  // Format date for display
  const formatDateTab = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  };

  // Format time slot in selected timezone
  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone });
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading available times...
          </div>
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-400" />
          <p className="text-sm text-red-400 font-medium">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={fetchSlots}>Try Again</Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>Skip</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (slotsByDate.length === 0) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-6 text-center space-y-3">
          <Clock className="h-8 w-8 mx-auto text-amber-400" />
          <p className="text-sm text-amber-400 font-medium">No available slots in the next 2 weeks</p>
          <Button variant="ghost" size="sm" onClick={onCancel}>Skip for now</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {title || (calendarType === 'strategy' ? 'Book Strategy Call' : 'Schedule Discovery Call')}
            </h3>
            {calendarName && (
              <p className="text-xs text-muted-foreground mt-0.5">{calendarName}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onCancel}>
            Skip
          </Button>
        </div>

        {/* Timezone selector */}
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Select value={timezone} onValueChange={(tz) => { setTimezone(tz); setSelectedSlot(null); }}>
            <SelectTrigger className="h-8 text-xs bg-background/50 border-border/50 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value} className="text-xs">
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date tabs */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex gap-1.5 overflow-x-auto flex-1 py-1">
            {slotsByDate.map((day) => {
              const { day: weekday, date: dayNum, month } = formatDateTab(day.date);
              const isSelected = selectedDate === day.date;
              return (
                <button
                  key={day.date}
                  onClick={() => { setSelectedDate(day.date); setSelectedSlot(null); }}
                  className={cn(
                    'flex flex-col items-center min-w-[52px] py-2 px-2 rounded-lg border transition-all text-xs',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background/50 text-muted-foreground hover:border-primary/30'
                  )}
                >
                  <span className="font-medium">{weekday}</span>
                  <span className="text-lg font-bold leading-tight">{dayNum}</span>
                  <span className="text-[10px]">{month}</span>
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setWeekOffset(weekOffset + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
            {currentDaySlots.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    'py-2.5 px-2 rounded-lg border text-sm font-semibold transition-all',
                    isSelected
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  {formatTime(slot)}
                </button>
              );
            })}
          </div>
        )}

        {/* Confirm button */}
        {selectedSlot && (
          <Button
            onClick={handleConfirm}
            className="w-full h-11 font-bold bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 shadow-lg"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirm {formatTime(selectedSlot)} on{' '}
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
