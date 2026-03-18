import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { US_STATES } from '../useOnboardingReducer';
import type { OnboardingAction } from '../useOnboardingReducer';

interface Props {
  licensedStates: string[];
  dispatch: React.Dispatch<OnboardingAction>;
}

export default function StatesLicensedStep({ licensedStates, dispatch }: Props) {
  const toggleState = (code: string) => {
    const updated = licensedStates.includes(code)
      ? licensedStates.filter((s) => s !== code)
      : [...licensedStates, code];
    dispatch({ type: 'SET_LICENSED_STATES', states: updated });
  };

  const selectAll = () => {
    dispatch({ type: 'SET_LICENSED_STATES', states: US_STATES.map((s) => s.code) });
  };

  const clearAll = () => {
    dispatch({ type: 'SET_LICENSED_STATES', states: [] });
  };

  return (
    <div className="glass-card p-8 max-w-lg w-full mx-auto">
      <h2 className="text-2xl font-semibold text-white">Which states are you licensed in?</h2>
      <p className="text-sm text-white/50 mt-1 mb-4">Select all that apply</p>

      <div className="flex items-center gap-2 mb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={selectAll}
          className="text-xs text-blue-400 hover:text-blue-300 hover:bg-white/5"
        >
          Select All
        </Button>
        <span className="text-white/20">|</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-xs text-white/40 hover:text-white/60 hover:bg-white/5"
        >
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-1.5">
        {US_STATES.map((state) => {
          const isSelected = licensedStates.includes(state.code);
          return (
            <motion.button
              key={state.code}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => toggleState(state.code)}
              title={state.name}
              className={`
                px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border
                ${
                  isSelected
                    ? 'bg-blue-500/30 border-blue-500/50 text-blue-200 shadow-[0_0_8px_rgba(59,130,246,0.25)]'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
                }
              `}
            >
              {state.code}
            </motion.button>
          );
        })}
      </div>

      <p className="text-sm text-white/40 mt-4 text-center">
        {licensedStates.length === 0
          ? 'No states selected'
          : `${licensedStates.length} state${licensedStates.length === 1 ? '' : 's'} selected`}
      </p>
    </div>
  );
}
