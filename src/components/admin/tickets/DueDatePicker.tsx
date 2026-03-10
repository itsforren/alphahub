import { CalendarDays, X } from 'lucide-react';
import { format, isPast, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DueDatePickerProps {
  date: Date | undefined;
  onChange: (date: Date | undefined) => void;
  className?: string;
}

export function DueDatePicker({ date, onChange, className }: DueDatePickerProps) {
  const isOverdue = date ? isPast(startOfDay(date)) && startOfDay(date) < startOfDay(new Date()) : false;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'justify-start gap-2 font-normal',
              !date && 'text-muted-foreground',
              isOverdue && 'border-red-500/50 text-red-400',
            )}
          >
            <CalendarDays className="w-4 h-4" />
            {date ? format(date, 'MMM d, yyyy') : 'Set due date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {date && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(undefined)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
