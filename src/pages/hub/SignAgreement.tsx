import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SignatureCanvas from 'react-signature-canvas';
import SHA256 from 'crypto-js/sha256';
import { format } from 'date-fns';
import { fireConfetti, fireFireworks, fireLensFlare } from '@/lib/confetti';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Pencil, 
  Shield, 
  Eye,
  Loader2,
  Check,
  X,
  ChevronRight,
  User,
  ScrollText,
  ListChecks,
  PenTool,
  Eraser,
  DollarSign,
  Scale,
  Ban,
  RefreshCw,
  FileWarning,
} from 'lucide-react';

// Elegant floating particles component for success page
const FloatingParticles = () => {
  const particles = useMemo(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      startX: Math.random() * 100,
      startY: 100 + Math.random() * 20,
      endX: Math.random() * 100,
      size: Math.random() * 5 + 2,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 8,
      opacity: Math.random() * 0.4 + 0.15,
      drift: (Math.random() - 0.5) * 60,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-emerald-400"
          style={{
            left: `${particle.startX}%`,
            width: particle.size,
            height: particle.size,
          }}
          initial={{ 
            y: 0, 
            opacity: 0,
          }}
          animate={{
            y: [0, -800],
            x: [0, particle.drift, particle.drift * 0.5],
            opacity: [0, particle.opacity, particle.opacity, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/hooks/useClientData';
import { useClientSelfOnboarding, useUpdateSelfOnboardingTask } from '@/hooks/useClientSelfOnboarding';
import { 
  useAgreementTemplate, 
  useCreateAgreement, 
  useSignAgreement,
  useUploadSignature,
  useUploadAgreementPdf,
  type KeyTermCheckboxState 
} from '@/hooks/useAgreement';
import { useAgreementOTP } from '@/hooks/useAgreementOTP';
import { SMSOTPVerification } from '@/components/portal/SMSOTPVerification';
import {
  useScrollTracking,
  useFocusTracking,
  useTimeOnPage,
  useDeviceInfo,
  useIpAddress,
  generateSessionId,
  generateCsrfToken,
} from '@/hooks/useAgreementTracking';
import { useAuditLog, type InitialsSectionsCompleted } from '@/hooks/useAuditLog';
import { AgreementViewer } from '@/components/agreement/AgreementViewer';
import { InitialsSection } from '@/components/agreement/InitialsSection';
import { generateAgreementPdf } from '@/lib/generateAgreementPdf';
import { getSignedAgreementsDownloadUrl } from '@/lib/agreementsStorage';
import forrenWarrenSignature from '@/assets/forren-warren-signature.png';
import alphaAgentWolfLogo from '@/assets/alpha-agent-wolf-logo.png';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const STEPS = [
  { id: 1, title: 'Verify', icon: Shield },
  { id: 2, title: 'Info', icon: User },
  { id: 3, title: 'Review', icon: ScrollText },
  { id: 4, title: 'Terms', icon: ListChecks },
  { id: 5, title: 'Sign', icon: PenTool },
];

// Initials sections configuration
const INITIALS_SECTIONS = [
  {
    id: 'no_refunds',
    title: 'No Refunds / Ad Spend Non-Refundable',
    description: 'I understand that all management fees and advertising spend are non-refundable once services begin.',
    icon: <DollarSign className="h-5 w-5" />,
    variant: 'danger' as const,
  },
  {
    id: 'chargebacks',
    title: 'Chargebacks Prohibited + $250 Fee',
    description: 'I agree not to file chargebacks and understand that any chargeback will incur a $250 administrative fee plus actual damages.',
    icon: <Ban className="h-5 w-5" />,
    variant: 'danger' as const,
  },
  {
    id: 'arbitration',
    title: 'Arbitration / Class Action Waiver',
    description: 'I agree that any disputes will be resolved through binding arbitration and waive my right to participate in class action lawsuits.',
    icon: <Scale className="h-5 w-5" />,
    variant: 'danger' as const,
  },
  {
    id: 'ip_no_copying',
    title: 'IP Protection / No Copying',
    description: "I understand Company's system is proprietary and I may not copy, reverse engineer, or use it to build/market a competing lead-gen system.",
    icon: <Shield className="h-5 w-5" />,
    variant: 'danger' as const,
  },
  {
    id: 'personal_guarantee',
    title: 'Personal Guarantee',
    description: 'I personally guarantee payment of all amounts due under this agreement.',
    icon: <FileWarning className="h-5 w-5" />,
    variant: 'danger' as const,
  },
];

function getExpectedInitials(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-zA-Z]/g, ''))
    .filter(Boolean);

  if (parts.length === 0) return '';

  // 2 names: first + last (JD)
  if (parts.length === 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  // 3+ names: first + first middle + last (JDJ)
  if (parts.length >= 3) {
    return `${parts[0][0]}${parts[1][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  // fallback (single token)
  return parts[0][0].toUpperCase();
}

export default function SignAgreement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  
  // Allow admins to preview any client's signing page via ?clientId=xxx
  const previewClientId = searchParams.get('clientId');
  const { data: client, isLoading: clientLoading } = useClient(previewClientId || undefined);
  const { data: template, isLoading: templateLoading } = useAgreementTemplate();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef<SignatureCanvas>(null);
  const submittingLockRef = useRef(false); // Prevent double-click race conditions
  
  const { scrolledToBottom, scrolledToBottomAt, scrollProgress } = useScrollTracking(scrollRef as React.RefObject<HTMLElement>);
  const focusEvents = useFocusTracking();
  const { pageLoadAt, timeOnPageSeconds } = useTimeOnPage();
  const deviceInfo = useDeviceInfo();
  const { ipAddress, geoLocation } = useIpAddress();
  
  // OTP Hook
  const otpState = useAgreementOTP();
  
  // Self-onboarding hooks for auto-completing the sign_agreement task
  const { data: selfOnboardingTasks = [] } = useClientSelfOnboarding(client?.id);
  const updateSelfOnboardingTask = useUpdateSelfOnboardingTask();
  
  const [sessionId] = useState(() => generateSessionId());
  const [csrfToken] = useState(() => generateCsrfToken());
  
  // Audit logging
  const auditLog = useAuditLog(ipAddress, deviceInfo.userAgent);
  
  // Current step
  const [currentStep, setCurrentStep] = useState(1);

  // Persisted evidence (ScrollArea unmounts when switching steps)
  const [agreementScrolledToBottom, setAgreementScrolledToBottom] = useState(false);
  const [agreementScrolledToBottomAt, setAgreementScrolledToBottomAt] = useState<string | null>(null);
  
  // Form state
  const [signerInfo, setSignerInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    npn: '',
    licenseStates: [] as string[],
  });
  
  const [keyTermsChecked, setKeyTermsChecked] = useState<Record<string, KeyTermCheckboxState>>({});
  const [electronicIntent, setElectronicIntent] = useState(false);
  const [electronicIntentAt, setElectronicIntentAt] = useState<string | null>(null);
  const [typedSignature, setTypedSignature] = useState('');
  const [printedName, setPrintedName] = useState('');
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [signatureStartedAt, setSignatureStartedAt] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [signedTimestamp, setSignedTimestamp] = useState<string | null>(null);
  
  // Explicit read confirmation state
  const [confirmedRead, setConfirmedRead] = useState(false);
  const [confirmedReadAt, setConfirmedReadAt] = useState<string | null>(null);
  
  // Local state for initials typing (so input updates immediately)
  const [initialsTyping, setInitialsTyping] = useState<Record<string, string>>({});
  const [initialsErrors, setInitialsErrors] = useState<Record<string, string>>({});

  // When the user enters the Review step, require a fresh confirmation.
  useEffect(() => {
    if (currentStep === 3) {
      setConfirmedRead(false);
      setConfirmedReadAt(null);
      setAgreementScrolledToBottom(false);
      setAgreementScrolledToBottomAt(null);
    }
  }, [currentStep]);

  // Persist scroll-to-bottom evidence (ScrollArea unmounts when changing steps).
  useEffect(() => {
    if (currentStep !== 3) return;
    if (!scrolledToBottom) return;

    setAgreementScrolledToBottom(true);
    setAgreementScrolledToBottomAt((prev) => prev ?? scrolledToBottomAt ?? new Date().toISOString());
  }, [currentStep, scrolledToBottom, scrolledToBottomAt]);
  
  const createAgreement = useCreateAgreement();
  const signAgreement = useSignAgreement();
  const uploadSignature = useUploadSignature();
  const uploadPdf = useUploadAgreementPdf();
  
  // Check if agreement is already signed (show success page on refresh)
  useEffect(() => {
    if (client && !isSuccess) {
      const clientData = client as any;
      if (clientData.contract_signed_at) {
        setSignedTimestamp(clientData.contract_signed_at);
        setIsSuccess(true);
        window.scrollTo({ top: 0 });
        // Fire confetti even on revisit
        fireConfetti();
        setTimeout(() => fireFireworks(), 600);
        setTimeout(() => fireConfetti(), 1500);
      }
    }
  }, [client, isSuccess]);

  // Pre-fill form with client data
  useEffect(() => {
    if (client) {
      const clientData = client as any;
      setSignerInfo({
        fullName: clientData.name || '',
        email: clientData.email || '',
        phone: clientData.phone || '',
        addressLine1: clientData.address_street || '',
        addressLine2: '',
        city: clientData.address_city || '',
        state: clientData.address_state || '',
        zip: clientData.address_zip || '',
        npn: clientData.npn || '',
        licenseStates: clientData.states?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
      });
    }
  }, [client]);
  
  // Always scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Auto-advance when OTP verified
  useEffect(() => {
    if (otpState.isVerified && currentStep === 1) {
      auditLog.logOtpVerified(otpState.verifiedAt || new Date().toISOString());
      setTimeout(() => setCurrentStep(2), 500);
    }
  }, [otpState.isVerified, currentStep, otpState.verifiedAt]);
  
  // Log scrolled to bottom
  useEffect(() => {
    if (scrolledToBottom && currentStep === 3) {
      auditLog.logScrolledToBottom();
    }
  }, [scrolledToBottom, currentStep]);
  
  // Render agreement content with placeholders
  const renderedContent = useMemo(() => {
    if (!template?.content || !client) return '';
    
    return template.content
      .replace(/\{\{contact\.name\}\}/g, signerInfo.fullName || client.name || '')
      .replace(/\{\{current_date\}\}/g, format(new Date(), 'MMMM d, yyyy'))
      .replace(/\{\{current_timestamp\}\}/g, format(new Date(), "MMMM d, yyyy 'at' h:mm a"))
      .replace(/\{\{ip_address\}\}/g, ipAddress || 'Capturing...')
      .replace(/\{\{user_agent\}\}/g, deviceInfo.userAgent || 'Unknown');
  }, [template, client, signerInfo.fullName, ipAddress, deviceInfo.userAgent]);
  
  // Check if all requirements are met per step
  const step1Complete = otpState.isVerified;
  const step2Complete = !!(
    signerInfo.fullName.trim() && 
    signerInfo.email.trim() && 
    signerInfo.phone.trim() && 
    signerInfo.addressLine1.trim() && 
    signerInfo.city.trim() && 
    signerInfo.state.trim() && 
    signerInfo.zip.trim() &&
    signerInfo.npn.trim() &&
    signerInfo.licenseStates.length > 0
  );
  const step3Complete = agreementScrolledToBottom && confirmedRead;
  
  const allKeyTermsChecked = useMemo(() => {
    if (!template?.key_terms) return false;
    return template.key_terms.every(term => keyTermsChecked[term.id]?.checked);
  }, [template, keyTermsChecked]);
  
  const expectedInitials = useMemo(() => getExpectedInitials(signerInfo.fullName), [signerInfo.fullName]);
  
  const allInitialsComplete = useMemo(() => {
    return INITIALS_SECTIONS.every(section => {
      const data = auditLog.initialsSections[section.id as keyof InitialsSectionsCompleted];
      return data && data.initials === expectedInitials;
    });
  }, [auditLog.initialsSections, expectedInitials]);
  
  const step4Complete = allKeyTermsChecked && allInitialsComplete;
  const step5Complete = electronicIntent && hasDrawnSignature && typedSignature.trim() !== '';
  
  const canSign = step1Complete && step2Complete && step3Complete && step4Complete && step5Complete;
  
  const getStepStatus = (stepId: number) => {
    switch (stepId) {
      case 1: return step1Complete;
      case 2: return step2Complete;
      case 3: return step3Complete;
      case 4: return step4Complete;
      case 5: return step5Complete;
      default: return false;
    }
  };
  
  // Count how many key terms and initials are done
  const keyTermsCompleteCount = useMemo(() => {
    return Object.values(keyTermsChecked).filter(v => v.checked).length;
  }, [keyTermsChecked]);
  
  const initialsCompleteCount = useMemo(() => {
    return INITIALS_SECTIONS.filter(section => {
      const data = auditLog.initialsSections[section.id as keyof InitialsSectionsCompleted];
      return data && data.initials.length >= 2;
    }).length;
  }, [auditLog.initialsSections]);
  
  const handleKeyTermCheck = useCallback((termId: string, checked: boolean) => {
    const termLabel = template?.key_terms.find(t => t.id === termId)?.label || termId;
    auditLog.logKeyTermChecked(termId, termLabel, checked);
    
    setKeyTermsChecked(prev => ({
      ...prev,
      [termId]: {
        checked,
        checked_at: new Date().toISOString(),
      }
    }));
  }, [template, auditLog]);

  const handleInitialsChange = useCallback((sectionId: string, value: string) => {
    const expected = expectedInitials || '';
    const maxLen = Math.max(2, Math.min(3, expected.length || 3));

    const cleaned = value
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, maxLen);

    // Always update local typing state for immediate display
    setInitialsTyping(prev => ({ ...prev, [sectionId]: cleaned }));

    // Only validate once the user has typed the full expected length
    if (expected && cleaned.length === expected.length) {
      if (cleaned !== expected) {
        setInitialsErrors(prev => ({ ...prev, [sectionId]: `Initials must match your name (Expected: ${expected})` }));
        return;
      }

      setInitialsErrors(prev => {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });

      auditLog.logInitialsSection(sectionId as keyof InitialsSectionsCompleted, cleaned);
      return;
    }

    // Clear error while the user is still typing
    setInitialsErrors(prev => {
      if (!prev[sectionId]) return prev;
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
  }, [auditLog, expectedInitials]);
  
  const handleElectronicIntentChange = (checked: boolean) => {
    setElectronicIntent(checked);
    if (checked && !electronicIntentAt) {
      setElectronicIntentAt(new Date().toISOString());
      auditLog.logElectronicIntentAccepted();
    }
  };
  
  const handleSignatureStart = () => {
    if (!signatureStartedAt) {
      setSignatureStartedAt(new Date().toISOString());
      auditLog.logSignatureStarted();
    }
  };
  
  const clearSignature = () => {
    signatureRef.current?.clear();
    setHasDrawnSignature(false);
    auditLog.logSignatureCleared();
  };
  
  const handleSignatureEnd = () => {
    const isEmpty = signatureRef.current?.isEmpty();
    setHasDrawnSignature(!isEmpty);
    if (!isEmpty) {
      auditLog.logSignatureCompleted();
    }
  };
  
  const handleTypedSignatureChange = (value: string) => {
    setTypedSignature(value);
    if (value.trim()) {
      auditLog.logTypedSignatureEntered(value);
    }
  };
  
  const handlePrintedNameChange = (value: string) => {
    setPrintedName(value);
    if (value.trim()) {
      auditLog.logPrintedNameEntered(value);
    }
  };
  
  const handleStepChange = (newStep: number) => {
    if (newStep > currentStep) {
      auditLog.logStepCompleted(currentStep, STEPS[currentStep - 1].title);
    }
    setCurrentStep(newStep);
    // Always scroll to top when changing steps
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleSubmit = async () => {
    // Synchronous lock to prevent double-click race conditions
    if (submittingLockRef.current) return;
    if (!canSign || !client || !template) return;
    
    submittingLockRef.current = true;
    auditLog.logFinalSubmitClicked();
    setIsSubmitting(true);
    
    try {
      // Create agreement first
      const agreementResult = await createAgreement.mutateAsync({
        client_id: client.id,
        status: 'pending',
        template_id: template.template_id,
        signer_full_name: signerInfo.fullName,
        signer_email: signerInfo.email,
        signer_phone: signerInfo.phone,
        signer_state: signerInfo.state,
        signer_business_address: [signerInfo.addressLine1, signerInfo.addressLine2, signerInfo.city, signerInfo.state, signerInfo.zip].filter(Boolean).join(', '),
        signer_license_number: signerInfo.npn,
        signer_license_states: signerInfo.licenseStates,
        otp_verified: true,
        otp_verified_at: otpState.verifiedAt,
      });
      
      // Upload signature image
      const signatureDataUrl = signatureRef.current?.toDataURL('image/png');
      let signatureUrl = '';
      
      if (signatureDataUrl) {
        const blob = await fetch(signatureDataUrl).then(r => r.blob());
        signatureUrl = await uploadSignature.mutateAsync({
          clientId: client.id,
          signatureBlob: blob,
        });
      }
      
      const contentHash = SHA256(renderedContent).toString();
      const signedAt = new Date().toISOString();
      
      // Generate key terms labels map
      const keyTermsLabels: Record<string, string> = {};
      template.key_terms.forEach(term => {
        keyTermsLabels[term.id] = term.label;
      });
      
      // Generate PDF with audit certificate
      const { blob: pdfBlob, hash: pdfHash } = await generateAgreementPdf({
        agreementContent: renderedContent,
        templateName: template.name,
        templateVersion: template.version,
        signerFullName: signerInfo.fullName,
        signerEmail: signerInfo.email,
        signerPhone: signerInfo.phone,
        signerAddress: [signerInfo.addressLine1, signerInfo.addressLine2, signerInfo.city, signerInfo.state, signerInfo.zip].filter(Boolean).join(', '),
        signerNpn: signerInfo.npn,
        signerLicenseStates: signerInfo.licenseStates,
        otpVerified: otpState.isVerified,
        otpVerifiedAt: otpState.verifiedAt,
        keyTermsCheckboxes: keyTermsChecked,
        keyTermsLabels,
        initialsSections: auditLog.initialsSections,
        signatureDataUrl,
        typedSignature,
        printedName,
        electronicIntentAccepted: electronicIntent,
        electronicIntentAcceptedAt: electronicIntentAt,
        signedAt,
        ipAddress,
        userAgent: deviceInfo.userAgent,
        sessionId,
        geolocationCity: geoLocation.city || null,
        geolocationRegion: geoLocation.region || null,
        timeOnPageSeconds,
        scrolledToBottom: agreementScrolledToBottom,
        scrolledToBottomAt: agreementScrolledToBottomAt,
        readConfirmed: confirmedRead,
        readConfirmedAt: confirmedReadAt,
        focusEvents,
        auditEvents: auditLog.auditEvents,
        platformOs: deviceInfo.platformOs,
        screenResolution: deviceInfo.screenResolution,
        languageLocale: deviceInfo.languageLocale,
        referrerUrl: deviceInfo.referrerUrl,
        utmParams: deviceInfo.utmParams,
      });
      
      // Upload PDF
      const pdfUrl = await uploadPdf.mutateAsync({
        clientId: client.id,
        pdfBlob,
      });
      
      setGeneratedPdfUrl(pdfUrl);
      
      // Sign agreement with all data
      await signAgreement.mutateAsync({
        agreementId: agreementResult.id,
        clientId: client.id,
        signatureData: {
          signature_drawn_url: signatureUrl,
          signature_typed: typedSignature,
          printed_name: printedName,
          electronic_intent_accepted: electronicIntent,
          electronic_intent_accepted_at: electronicIntentAt,
          key_terms_checkboxes: keyTermsChecked,
          scrolled_to_bottom: agreementScrolledToBottom,
          scrolled_to_bottom_at: agreementScrolledToBottomAt,
          time_on_page_seconds: timeOnPageSeconds,
          page_load_at: pageLoadAt,
          ip_address: ipAddress,
          user_agent: deviceInfo.userAgent,
          platform_os: deviceInfo.platformOs,
          screen_resolution: deviceInfo.screenResolution,
          language_locale: deviceInfo.languageLocale,
          referrer_url: deviceInfo.referrerUrl,
          utm_params: deviceInfo.utmParams,
          geolocation_city: geoLocation.city,
          geolocation_region: geoLocation.region,
          session_id: sessionId,
          csrf_token_id: csrfToken,
          contract_content: renderedContent,
          contract_content_hash: contentHash,
          focus_events: focusEvents,
          signed_at_local_offset: new Date().getTimezoneOffset(),
          pdf_url: pdfUrl,
          pdf_hash: pdfHash,
        } as any,
      });
      
      auditLog.logAgreementSigned(agreementResult.id);
      setSignedTimestamp(signedAt);
      
      // Auto-complete the sign_agreement self-onboarding task
      const signTask = selfOnboardingTasks.find(t => t.task_key === 'sign_agreement' && !t.completed);
      if (signTask && client) {
        updateSelfOnboardingTask.mutate({
          taskId: signTask.id,
          completed: true,
          clientId: client.id,
          clientName: client.name,
          taskLabel: signTask.task_label,
        });
      }
      
      setIsSuccess(true);
      window.scrollTo({ top: 0 });
      // Fire celebration sequence: lens flare → confetti → fireworks → confetti
      fireLensFlare();
      setTimeout(() => fireConfetti(), 300);
      setTimeout(() => fireFireworks(), 800);
      setTimeout(() => fireLensFlare(), 2000);
      setTimeout(() => fireConfetti(), 2500);
      
    } catch (error: any) {
      console.error('Error signing agreement:', error);
      const errorMsg = error?.message || 'Unknown error';
      if (errorMsg.includes('row-level security') || errorMsg.includes('policy')) {
        toast.error('Permission denied while finalizing agreement. Please contact support.');
      } else {
        toast.error('Failed to sign agreement: ' + errorMsg);
      }
      submittingLockRef.current = false; // Allow retry on error
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (clientLoading || templateLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-blue-950/10 font-montserrat">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full animate-spin border-t-blue-500" />
            <FileText className="h-6 w-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground mt-4">Loading your agreement...</p>
        </motion.div>
      </div>
    );
  }
  
  // No client
  if (!client) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-blue-950/10 p-4 font-montserrat">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-md border-destructive/30 bg-destructive/5">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-2xl font-bold mb-2">No Account Found</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't find your client account. Please contact support.
              </p>
              <Button onClick={() => navigate('/hub')} variant="outline">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }
  
  // Success state
  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-background to-emerald-950/20 font-montserrat overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 py-12">
          {/* Elegant floating particles */}
          <FloatingParticles />

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="text-center max-w-2xl relative z-10"
          >
            {/* Pulsing success ring */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className="relative mb-8 flex justify-center"
            >
              <motion.div
                className="absolute w-32 h-32 rounded-full bg-emerald-500/20"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center ring-8 ring-emerald-500/10 relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                </motion.div>
              </div>
            </motion.div>

          {/* Title with staggered animation */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent"
          >
            Agreement Signed Successfully!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-muted-foreground mb-8"
          >
            Your service agreement has been legally executed and recorded. Welcome to Alpha Agent!
          </motion.p>
          
          {/* Full Certification Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border rounded-2xl p-8 mb-8 text-left shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Certificate of Completion</h3>
                <p className="text-sm text-muted-foreground">Electronic Signature Verification</p>
              </div>
            </div>
            
            {/* Signer Information */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Signer Details</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Full Name:</span> <span className="font-medium">{signerInfo.fullName}</span></p>
                  <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{signerInfo.email}</span></p>
                  <p><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{signerInfo.phone}</span></p>
                  <p><span className="text-muted-foreground">NPN:</span> <span className="font-medium">{signerInfo.npn}</span></p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Signing Environment</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">IP Address:</span> <span className="font-mono font-medium">{ipAddress}</span></p>
                  <p><span className="text-muted-foreground">Location:</span> <span className="font-medium">{geoLocation.city ? `${geoLocation.city}, ${geoLocation.region}` : 'Detected'}</span></p>
                  <p><span className="text-muted-foreground">Device:</span> <span className="font-medium">{deviceInfo.platformOs}</span></p>
                  <p><span className="text-muted-foreground">Session ID:</span> <span className="font-mono text-xs break-all">{sessionId}</span></p>
                </div>
              </div>
            </div>
            
            {/* Verification Steps */}
            <div className="mb-6">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Verification Steps Completed</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Phone Verified', icon: Shield, done: step1Complete },
                  { label: 'Info Confirmed', icon: User, done: step2Complete },
                  { label: 'Agreement Read', icon: ScrollText, done: step3Complete },
                  { label: 'Terms Accepted', icon: ListChecks, done: step4Complete },
                  { label: 'Signature Captured', icon: PenTool, done: step5Complete },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <item.icon className="h-5 w-5 text-emerald-500" />
                    <span className="text-xs text-center font-medium">{item.label}</span>
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Timeline / Audit Log (Collapsible) */}
            <Accordion type="single" collapsible className="mb-6">
              <AccordionItem value="audit-log" className="border rounded-xl">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium">Full Audit Trail</span>
                    <Badge variant="outline" className="ml-2">{auditLog.auditEvents.length} events</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {auditLog.auditEvents.map((event, index) => (
                      <div key={index} className="flex items-start gap-3 text-sm py-2 border-b last:border-0">
                        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                          {format(new Date(event.timestamp), 'h:mm:ss a')}
                        </span>
                        <span className="font-medium">{event.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            {/* Download Button */}
            <div className="flex flex-wrap gap-4">
              {generatedPdfUrl && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const signedUrl = await getSignedAgreementsDownloadUrl(generatedPdfUrl);
                      
                      // Fetch as blob to bypass ad-blocker issues
                      const response = await fetch(signedUrl);
                      if (!response.ok) throw new Error('Failed to fetch PDF');
                      
                      const blob = await response.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = 'Service-Agreement.pdf';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                    } catch (e) {
                      console.error('Failed to download agreement:', e);
                      toast.error('Unable to download agreement. Please try again.');
                    }
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download Signed Agreement
                </Button>
              )}
            </div>
            
            {/* Legal Footer */}
            <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
              <p>This certificate confirms that the above-named individual electronically signed the service agreement in accordance with the UETA and E-SIGN Act. The signature was captured at {signedTimestamp ? format(new Date(signedTimestamp), "MMMM d, yyyy 'at' h:mm:ss a") : 'N/A'} and is legally binding.</p>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/hub/profile?openPayment=true')}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold px-8"
            >
              Continue Setup
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-background to-blue-950/5 overflow-auto font-montserrat">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={alphaAgentWolfLogo} 
                alt="Alpha Agent" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="font-bold text-lg">Service Agreement</h1>
                <p className="text-xs text-muted-foreground">Alpha Agent Marketing</p>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-1">
              {STEPS.map((step, index) => {
                const isActive = currentStep === step.id;
                const isComplete = getStepStatus(step.id);
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => {
                        if (step.id < currentStep || getStepStatus(step.id - 1)) {
                          handleStepChange(step.id);
                        }
                      }}
                      disabled={step.id > currentStep && !getStepStatus(step.id - 1)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        isActive 
                          ? 'bg-blue-500/20 text-blue-500' 
                          : isComplete 
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : 'text-muted-foreground hover:bg-muted/50'
                      } ${step.id > currentStep && !getStepStatus(step.id - 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isComplete && step.id !== currentStep ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">{step.title}</span>
                    </button>
                    {index < STEPS.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 mx-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Mobile Progress */}
          <div className="md:hidden mt-3">
            <Progress value={(currentStep / STEPS.length) * 100} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Email Verification */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-blue-500/20 bg-gradient-to-br from-card to-blue-950/5">
                <CardContent className="p-8">
                  <SMSOTPVerification
                    phone={signerInfo.phone}
                    maskedPhone={otpState.maskedPhone}
                    expiresAt={otpState.expiresAt}
                    isVerified={otpState.isVerified}
                    isSending={otpState.isSending}
                    isVerifying={otpState.isVerifying}
                    error={otpState.error}
                    attemptsRemaining={otpState.attemptsRemaining}
                    onSendOTP={async () => {
                      auditLog.logOtpSendRequested(signerInfo.phone);
                      return otpState.sendOTP(signerInfo.phone);
                    }}
                    onVerifyOTP={(otp) => otpState.verifyOTP(signerInfo.phone, otp)}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* Step 2: Signer Information */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Your Information</h2>
                      <p className="text-sm text-muted-foreground">Confirm your details before signing</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <Label htmlFor="fullName" className="text-sm font-medium">Full Legal Name *</Label>
                      <Input
                        id="fullName"
                        value={signerInfo.fullName}
                        onChange={(e) => setSignerInfo(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter your full legal name"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="email"
                          type="email"
                          value={signerInfo.email}
                          onChange={(e) => setSignerInfo(prev => ({ ...prev, email: e.target.value }))}
                          className="pr-24"
                          disabled
                        />
                        <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500/20 text-emerald-600 text-xs border-0">
                          <Check className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">Mobile Phone *</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="phone"
                          type="tel"
                          value={signerInfo.phone}
                          className="pr-40 bg-muted/50 text-muted-foreground"
                          disabled
                        />
                        <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500/20 text-emerald-600 text-xs border-0">
                          <Shield className="h-3 w-3 mr-1" /> OTP Identity Verified
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Personal Address Section */}
                    <div className="md:col-span-2 pt-4 border-t">
                      <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Personal Address</h3>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="addressLine1" className="text-sm font-medium">Address Line 1 *</Label>
                      <Input
                        id="addressLine1"
                        value={signerInfo.addressLine1}
                        onChange={(e) => setSignerInfo(prev => ({ ...prev, addressLine1: e.target.value }))}
                        placeholder="Street address"
                        className="mt-1.5"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="addressLine2" className="text-sm font-medium">Address Line 2</Label>
                      <Input
                        id="addressLine2"
                        value={signerInfo.addressLine2}
                        onChange={(e) => setSignerInfo(prev => ({ ...prev, addressLine2: e.target.value }))}
                        placeholder="Apt, Suite, Unit, etc. (optional)"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city" className="text-sm font-medium">City *</Label>
                      <Input
                        id="city"
                        value={signerInfo.city}
                        onChange={(e) => setSignerInfo(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-sm font-medium">State *</Label>
                      <select
                        id="state"
                        value={signerInfo.state}
                        onChange={(e) => setSignerInfo(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1.5"
                      >
                        <option value="">Select state</option>
                        {US_STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="zip" className="text-sm font-medium">ZIP Code *</Label>
                      <Input
                        id="zip"
                        value={signerInfo.zip}
                        onChange={(e) => setSignerInfo(prev => ({ ...prev, zip: e.target.value }))}
                        placeholder="12345"
                        className="mt-1.5"
                      />
                    </div>
                    
                    {/* License Section */}
                    <div className="md:col-span-2 pt-4 border-t">
                      <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">License Information</h3>
                    </div>
                    <div>
                      <Label htmlFor="npn" className="text-sm font-medium">NPN (National Producer Number) *</Label>
                      <Input
                        id="npn"
                        value={signerInfo.npn}
                        onChange={(e) => {
                          setSignerInfo(prev => ({ ...prev, npn: e.target.value }));
                        }}
                        placeholder="Enter your NPN"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">States Licensed *</Label>
                      <p className="text-xs text-muted-foreground mb-1">Select at least one state</p>
                      <select
                        onChange={(e) => {
                          const selectedState = e.target.value;
                          if (selectedState && !signerInfo.licenseStates.includes(selectedState)) {
                            setSignerInfo(prev => ({
                              ...prev,
                              licenseStates: [...prev.licenseStates, selectedState].sort()
                            }));
                          }
                          e.target.value = '';
                        }}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1.5"
                      >
                        <option value="">Add a state...</option>
                        {US_STATES.filter(s => !signerInfo.licenseStates.includes(s)).map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                      {signerInfo.licenseStates.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {signerInfo.licenseStates.map(state => (
                            <Badge key={state} variant="secondary" className="text-xs">
                              {state}
                              <button
                                onClick={() => setSignerInfo(prev => ({
                                  ...prev,
                                  licenseStates: prev.licenseStates.filter(s => s !== state)
                                }))}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          At least one licensed state is required
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-8">
                    <Button
                      onClick={() => handleStepChange(3)}
                      disabled={!step2Complete}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
                    >
                      Continue to Agreement
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* Step 3: Review Agreement - Enhanced */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <ScrollText className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Review Agreement</h2>
                        <p className="text-sm text-muted-foreground">Read the full agreement carefully. Check important terms as you go.</p>
                      </div>
                    </div>
                    {scrolledToBottom ? (
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-0">
                        <Check className="h-3 w-3 mr-1" /> Read Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-blue-500/30 text-blue-500">
                        <Eye className="h-3 w-3 mr-1" /> Scroll to continue ({scrollProgress}%)
                      </Badge>
                    )}
                  </div>
                  
                  <Progress value={scrollProgress} className="h-1.5 mb-4" />
                  
                  {/* Debug indicator - shows scroll detection status */}
                  <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
                    <span>Progress: {scrollProgress}%</span>
                    <span>|</span>
                    <span>Reached bottom: {scrolledToBottom ? 'Yes ✓' : 'No'}</span>
                    <span>|</span>
                    <span>Confirmed: {confirmedRead ? 'Yes ✓' : 'No'}</span>
                  </div>
                  <ScrollArea 
                    ref={scrollRef as any}
                    className="h-[70vh] border-2 rounded-xl bg-white dark:bg-zinc-900 shadow-inner"
                  >
                    <div className="p-8 md:p-12">
                      <AgreementViewer
                        content={renderedContent}
                        keyTerms={template?.key_terms || []}
                        keyTermsChecked={keyTermsChecked}
                        onKeyTermCheck={handleKeyTermCheck}
                      />
                    </div>
                  </ScrollArea>
                  
                  {/* Explicit Read Confirmation - Only appears after scrolling to bottom */}
                  {scrolledToBottom && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/5"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          id="confirmRead"
                          checked={confirmedRead}
                          onCheckedChange={(checked) => {
                            const isChecked = checked === true;
                            setConfirmedRead(isChecked);
                            if (isChecked) {
                              setConfirmedReadAt(new Date().toISOString());
                              auditLog.logReadConfirmed();
                            }
                          }}
                          className="mt-0.5 h-5 w-5"
                        />
                        <div className="flex-1">
                          <Label htmlFor="confirmRead" className="text-sm font-medium cursor-pointer leading-relaxed">
                            I confirm that I have read and reviewed the entire Service Agreement presented above
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            This confirms your acknowledgment as required by Section 15 (Entire Agreement Displayed; Assent Record)
                          </p>
                        </div>
                        {confirmedRead && (
                          <Badge className="bg-emerald-500/20 text-emerald-600 border-0 flex-shrink-0">
                            <Check className="h-3 w-3 mr-1" /> Confirmed
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>{keyTermsCompleteCount} terms acknowledged inline</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-4">
                    <Button variant="outline" onClick={() => handleStepChange(2)}>
                      Back
                    </Button>
                    <Button
                      onClick={() => handleStepChange(4)}
                      disabled={!step3Complete}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
                    >
                      {!scrolledToBottom ? 'Scroll to continue' : !confirmedRead ? 'Confirm you read the agreement' : 'Continue to Terms'}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* Step 4: Key Terms + Initials - Enhanced */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-blue-500/20">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <ListChecks className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Key Financial Terms</h2>
                      <p className="text-sm text-muted-foreground">Acknowledge each term and provide your initials</p>
                    </div>
                    <div className="ml-auto">
                      <Badge variant={allKeyTermsChecked ? 'default' : 'outline'} className={allKeyTermsChecked ? 'bg-emerald-500/20 text-emerald-600 border-0' : ''}>
                        {keyTermsCompleteCount}/{template?.key_terms?.length || 0} Terms
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Key Terms Accordion */}
                  <div className="space-y-3 mb-8">
                    <Accordion type="single" collapsible className="space-y-3">
                      {template?.key_terms.map((term, index) => {
                        const isChecked = keyTermsChecked[term.id]?.checked;
                        const checkedAt = keyTermsChecked[term.id]?.checked_at;
                        return (
                          <AccordionItem 
                            key={term.id} 
                            value={term.id}
                            className={`border rounded-xl overflow-hidden transition-all ${
                              isChecked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'
                            }`}
                          >
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                              <div className="flex items-center gap-3 text-left flex-1">
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleKeyTermCheck(term.id, !isChecked);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    className="pointer-events-none"
                                  />
                                </div>
                                <span className={`font-medium ${isChecked ? 'text-emerald-600' : ''}`}>
                                  {index + 1}. {term.label}
                                </span>
                                {isChecked && checkedAt && (
                                  <Badge variant="outline" className="ml-auto mr-4 text-xs border-emerald-500/30 text-emerald-600">
                                    {format(new Date(checkedAt), 'h:mm:ss a')}
                                  </Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <p className="text-sm text-muted-foreground ml-9 mb-3">
                                {term.description}
                              </p>
                              {!isChecked && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleKeyTermCheck(term.id, true)}
                                  className="ml-9"
                                >
                                  <Check className="h-3 w-3 mr-2" />
                                  I Acknowledge
                                </Button>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                  
                  {/* Initials Sections */}
                  <div className="border-t pt-8 mb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <h3 className="text-lg font-semibold">
                        Critical Provisions <span className="text-blue-500">- Initials Required</span>
                      </h3>
                      <Badge variant="outline" className={initialsCompleteCount === INITIALS_SECTIONS.length ? 'bg-emerald-500/20 text-emerald-600 border-0' : ''}>
                        {initialsCompleteCount}/{INITIALS_SECTIONS.length} Complete
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      Your initials must match your name: <span className="font-semibold text-foreground">{expectedInitials || '—'}</span>
                    </p>
                    
                    <div className="space-y-4">
                      {INITIALS_SECTIONS.map((section) => (
                        <InitialsSection
                          key={section.id}
                          id={section.id}
                          title={section.title}
                          description={section.description}
                          icon={section.icon}
                          variant={section.variant}
                          required
                          expectedInitials={expectedInitials}
                          maxLength={Math.max(2, Math.min(3, expectedInitials.length || 3))}
                          value={auditLog.initialsSections[section.id as keyof InitialsSectionsCompleted]}
                          typingValue={initialsTyping[section.id] || ''}
                          error={initialsErrors[section.id]}
                          onInitialsChange={handleInitialsChange}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => handleStepChange(3)}>
                      Back
                    </Button>
                    <Button
                      onClick={() => handleStepChange(5)}
                      disabled={!step4Complete}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
                    >
                      Continue to Signature
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* Step 5: Signature */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <PenTool className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Sign Agreement</h2>
                      <p className="text-sm text-muted-foreground">Complete your legally binding signature</p>
                    </div>
                  </div>
                  
                  {/* Client Signature */}
                  
                  {/* Signature Canvas */}
                  <div className="mb-6">
                    <Label className="mb-2 block font-medium">Draw Your Signature</Label>
                    <div className="border-2 border-dashed rounded-xl bg-white dark:bg-zinc-900 relative overflow-hidden">
                      <SignatureCanvas
                        ref={signatureRef}
                        canvasProps={{
                          className: 'w-full h-56 rounded-xl cursor-crosshair',
                          style: { width: '100%', height: '220px' }
                        }}
                        onBegin={handleSignatureStart}
                        onEnd={handleSignatureEnd}
                        penColor="#000"
                      />
                      {!hasDrawnSignature && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center">
                            <Pencil className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm">Draw your signature here</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      {signatureStartedAt && (
                        <span className="text-xs text-muted-foreground">
                          Started at {format(new Date(signatureStartedAt), 'h:mm:ss a')}
                        </span>
                      )}
                      <Button variant="ghost" size="sm" onClick={clearSignature} className="ml-auto">
                        <Eraser className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Typed Signature */}
                  <div className="mb-6">
                    <Label htmlFor="typedSignature" className="font-medium">Type Your Full Legal Name *</Label>
                    <Input
                      id="typedSignature"
                      value={typedSignature}
                      onChange={(e) => {
                        handleTypedSignatureChange(e.target.value);
                        handlePrintedNameChange(e.target.value);
                      }}
                      placeholder="Type your full name"
                      className="mt-1.5 font-serif italic text-lg"
                    />
                    {typedSignature && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                        <p style={{ fontFamily: "'Dancing Script', cursive" }} className="text-2xl text-primary">{typedSignature}</p>
                      </div>
                    )}
                  </div>

                  {/* Electronic Intent */}
                  <div className="p-5 rounded-xl border bg-blue-500/5 border-blue-500/20 mb-8">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="electronicIntent"
                        checked={electronicIntent}
                        onCheckedChange={(checked) => handleElectronicIntentChange(!!checked)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label htmlFor="electronicIntent" className="cursor-pointer text-sm leading-relaxed">
                          I intend to sign this agreement electronically, and I understand that my electronic
                          signature has the same legal effect as a handwritten signature. <span className="text-muted-foreground">(UETA/ESIGN Act Acknowledgment)</span>
                        </Label>
                        {electronicIntentAt && (
                          <p className="text-xs text-emerald-600 mt-1">
                            <Check className="h-3 w-3 inline mr-1" />
                            Accepted at {format(new Date(electronicIntentAt), 'h:mm:ss a')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Audit Info */}
                  <div className="bg-muted/30 rounded-xl p-4 mb-8">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Signing Audit Trail
                    </h4>
                    <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="font-medium text-foreground mb-1">IP Address</p>
                        <p>{ipAddress || 'Capturing...'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Location</p>
                        <p>{geoLocation.city && geoLocation.region ? `${geoLocation.city}, ${geoLocation.region}` : 'Detecting...'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Session</p>
                        <p className="font-mono">{sessionId.slice(0, 16)}...</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Time on Page</p>
                        <p>{Math.floor(timeOnPageSeconds / 60)}m {timeOnPageSeconds % 60}s</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs">
                        <span className="font-medium text-foreground">Events Logged:</span>{' '}
                        {auditLog.auditEvents.length} actions recorded
                      </p>
                    </div>
                  </div>
                  
                  {/* Submit */}
                  <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => handleStepChange(4)}>
                      Back
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleSubmit}
                      disabled={!canSign || isSubmitting}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-8"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Signing & Generating PDF...
                        </>
                      ) : (
                        <>
                          <PenTool className="h-5 w-5 mr-2" />
                          Sign & Complete
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    By clicking "Sign & Complete", you agree to be legally bound by this agreement. 
                    A signed PDF with full audit certificate will be generated.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
