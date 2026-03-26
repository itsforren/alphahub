import { cn } from '@/lib/utils';
import { Snowflake, Sun, Flame } from 'lucide-react';

interface TemperatureSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
}

const LABELS: Record<number, string> = {
  1: 'Ice Cold',
  5: 'Warming Up',
  10: 'On Fire',
};

function getColor(n: number) {
  if (n <= 3) return { text: 'text-sky-400', bg: 'bg-sky-400', border: 'border-sky-400' };
  if (n <= 6) return { text: 'text-amber-400', bg: 'bg-amber-400', border: 'border-amber-400' };
  return { text: 'text-red-400', bg: 'bg-red-400', border: 'border-red-400' };
}

function getGlowClass(n: number) {
  if (n <= 3) return 'shadow-[0_0_16px_rgba(56,189,248,0.4)]';
  if (n <= 6) return 'shadow-[0_0_16px_rgba(251,191,36,0.4)]';
  return 'shadow-[0_0_16px_rgba(239,68,68,0.4)]';
}

export function TemperatureSelector({ value, onChange }: TemperatureSelectorProps) {
  const numValue = value ? parseInt(value, 10) : 5;
  const color = getColor(numValue);
  const label = LABELS[numValue] || (numValue <= 3 ? 'Cold' : numValue <= 6 ? 'Warm' : 'Hot');

  return (
    <div className="space-y-3">
      {/* Current value display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {numValue <= 3 && <Snowflake className={cn('h-5 w-5', color.text)} />}
          {numValue > 3 && numValue <= 6 && <Sun className={cn('h-5 w-5', color.text)} />}
          {numValue > 6 && <Flame className={cn('h-5 w-5', color.text)} />}
          <span className={cn('text-sm font-bold', color.text)}>{label}</span>
        </div>
        <span className={cn(
          'text-2xl font-black tabular-nums transition-all duration-300',
          color.text,
          value ? getGlowClass(numValue) : '',
          value ? 'rounded-lg px-3 py-0.5' : ''
        )}>
          {value ?? '--'}
        </span>
      </div>

      {/* Slider */}
      <div className="relative">
        {/* Gradient track background */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-to-r from-sky-500 via-amber-400 to-red-500 opacity-30" />

        {/* Filled track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-2 rounded-full bg-gradient-to-r from-sky-500 via-amber-400 to-red-500 transition-all duration-200"
          style={{ width: `${((numValue - 1) / 9) * 100}%` }}
        />

        {/* Native range input with custom styling */}
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={numValue}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'relative w-full h-6 appearance-none bg-transparent cursor-pointer z-10',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200',
            numValue <= 3 && '[&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:border-sky-300 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(56,189,248,0.5)]',
            numValue > 3 && numValue <= 6 && '[&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:border-amber-300 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(251,191,36,0.5)]',
            numValue > 6 && '[&::-webkit-slider-thumb]:bg-red-400 [&::-webkit-slider-thumb]:border-red-300 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(239,68,68,0.5)]',
            '[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:transition-all',
            numValue <= 3 && '[&::-moz-range-thumb]:bg-sky-400 [&::-moz-range-thumb]:border-sky-300',
            numValue > 3 && numValue <= 6 && '[&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:border-amber-300',
            numValue > 6 && '[&::-moz-range-thumb]:bg-red-400 [&::-moz-range-thumb]:border-red-300',
            '[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent'
          )}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[10px] font-semibold text-muted-foreground/60 px-1">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
        <span>6</span>
        <span>7</span>
        <span>8</span>
        <span>9</span>
        <span>10</span>
      </div>
    </div>
  );
}

/** Small inline badge for displaying temperature in lists */
export function TemperatureBadge({ temp }: { temp: string | null }) {
  if (!temp) return null;

  const n = parseInt(temp, 10);

  // Support legacy values
  if (isNaN(n)) {
    const legacyMap: Record<string, { icon: string; class: string; label: string }> = {
      hot: { icon: 'fire', class: 'bg-red-500/10 text-orange-400 border-red-500/40', label: 'Hot' },
      warm: { icon: 'sun', class: 'bg-amber-500/10 text-amber-400 border-amber-500/35', label: 'Warm' },
      cold: { icon: 'snow', class: 'bg-sky-300/8 text-sky-300 border-sky-300/30', label: 'Cold' },
    };
    const legacy = legacyMap[temp];
    if (!legacy) return null;
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border', legacy.class)}>
        {legacy.icon === 'fire' && <Flame className="h-3 w-3" />}
        {legacy.icon === 'sun' && <Sun className="h-3 w-3" />}
        {legacy.icon === 'snow' && <Snowflake className="h-3 w-3" />}
        {legacy.label}
      </span>
    );
  }

  // Numeric 1-10
  const Icon = n <= 3 ? Snowflake : n <= 6 ? Sun : Flame;
  const colorClass = n <= 3
    ? 'bg-sky-300/10 text-sky-300 border-sky-300/30'
    : n <= 6
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/35'
      : 'bg-red-500/10 text-orange-400 border-red-500/40';

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border',
      colorClass,
      n >= 8 && 'animate-pulse'
    )}>
      <Icon className="h-3 w-3" />
      {n}
    </span>
  );
}
