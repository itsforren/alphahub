import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { OnboardingAction } from '../useOnboardingReducer';

interface Props {
  bio: string;
  dispatch: React.Dispatch<OnboardingAction>;
}

const MAX_CHARS = 500;

export default function BioStep({ bio, dispatch }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, MAX_CHARS);
    dispatch({ type: 'SET_FIELD', field: 'bio', value });
  };

  return (
    <div className="glass-card p-8 max-w-lg w-full mx-auto">
      <h2 className="text-2xl font-semibold text-white">Tell us about yourself</h2>
      <p className="text-sm text-white/50 mt-1 mb-6">This will be used on your TFWP profile page</p>

      <div className="space-y-2">
        <Label className="text-sm text-white/60">Bio</Label>
        <div className="relative">
          <Textarea
            placeholder="Share a bit about your experience, specialties, and what drives you..."
            value={bio}
            onChange={handleChange}
            rows={5}
            maxLength={MAX_CHARS}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20 resize-none"
          />
          <span className="absolute bottom-2 right-3 text-xs text-white/30">
            {bio.length} / {MAX_CHARS}
          </span>
        </div>
        <p className="text-xs text-white/30">Leave blank and we'll create one for you</p>
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: 'NEXT_STEP' })}
        className="mt-4 text-sm text-white/40 hover:text-white/60 underline underline-offset-2 transition-colors"
      >
        Skip
      </button>
    </div>
  );
}
