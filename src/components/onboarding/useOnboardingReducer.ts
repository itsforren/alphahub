export interface AddressData {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface OnboardingState {
  currentStep: number;
  direction: 1 | -1;

  // Personal info (public steps)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licensedStates: string[];
  address: AddressData;
  headshotFile: File | null;
  headshotPreviewUrl: string | null;
  npn: string;
  bio: string;

  // Account creation
  password: string;
  confirmPassword: string;

  // Auth transition
  isCreatingAccount: boolean;
  isAuthenticated: boolean;
  clientId: string | null;
  userId: string | null;
  agreementId: string | null;
  agentId: string | null;

  // Payment
  paymentComplete: boolean;

  // Agreement signed
  agreementSigned: boolean;

  // Global
  isSubmitting: boolean;
  error: string | null;
}

export type OnboardingAction =
  | { type: 'SET_FIELD'; field: string; value: unknown }
  | { type: 'SET_ADDRESS'; address: Partial<AddressData> }
  | { type: 'SET_LICENSED_STATES'; states: string[] }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'SET_CREATING_ACCOUNT'; value: boolean }
  | { type: 'ACCOUNT_CREATED'; clientId: string; userId: string; agreementId: string; agentId: string }
  | { type: 'SET_AUTHENTICATED' }
  | { type: 'AGREEMENT_SIGNED' }
  | { type: 'PAYMENT_COMPLETE' }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_SUBMITTING'; value: boolean };

export const TOTAL_STEPS = 12;

export const initialState: OnboardingState = {
  currentStep: 0,
  direction: 1,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  licensedStates: [],
  address: { street: '', city: '', state: '', zip: '', country: 'US' },
  headshotFile: null,
  headshotPreviewUrl: null,
  npn: '',
  bio: '',
  password: '',
  confirmPassword: '',
  isCreatingAccount: false,
  isAuthenticated: false,
  clientId: null,
  userId: null,
  agreementId: null,
  agentId: null,
  paymentComplete: false,
  agreementSigned: false,
  isSubmitting: false,
  error: null,
};

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value, error: null };

    case 'SET_ADDRESS':
      return { ...state, address: { ...state.address, ...action.address }, error: null };

    case 'SET_LICENSED_STATES':
      return { ...state, licensedStates: action.states, error: null };

    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
        direction: 1,
        error: null,
      };

    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
        direction: -1,
        error: null,
      };

    case 'GO_TO_STEP':
      return {
        ...state,
        currentStep: action.step,
        direction: action.step > state.currentStep ? 1 : -1,
        error: null,
      };

    case 'SET_CREATING_ACCOUNT':
      return { ...state, isCreatingAccount: action.value };

    case 'ACCOUNT_CREATED':
      return {
        ...state,
        clientId: action.clientId,
        userId: action.userId,
        agreementId: action.agreementId,
        agentId: action.agentId,
        isCreatingAccount: false,
      };

    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: true };

    case 'AGREEMENT_SIGNED':
      return { ...state, agreementSigned: true };

    case 'PAYMENT_COMPLETE':
      return { ...state, paymentComplete: true };

    case 'SET_ERROR':
      return { ...state, error: action.error, isSubmitting: false, isCreatingAccount: false };

    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value };

    default:
      return state;
  }
}

export const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];
