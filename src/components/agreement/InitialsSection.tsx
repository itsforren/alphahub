import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { InitialsSectionData } from '@/hooks/useAuditLog';
import { format } from 'date-fns';

interface InitialsSectionProps {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  value: InitialsSectionData | undefined;
  typingValue?: string;
  expectedInitials?: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
  onInitialsChange: (id: string, value: string) => void;
  variant?: 'default' | 'warning' | 'danger';
}

export function InitialsSection({
  id,
  title,
  description,
  value,
  typingValue = '',
  expectedInitials,
  error,
  required = false,
  maxLength = 3,
  onInitialsChange,
  variant = 'default',
}: InitialsSectionProps) {
  const isComplete = value && value.initials.length >= 2;
  const showRequired = required || variant === 'danger';

  const variantStyles = {
    default: 'border-border bg-muted/30',
    warning: 'border-alert/30 bg-alert/5',
    danger: 'border-blue-500/20 bg-blue-500/5',
  };

  return (
    <div
      className={`border rounded-xl p-5 transition-all font-montserrat ${
        isComplete ? 'border-emerald-500/30 bg-emerald-500/5' : variantStyles[variant]
      }`}
    >
      <div className="flex items-start gap-4">
        <Checkbox
          checked={isComplete || false}
          className="mt-1 h-5 w-5 pointer-events-none"
        />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground font-montserrat">{title}</h3>
            {showRequired && !isComplete && (
              <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-500 font-montserrat">
                <AlertTriangle className="h-3 w-3 mr-1" /> Required
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4 italic leading-relaxed font-montserrat">
            "{description}"
          </p>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              <Label
                htmlFor={`initials-${id}`}
                className={`whitespace-nowrap text-sm font-montserrat ${showRequired && !isComplete ? 'text-blue-500' : ''}`}
              >
                Your Initials{showRequired ? <span className="text-blue-500"> *</span> : null}
                {expectedInitials ? (
                  <span className="text-muted-foreground"> (Expected: {expectedInitials})</span>
                ) : null}
              </Label>

              <div className="mt-2 flex items-center gap-3">
                <Input
                  id={`initials-${id}`}
                  value={isComplete ? value?.initials : typingValue}
                  onChange={(e) => onInitialsChange(id, e.target.value)}
                  placeholder={expectedInitials || 'ABC'}
                  className={`w-24 text-center font-bold uppercase text-lg font-montserrat ${
                    !isComplete && error ? 'border-destructive focus-visible:ring-destructive' : ''
                  }`}
                  maxLength={maxLength}
                  disabled={isComplete}
                />

                {isComplete && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-0 font-montserrat">
                      <Check className="h-3 w-3 mr-1" /> Done
                    </Badge>
                    <span className="text-xs text-muted-foreground font-montserrat">
                      at {format(new Date(value.timestamp), 'h:mm:ss a')}
                    </span>
                  </div>
                )}
              </div>

              {!isComplete && error && (
                <p className="mt-2 text-xs text-destructive font-montserrat">{error}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
