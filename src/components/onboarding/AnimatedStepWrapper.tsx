import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface Props {
  stepKey: number;
  direction: 1 | -1;
  children: ReactNode;
}

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 200 : -200,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 200 : -200,
    opacity: 0,
    scale: 0.97,
  }),
};

export default function AnimatedStepWrapper({ stepKey, direction, children }: Props) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={`step-${stepKey}`}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
