import { motion } from 'framer-motion';
import { TOTAL_STEPS } from './useOnboardingReducer';

interface Props {
  currentStep: number;
}

export default function OnboardingProgressBar({ currentStep }: Props) {
  // Don't show on welcome step (0) or success step (11)
  if (currentStep === 0 || currentStep === TOTAL_STEPS - 1) return null;

  const progress = ((currentStep) / (TOTAL_STEPS - 2)) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Progress bar */}
      <div className="h-1 bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Step counter */}
      <div className="flex justify-center pt-3">
        <span className="text-xs text-white/30 font-medium tracking-wider uppercase">
          Step {currentStep} of {TOTAL_STEPS - 2}
        </span>
      </div>
    </div>
  );
}
