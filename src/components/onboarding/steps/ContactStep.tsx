import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OnboardingAction } from '../useOnboardingReducer';

interface Props {
  email: string;
  phone: string;
  dispatch: React.Dispatch<OnboardingAction>;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ContactStep({ email, phone, dispatch }: Props) {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    dispatch({ type: 'SET_FIELD', field: 'phone', value: formatted });
  };

  return (
    <div className="glass-card p-8 max-w-lg w-full mx-auto">
      <h2 className="text-2xl font-semibold text-white">How can we reach you?</h2>
      <p className="text-sm text-white/50 mt-1 mb-6">Your email will be used for login and notifications</p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-white/60">Email</Label>
          <Input
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value })}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
            required
          />
          {email.length > 0 && !isValidEmail(email) && (
            <p className="text-xs text-red-400">Please enter a valid email address</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-white/60">Phone</Label>
          <Input
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={handlePhoneChange}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
            required
          />
        </div>
      </div>
    </div>
  );
}
