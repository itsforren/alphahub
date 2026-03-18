import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OnboardingAction } from '../useOnboardingReducer';

interface Props {
  npn: string;
  dispatch: React.Dispatch<OnboardingAction>;
}

export default function NPNStep({ npn, dispatch }: Props) {
  return (
    <div className="glass-card p-8 max-w-lg w-full mx-auto">
      <h2 className="text-2xl font-semibold text-white">What's your NPN?</h2>
      <p className="text-sm text-white/50 mt-1 mb-6">Your National Producer Number</p>

      <div className="space-y-2">
        <Label className="text-sm text-white/60">NPN</Label>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="12345678"
          value={npn}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            dispatch({ type: 'SET_FIELD', field: 'npn', value });
          }}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
        />
      </div>
    </div>
  );
}
