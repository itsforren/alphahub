import { useState, useCallback, useRef } from 'react';

export interface AuditEvent {
  action: string;
  timestamp: string;
  ip_address: string | null;
  user_agent: string;
  metadata?: Record<string, any>;
}

export interface InitialsSectionData {
  initials: string;
  timestamp: string;
  ip_address: string | null;
}

export interface InitialsSectionsCompleted {
  no_refunds?: InitialsSectionData;
  chargebacks?: InitialsSectionData;
  arbitration?: InitialsSectionData;
  ip_no_copying?: InitialsSectionData;
  personal_guarantee?: InitialsSectionData;
}

export function useAuditLog(ipAddress: string | null, userAgent: string) {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [initialsSections, setInitialsSections] = useState<InitialsSectionsCompleted>({});
  
  const logEvent = useCallback((action: string, metadata?: Record<string, any>) => {
    const event: AuditEvent = {
      action,
      timestamp: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
    };
    
    setAuditEvents(prev => [...prev, event]);
    console.log('[Audit]', action, metadata);
    
    return event;
  }, [ipAddress, userAgent]);

  const logInitialsSection = useCallback((
    sectionId: keyof InitialsSectionsCompleted, 
    initials: string
  ) => {
    const data: InitialsSectionData = {
      initials: initials.toUpperCase(),
      timestamp: new Date().toISOString(),
      ip_address: ipAddress,
    };
    
    setInitialsSections(prev => ({
      ...prev,
      [sectionId]: data,
    }));
    
    logEvent(`initials_${sectionId}_completed`, { initials: data.initials });
    
    return data;
  }, [ipAddress, logEvent]);

  // Pre-defined event loggers for common actions
  const logOtpSendRequested = useCallback((phone: string) => {
    return logEvent('otp_send_requested', { phone_masked: phone.slice(-4) });
  }, [logEvent]);

  const logOtpVerified = useCallback((verifiedAt: string) => {
    return logEvent('otp_verified', { verified_at: verifiedAt });
  }, [logEvent]);

  const logStepCompleted = useCallback((stepNumber: number, stepName: string) => {
    return logEvent('step_completed', { step: stepNumber, name: stepName });
  }, [logEvent]);

  const logKeyTermChecked = useCallback((termId: string, termLabel: string, checked: boolean) => {
    return logEvent('key_term_toggled', { term_id: termId, term_label: termLabel, checked });
  }, [logEvent]);

  const logScrolledToBottom = useCallback(() => {
    return logEvent('scrolled_to_bottom');
  }, [logEvent]);

  const logReadConfirmed = useCallback(() => {
    return logEvent('read_confirmed', { confirmation: 'User explicitly confirmed reading the full agreement' });
  }, [logEvent]);

  const logElectronicIntentAccepted = useCallback(() => {
    return logEvent('electronic_intent_accepted');
  }, [logEvent]);

  const logSignatureStarted = useCallback(() => {
    return logEvent('signature_canvas_first_stroke');
  }, [logEvent]);

  const logSignatureCleared = useCallback(() => {
    return logEvent('signature_canvas_cleared');
  }, [logEvent]);

  const logSignatureCompleted = useCallback(() => {
    return logEvent('signature_completed');
  }, [logEvent]);

  const logTypedSignatureEntered = useCallback((name: string) => {
    return logEvent('typed_signature_entered', { name_length: name.length });
  }, [logEvent]);

  const logPrintedNameEntered = useCallback((name: string) => {
    return logEvent('printed_name_entered', { name });
  }, [logEvent]);

  const logFinalSubmitClicked = useCallback(() => {
    return logEvent('final_submit_clicked');
  }, [logEvent]);

  const logAgreementSigned = useCallback((agreementId: string) => {
    return logEvent('agreement_signed_successfully', { agreement_id: agreementId });
  }, [logEvent]);

  return {
    auditEvents,
    initialsSections,
    logEvent,
    logInitialsSection,
    logOtpSendRequested,
    logOtpVerified,
    logStepCompleted,
    logKeyTermChecked,
    logScrolledToBottom,
    logReadConfirmed,
    logElectronicIntentAccepted,
    logSignatureStarted,
    logSignatureCleared,
    logSignatureCompleted,
    logTypedSignatureEntered,
    logPrintedNameEntered,
    logFinalSubmitClicked,
    logAgreementSigned,
  };
}
