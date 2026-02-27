import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditableFieldProps {
  value: string | number | null | undefined;
  fieldKey: string;
  onSave: (key: string, value: string) => Promise<void>;
  type?: 'text' | 'number' | 'currency' | 'percent' | 'date';
  label?: string;
  className?: string;
  displayValue?: string;
  disabled?: boolean;
}

export default function EditableField({
  value,
  fieldKey,
  onSave,
  type = 'text',
  label,
  className,
  displayValue,
  disabled = false,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(String(value ?? ''));
  }, [value]);

  const handleSave = async () => {
    if (editValue === String(value ?? '')) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(fieldKey, editValue);
      setIsEditing(false);
    } catch (error) {
      // Error is handled in the mutation
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(String(value ?? ''));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const getInputType = () => {
    switch (type) {
      case 'number':
      case 'currency':
      case 'percent':
        return 'text'; // Use text for better formatting control
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  };

  if (disabled) {
    return (
      <span className={cn('font-semibold text-foreground', className)}>
        {displayValue ?? value ?? '—'}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={getInputType()}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-32 text-sm"
          disabled={isSaving}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3 text-emerald-500" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'group flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors cursor-pointer',
        className
      )}
    >
      <span>{displayValue ?? value ?? '—'}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}
