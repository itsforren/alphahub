import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OnboardingAction } from '../useOnboardingReducer';

interface Props {
  firstName: string;
  lastName: string;
  dispatch: React.Dispatch<OnboardingAction>;
}

export default function NameStep({ firstName, lastName, dispatch }: Props) {
  const firstNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstNameRef.current?.focus();
  }, []);

  return (
    <div className="glass-card p-8 max-w-lg w-full mx-auto">
      <h2 className="text-2xl font-semibold text-white">What's your name?</h2>
      <p className="text-sm text-white/50 mt-1 mb-6">We'll use this across your profile and communications</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm text-white/60">First Name</Label>
          <Input
            ref={firstNameRef}
            type="text"
            placeholder="John"
            value={firstName}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'firstName', value: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
            minLength={2}
            required
          />
          {firstName.length > 0 && firstName.length < 2 && (
            <p className="text-xs text-red-400">Must be at least 2 characters</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-white/60">Last Name</Label>
          <Input
            type="text"
            placeholder="Smith"
            value={lastName}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'lastName', value: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
            minLength={2}
            required
          />
          {lastName.length > 0 && lastName.length < 2 && (
            <p className="text-xs text-red-400">Must be at least 2 characters</p>
          )}
        </div>
      </div>
    </div>
  );
}
