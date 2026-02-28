import React from 'react';
import { Shield, Check, AlertTriangle } from 'lucide-react';
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
  icon,
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
    danger: 'border-destructive/30 bg-destructive/5',
  };

  const iconBgStyles = {
    default: 'bg-muted text-muted-foreground',
    warning: 'bg-alert/15 text-alert',
    danger: 'bg-destructive/15 text-destructive',
  };

  return (
    <div
      className={`border rounded-xl p-5 transition-all font-montserrat ${
        isComplete ? 'border-success/30 bg-success/5' : variantStyles[variant]
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isComplete ? 'bg-success/15 text-success' : iconBgStyles[variant]
          }`}
        >
          {isComplete ? <Check className="h-5 w-5" /> : (icon || <Shield className="h-5 w-5" />)}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground font-montserrat">{title}</h3>
            {showRequired && !isComplete && (
              <Badge variant="outline" className="text-xs border-destructive/30 text-destructive font-montserrat">
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
                className={`whitespace-nowrap text-sm font-montserrat ${showRequired && !isComplete ? 'text-destructive' : ''}`}
              >
                Your Initials{showRequired ? <span className="text-destructive"> *</span> : null}
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
                    <Badge className="bg-success/15 text-success border-0 font-montserrat">
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
