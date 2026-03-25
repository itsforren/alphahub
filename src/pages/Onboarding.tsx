import { useReducer, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

import OnboardingBackground from '@/components/onboarding/OnboardingBackground';
import OnboardingProgressBar from '@/components/onboarding/OnboardingProgressBar';
import AnimatedStepWrapper from '@/components/onboarding/AnimatedStepWrapper';
import {
  onboardingReducer,
  initialState,
  TOTAL_STEPS,
  type OnboardingAction,
} from '@/components/onboarding/useOnboardingReducer';

// Steps
import WelcomeStep from '@/components/onboarding/steps/WelcomeStep';
import NameStep from '@/components/onboarding/steps/NameStep';
import ContactStep from '@/components/onboarding/steps/ContactStep';
import StatesLicensedStep from '@/components/onboarding/steps/StatesLicensedStep';
import AddressStep from '@/components/onboarding/steps/AddressStep';
import HeadshotStep from '@/components/onboarding/steps/HeadshotStep';
import NPNStep from '@/components/onboarding/steps/NPNStep';
import BioStep from '@/components/onboarding/steps/BioStep';
import CreateAccountStep from '@/components/onboarding/steps/CreateAccountStep';
import AgreementStep from '@/components/onboarding/steps/AgreementStep';
import PaymentStep from '@/components/onboarding/steps/PaymentStep';
import SuccessStep from '@/components/onboarding/steps/SuccessStep';

function canAdvance(state: typeof initialState): boolean {
  switch (state.currentStep) {
    case 0: return true; // Welcome — always
    case 1: return state.firstName.trim().length >= 2 && state.lastName.trim().length >= 2;
    case 2: return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email) && state.phone.replace(/\D/g, '').length >= 10;
    case 3: return state.licensedStates.length > 0;
    case 4: return state.address.street.trim().length > 0 && state.address.city.trim().length > 0 && state.address.state.length > 0 && state.address.zip.trim().length > 0;
    case 5: return true; // Headshot optional for advancing
    case 6: return state.npn.trim().length > 0;
    case 7: return true; // Bio optional
    case 8: return false; // Account creation handles its own advancement
    case 9: return false; // Agreement handles its own advancement
    case 10: return false; // Payment handles its own advancement
    default: return false;
  }
}

function canGoBack(step: number): boolean {
  // Can go back on form steps (1-8), not on welcome, account creation, or post-auth steps
  return step >= 1 && step <= 7;
}

export default function Onboarding() {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const [searchParams] = useSearchParams();

  // Handle return from agreement signing
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam === '11' && state.clientId) {
      // Returned from agreement signing — mark signed and go to payment
      dispatch({ type: 'AGREEMENT_SIGNED' });
      dispatch({ type: 'GO_TO_STEP', step: 10 });
    }
  }, [searchParams, state.clientId]);

  const handleNext = useCallback(() => {
    if (canAdvance(state)) {
      dispatch({ type: 'NEXT_STEP' });
    }
  }, [state]);

  const handleBack = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  // Enter key advances on form steps
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && canAdvance(state) && state.currentStep >= 1 && state.currentStep <= 7) {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, handleNext]);

  function renderStep() {
    switch (state.currentStep) {
      case 0:
        return <WelcomeStep dispatch={dispatch} />;
      case 1:
        return <NameStep firstName={state.firstName} lastName={state.lastName} dispatch={dispatch} />;
      case 2:
        return <ContactStep email={state.email} phone={state.phone} dispatch={dispatch} />;
      case 3:
        return <StatesLicensedStep licensedStates={state.licensedStates} dispatch={dispatch} />;
      case 4:
        return <AddressStep address={state.address} dispatch={dispatch} />;
      case 5:
        return (
          <HeadshotStep
            headshotFile={state.headshotFile}
            headshotPreviewUrl={state.headshotPreviewUrl}
            dispatch={dispatch}
          />
        );
      case 6:
        return <NPNStep npn={state.npn} dispatch={dispatch} />;
      case 7:
        return <BioStep bio={state.bio} dispatch={dispatch} />;
      case 8:
        return (
          <CreateAccountStep
            email={state.email}
            password={state.password}
            confirmPassword={state.confirmPassword}
            firstName={state.firstName}
            lastName={state.lastName}
            phone={state.phone}
            licensedStates={state.licensedStates}
            address={state.address}
            npn={state.npn}
            bio={state.bio}
            headshotFile={state.headshotFile}
            headshotPreviewUrl={state.headshotPreviewUrl}
            isCreatingAccount={state.isCreatingAccount}
            dispatch={dispatch}
          />
        );
      case 9:
        return (
          <AgreementStep
            clientId={state.clientId}
            agreementId={state.agreementId}
            agreementSigned={state.agreementSigned}
            dispatch={dispatch}
          />
        );
      case 10:
        return (
          <PaymentStep
            clientId={state.clientId}
            paymentComplete={state.paymentComplete}
            dispatch={dispatch}
          />
        );
      case 11:
        return <SuccessStep />;
      default:
        return null;
    }
  }

  const showNavFooter = state.currentStep >= 1 && state.currentStep <= 7;

  return (
    <div className="fixed inset-0 liquid-glass-bg font-montserrat">
      <OnboardingBackground />
      <OnboardingProgressBar currentStep={state.currentStep} />

      {/* Main content area */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        {/* Error banner */}
        {state.error && (
          <motion.div
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 glass-card border-red-500/30 px-5 py-3 max-w-md"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-red-400">{state.error}</p>
          </motion.div>
        )}

        <AnimatedStepWrapper stepKey={state.currentStep} direction={state.direction}>
          {renderStep()}
        </AnimatedStepWrapper>

        {/* Navigation footer for form steps */}
        {showNavFooter && (
          <motion.div
            className="flex items-center justify-between w-full max-w-lg mx-auto mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Back button */}
            <div>
              {canGoBack(state.currentStep) && (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-white/40 hover:text-white/70 hover:bg-white/5"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
            </div>

            {/* Next button */}
            <Button
              onClick={handleNext}
              disabled={!canAdvance(state)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl border-0 transition-all duration-300 disabled:opacity-30 px-6 h-10"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
