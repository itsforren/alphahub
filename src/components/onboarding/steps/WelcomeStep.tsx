import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { OnboardingAction } from '../useOnboardingReducer';

interface Props {
  dispatch: React.Dispatch<OnboardingAction>;
}

export default function WelcomeStep({ dispatch }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-8"
      >
        <span className="text-4xl tracking-tight">
          <span className="font-bold text-white">ALPHA</span>
          <span className="font-light text-white/60">AGENT</span>
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        className="text-4xl md:text-5xl font-semibold text-white mb-4"
      >
        Let's get you set up
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        className="text-lg text-white/50 max-w-md mb-12"
      >
        Your journey to growing your insurance business starts here
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
      >
        <Button
          size="lg"
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          className="relative px-8 py-6 text-lg font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all duration-300"
        >
          Get Started
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
}
