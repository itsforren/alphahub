import SHA256 from 'crypto-js/sha256';
import { format } from 'date-fns';
import type { AuditEvent, InitialsSectionsCompleted } from '@/hooks/useAuditLog';
import type { KeyTermCheckboxState } from '@/hooks/useAgreement';

interface PdfGenerationParams {
  // Agreement content
  agreementContent: string;
  templateName: string;
  templateVersion: string;
  
  // Signer info
  signerFullName: string;
  signerEmail: string;
  signerPhone: string;
  signerAddress: string;
  signerNpn: string;
  signerLicenseStates: string[];
  
  // OTP verification
  otpVerified: boolean;
  otpVerifiedAt: string | null;
  
  // Key terms
  keyTermsCheckboxes: Record<string, KeyTermCheckboxState>;
  keyTermsLabels: Record<string, string>;
  
  // Initials sections
  initialsSections: InitialsSectionsCompleted;
  
  // Signature data
  signatureDataUrl: string | null;
  typedSignature: string;
  printedName: string;
  electronicIntentAccepted: boolean;
  electronicIntentAcceptedAt: string | null;
  
  // Audit data
  signedAt: string;
  ipAddress: string | null;
  userAgent: string;
  sessionId: string;
  geolocationCity: string | null;
  geolocationRegion: string | null;
  timeOnPageSeconds: number;
  scrolledToBottom: boolean;
  scrolledToBottomAt: string | null;
  readConfirmed: boolean;
  readConfirmedAt: string | null;
  focusEvents: any[];
  auditEvents: AuditEvent[];
  platformOs: string;
  screenResolution: string;
  languageLocale: string;
  referrerUrl: string;
  utmParams: Record<string, string>;
}

// Authorized Representative info
const AUTHORIZED_REP = {
  name: 'Forren Warren',
  title: 'Chief Executive Officer',
  company: 'Alpha Agent Marketing LLC',
};

// Base64 encoded Alpha Agent logo (placeholder - will be loaded from file)
// We'll embed the logo as base64 for reliability in PDF generation

export async function generateAgreementPdf(params: PdfGenerationParams): Promise<{ blob: Blob; hash: string }> {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = margin;

  // Load logo and authorized rep signature
  let logoBase64: string | null = null;
  let authRepSignatureBase64: string | null = null;
  
  try {
    // Fetch square logo from public folder
    const logoResponse = await fetch('/favicon.png');
    if (logoResponse.ok) {
      const logoBlob = await logoResponse.blob();
      logoBase64 = await blobToBase64(logoBlob);
    }
  } catch (e) {
    console.warn('Could not load logo:', e);
  }

  try {
    // Fetch authorized rep signature
    const sigResponse = await fetch('/forren-warren-signature.png');
    if (sigResponse.ok) {
      const sigBlob = await sigResponse.blob();
      authRepSignatureBase64 = await blobToBase64(sigBlob);
    }
  } catch (e) {
    console.warn('Could not load authorized signature:', e);
  }

  // Helper function to convert blob to base64
  async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Helper functions
  const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: string; maxWidth?: number; align?: 'left' | 'center' | 'right'; color?: number[] }) => {
    const { fontSize = 10, fontStyle = 'normal', maxWidth = contentWidth, align = 'left', color = [0, 0, 0] } = options || {};
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    pdf.setTextColor(color[0], color[1], color[2]);
    
    if (align === 'center') {
      const textWidth = pdf.getTextWidth(text);
      x = (pageWidth - textWidth) / 2;
    } else if (align === 'right') {
      const textWidth = pdf.getTextWidth(text);
      x = pageWidth - margin - textWidth;
    }
    
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    pdf.setTextColor(0, 0, 0);
    return lines.length * (fontSize * 0.4);
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
      addPageHeader();
      return true;
    }
    return false;
  };

  const addPageHeader = () => {
    // Simple header line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 12, pageWidth - margin, 12);
    addText('ALPHA AGENT MARKETING', margin, 10, { fontSize: 8, fontStyle: 'bold' });
    addText('SERVICE AGREEMENT', pageWidth - margin, 10, { fontSize: 8, align: 'right' });
  };

  const addSectionHeader = (title: string) => {
    checkPageBreak(15);
    currentY += 8;
    pdf.setFillColor(30, 30, 30);
    // Rounded rectangle for section header
    pdf.roundedRect(margin, currentY - 4, contentWidth, 7, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 4, currentY);
    pdf.setTextColor(0, 0, 0);
    currentY += 10;
  };

  const addCheckbox = (checked: boolean, x: number, y: number, size: number = 4) => {
    pdf.setDrawColor(60, 60, 60);
    pdf.setLineWidth(0.4);
    // Rounded checkbox
    pdf.roundedRect(x, y - size + 1, size, size, 0.8, 0.8);
    if (checked) {
      pdf.setFillColor(30, 30, 30);
      pdf.roundedRect(x + 0.6, y - size + 1.6, size - 1.2, size - 1.2, 0.5, 0.5, 'F');
    }
  };

  // ===== PAGE 1: COVER PAGE =====
  currentY = 35;
  
  // Logo at top - square logo
  if (logoBase64) {
    try {
      const logoSize = 30;
      pdf.addImage(logoBase64, 'PNG', (pageWidth - logoSize) / 2, 18, logoSize, logoSize);
      currentY = 55;
    } catch (e) {
      // Fallback text logo
      addText('ALPHA AGENT', margin, currentY, { fontSize: 24, fontStyle: 'bold', align: 'center' });
      currentY += 12;
    }
  } else {
    addText('ALPHA AGENT', margin, currentY, { fontSize: 24, fontStyle: 'bold', align: 'center' });
    currentY += 12;
  }

  currentY += 15;
  
  // Title
  addText('SERVICE AGREEMENT', margin, currentY, { fontSize: 22, fontStyle: 'bold', align: 'center' });
  currentY += 25;
  
  // Decorative line
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(1);
  pdf.line(margin + 50, currentY, pageWidth - margin - 50, currentY);
  currentY += 20;
  
  // Agreement details
  addText('AGREEMENT DETAILS', margin, currentY, { fontSize: 11, fontStyle: 'bold' });
  currentY += 8;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, currentY, margin + 45, currentY);
  currentY += 8;
  
  addText(`Template: ${params.templateName}`, margin, currentY, { fontSize: 10 });
  currentY += 6;
  addText(`Version: ${params.templateVersion}`, margin, currentY, { fontSize: 10 });
  currentY += 6;
  addText(`Execution Date: ${format(new Date(params.signedAt), "MMMM d, yyyy")}`, margin, currentY, { fontSize: 10 });
  currentY += 6;
  addText(`Execution Time: ${format(new Date(params.signedAt), "h:mm:ss a")}`, margin, currentY, { fontSize: 10 });
  currentY += 15;
  
  // Parties section
  addText('PARTIES TO THIS AGREEMENT', margin, currentY, { fontSize: 11, fontStyle: 'bold' });
  currentY += 8;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, currentY, margin + 58, currentY);
  currentY += 10;
  
  // Company box - rounded
  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, currentY, (contentWidth - 10) / 2, 45, 3, 3);
  
  addText('COMPANY', margin + 5, currentY + 8, { fontSize: 9, fontStyle: 'bold', color: [100, 100, 100] });
  addText('Alpha Agent Marketing LLC', margin + 5, currentY + 16, { fontSize: 11, fontStyle: 'bold' });
  addText('(hereinafter referred to as "Company")', margin + 5, currentY + 23, { fontSize: 8, color: [100, 100, 100] });
  addText('Authorized Representative:', margin + 5, currentY + 32, { fontSize: 8 });
  addText(AUTHORIZED_REP.name, margin + 5, currentY + 38, { fontSize: 9, fontStyle: 'bold' });
  
  // Client box - rounded
  const clientBoxX = margin + (contentWidth - 10) / 2 + 10;
  pdf.roundedRect(clientBoxX, currentY, (contentWidth - 10) / 2, 45, 3, 3);
  
  addText('CLIENT', clientBoxX + 5, currentY + 8, { fontSize: 9, fontStyle: 'bold', color: [100, 100, 100] });
  addText(params.signerFullName, clientBoxX + 5, currentY + 16, { fontSize: 11, fontStyle: 'bold' });
  addText('(hereinafter referred to as "Client")', clientBoxX + 5, currentY + 23, { fontSize: 8, color: [100, 100, 100] });
  addText(params.signerEmail, clientBoxX + 5, currentY + 32, { fontSize: 8 });
  addText(params.signerPhone, clientBoxX + 5, currentY + 38, { fontSize: 8 });
  
  currentY += 60;
  
  // Document ID
  addText('Document ID', margin, currentY, { fontSize: 8, fontStyle: 'bold', color: [100, 100, 100] });
  currentY += 5;
  const contentHash = SHA256(params.agreementContent).toString();
  addText(contentHash.substring(0, 32) + '...', margin, currentY, { fontSize: 7, color: [100, 100, 100] });
  
  // Footer
  currentY = pageHeight - 25;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;
  addText('This document is legally binding upon electronic signature acceptance.', margin, currentY, { fontSize: 8, align: 'center', color: [100, 100, 100] });
  currentY += 5;
  addText('Page 1', margin, currentY, { fontSize: 8, align: 'center', color: [150, 150, 150] });

  // ===== PAGE 2+: AGREEMENT CONTENT WITH CHECKBOXES & INITIALS =====
  pdf.addPage();
  currentY = 20;
  addPageHeader();
  currentY = 25;
  
  addSectionHeader('TERMS AND CONDITIONS');
  
  // Parse and render agreement content with embedded checkboxes
  const contentLines = params.agreementContent.split('\n');
  let pageNum = 2;
  
  // Track which key terms and initials sections have already been marked (prevents duplicates)
  const markedTerms = new Set<string>();
  const markedInitials = new Set<string>();
  
  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];
    
    if (line.trim() === '') {
      currentY += 3;
      continue;
    }
    
    if (checkPageBreak(10)) {
      pageNum++;
    }
    
    // Check if this line matches any key term description (for checkbox display)
    let foundTerm: { id: string; checked: boolean; checkedAt: string } | null = null;
    for (const [termId, state] of Object.entries(params.keyTermsCheckboxes)) {
      if (!markedTerms.has(termId)) {
        const label = params.keyTermsLabels[termId] || '';
        // Check if line contains the term label or description
        if (line.toLowerCase().includes(label.toLowerCase().substring(0, 20)) && label.length > 5) {
          foundTerm = { id: termId, checked: state.checked, checkedAt: state.checked_at };
          markedTerms.add(termId);
          break;
        }
      }
    }
    
    // Check if it's a section that requires initials - only mark ONCE per section
    let matchedInitials: { sectionId: string; initials: string } | null = null;
    const initialsKeywords: Record<string, string[]> = {
      no_refunds: ['all fees paid are non-refundable', 'no refunds will be issued'],
      chargebacks: ['chargeback fee of $250', 'chargebacks are prohibited'],
      arbitration: ['binding arbitration', 'waive their right to participate in a class action'],
      ip_no_copying: ['proprietary systems', 'intellectual property', 'not copy, replicate'],
      personal_guarantee: ['personally guarantee', 'personal guarantee'],
    };
    
    for (const [sectionId, keywords] of Object.entries(initialsKeywords)) {
      // Only mark once per section ID
      if (markedInitials.has(sectionId)) continue;
      
      const sectionData = params.initialsSections[sectionId as keyof InitialsSectionsCompleted];
      if (sectionData && keywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))) {
        matchedInitials = { sectionId, initials: sectionData.initials };
        markedInitials.add(sectionId);
        break;
      }
    }
    
    // Check if it's a header (all caps or starts with number)
    const isHeader = /^[0-9]+\.\s+[A-Z]/.test(line.trim()) || 
                     (/^[A-Z\s]{5,}$/.test(line.trim()) && line.trim().length < 60);
    
    if (foundTerm) {
      // Render with checkbox
      checkPageBreak(12);
      addCheckbox(foundTerm.checked, margin, currentY, 4);
      const height = addText(line, margin + 7, currentY, { 
        fontSize: 9, 
        maxWidth: contentWidth - 10 
      });
      currentY += Math.max(height, 5) + 3;
    } else if (matchedInitials) {
      // Render with initials box - rounded design
      checkPageBreak(15);
      const height = addText(line, margin, currentY, { 
        fontSize: 9, 
        maxWidth: contentWidth - 25 
      });
      // Draw rounded initials box
      pdf.setDrawColor(60, 60, 60);
      pdf.setLineWidth(0.4);
      const boxX = pageWidth - margin - 18;
      const boxY = currentY - 4;
      pdf.roundedRect(boxX, boxY, 15, 8, 1.5, 1.5);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bolditalic');
      pdf.text(matchedInitials.initials, boxX + 7.5, boxY + 5.5, { align: 'center' });
      currentY += Math.max(height, 8) + 3;
    } else if (isHeader) {
      currentY += 3;
      addText(line, margin, currentY, { fontSize: 11, fontStyle: 'bold' });
      currentY += 6;
    } else {
      const height = addText(line, margin, currentY, { 
        fontSize: 9, 
        maxWidth: contentWidth 
      });
      currentY += height + 2;
    }
  }
  
  // ===== ACCEPTED AND AGREED PAGE =====
  pdf.addPage();
  pageNum++;
  currentY = 20;
  addPageHeader();
  currentY = 30;
  
  addSectionHeader('ACCEPTED AND AGREED');
  
  currentY += 5;
  addText('By signing below, each party acknowledges that they have read, understood, and agree to be bound', margin, currentY, { fontSize: 9 });
  currentY += 5;
  addText('by all terms and conditions set forth in this Service Agreement.', margin, currentY, { fontSize: 9 });
  currentY += 15;
  
  // Two-column signature layout
  const colWidth = (contentWidth - 15) / 2;
  const leftColX = margin;
  const rightColX = margin + colWidth + 15;
  
  // Company signature (left column)
  addText('COMPANY', leftColX, currentY, { fontSize: 9, fontStyle: 'bold', color: [100, 100, 100] });
  addText('CLIENT', rightColX, currentY, { fontSize: 9, fontStyle: 'bold', color: [100, 100, 100] });
  currentY += 8;
  
  addText('Alpha Agent Marketing LLC', leftColX, currentY, { fontSize: 11, fontStyle: 'bold' });
  addText(params.signerFullName, rightColX, currentY, { fontSize: 11, fontStyle: 'bold' });
  currentY += 15;
  
  // Signature lines
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(leftColX, currentY + 20, leftColX + colWidth - 5, currentY + 20);
  pdf.line(rightColX, currentY + 20, rightColX + colWidth - 5, currentY + 20);
  
  // Add authorized rep signature
  if (authRepSignatureBase64) {
    try {
      pdf.addImage(authRepSignatureBase64, 'PNG', leftColX, currentY - 5, 50, 20);
    } catch (e) {
      addText('/s/ ' + AUTHORIZED_REP.name, leftColX, currentY + 10, { fontSize: 12, fontStyle: 'italic' });
    }
  } else {
    addText('/s/ ' + AUTHORIZED_REP.name, leftColX, currentY + 10, { fontSize: 12, fontStyle: 'italic' });
  }
  
  // Add client signature
  if (params.signatureDataUrl) {
    try {
      pdf.addImage(params.signatureDataUrl, 'PNG', rightColX, currentY - 5, 50, 20);
    } catch (e) {
      addText('/s/ ' + params.typedSignature, rightColX, currentY + 10, { fontSize: 12, fontStyle: 'italic' });
    }
  } else if (params.typedSignature) {
    addText('/s/ ' + params.typedSignature, rightColX, currentY + 10, { fontSize: 12, fontStyle: 'italic' });
  }
  
  currentY += 25;
  
  addText('Signature', leftColX, currentY, { fontSize: 8, color: [100, 100, 100] });
  addText('Signature', rightColX, currentY, { fontSize: 8, color: [100, 100, 100] });
  currentY += 12;
  
  // Printed names
  pdf.line(leftColX, currentY + 8, leftColX + colWidth - 5, currentY + 8);
  pdf.line(rightColX, currentY + 8, rightColX + colWidth - 5, currentY + 8);
  
  addText(AUTHORIZED_REP.name, leftColX, currentY + 4, { fontSize: 10 });
  addText(params.printedName, rightColX, currentY + 4, { fontSize: 10 });
  currentY += 12;
  
  addText('Print Name', leftColX, currentY, { fontSize: 8, color: [100, 100, 100] });
  addText('Print Name', rightColX, currentY, { fontSize: 8, color: [100, 100, 100] });
  currentY += 12;
  
  // Titles
  pdf.line(leftColX, currentY + 8, leftColX + colWidth - 5, currentY + 8);
  pdf.line(rightColX, currentY + 8, rightColX + colWidth - 5, currentY + 8);
  
  addText(AUTHORIZED_REP.title, leftColX, currentY + 4, { fontSize: 10 });
  addText('Client / Insurance Agent', rightColX, currentY + 4, { fontSize: 10 });
  currentY += 12;
  
  addText('Title', leftColX, currentY, { fontSize: 8, color: [100, 100, 100] });
  addText('Title', rightColX, currentY, { fontSize: 8, color: [100, 100, 100] });
  currentY += 12;
  
  // Date/Time - USING THE FINAL signedAt TIMESTAMP
  pdf.line(leftColX, currentY + 8, leftColX + colWidth - 5, currentY + 8);
  pdf.line(rightColX, currentY + 8, rightColX + colWidth - 5, currentY + 8);
  
  // Both parties show the same execution timestamp (the final signature moment)
  const executionDateTime = format(new Date(params.signedAt), "MMMM d, yyyy 'at' h:mm:ss a");
  addText(executionDateTime, leftColX, currentY + 4, { fontSize: 9 });
  addText(executionDateTime, rightColX, currentY + 4, { fontSize: 9 });
  currentY += 12;
  
  addText('Date/Time', leftColX, currentY, { fontSize: 8, color: [100, 100, 100] });
  addText('Date/Time', rightColX, currentY, { fontSize: 8, color: [100, 100, 100] });
  currentY += 20;
  
  // Electronic consent notice - rounded
  pdf.setFillColor(245, 245, 245);
  pdf.roundedRect(margin, currentY, contentWidth, 20, 3, 3, 'F');
  currentY += 6;
  addText('ELECTRONIC SIGNATURE CONSENT', margin + 5, currentY, { fontSize: 8, fontStyle: 'bold' });
  currentY += 5;
  addText('Both parties consent to the use of electronic signatures pursuant to the Electronic Signatures in Global', margin + 5, currentY, { fontSize: 7 });
  currentY += 4;
  addText('and National Commerce Act (E-SIGN Act) and the Uniform Electronic Transactions Act (UETA).', margin + 5, currentY, { fontSize: 7 });
  
  // ===== AUDIT CERTIFICATE =====
  pdf.addPage();
  pageNum++;
  currentY = 20;
  
  // Black header bar
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, 0, pageWidth, 35, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ELECTRONIC SIGNATURE AUDIT CERTIFICATE', margin, 15);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Tamper-evident record of electronic signing process', margin, 23);
  pdf.text(`Certificate ID: ${params.sessionId.substring(0, 16)}`, margin, 30);
  pdf.setTextColor(0, 0, 0);
  
  currentY = 45;
  
  // Document Integrity
  addSectionHeader('DOCUMENT INTEGRITY');
  addText('SHA-256 Content Hash:', margin, currentY, { fontSize: 8, fontStyle: 'bold' });
  currentY += 5;
  addText(contentHash, margin, currentY, { fontSize: 7, color: [80, 80, 80] });
  currentY += 8;
  addText(`Certificate Generated: ${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")}`, margin, currentY, { fontSize: 8 });
  currentY += 10;
  
  // Signer Verification
  addSectionHeader('SIGNER VERIFICATION');
  const signerRows = [
    ['Full Legal Name', params.signerFullName],
    ['Email Address', params.signerEmail],
    ['Phone Number', params.signerPhone],
    ['Business Address', params.signerAddress],
    ['NPN', params.signerNpn || 'Not provided'],
    ['Licensed States', params.signerLicenseStates.join(', ') || 'Not provided'],
  ];
  
  for (const [label, value] of signerRows) {
    addText(`${label}:`, margin, currentY, { fontSize: 8, fontStyle: 'bold' });
    addText(value, margin + 40, currentY, { fontSize: 8 });
    currentY += 5;
  }
  currentY += 5;
  
  // Identity Verification
  addSectionHeader('IDENTITY VERIFICATION');
  addText(`Phone OTP Verified: ${params.otpVerified ? 'YES ✓' : 'NO'}`, margin, currentY, { fontSize: 9, fontStyle: 'bold' });
  currentY += 5;
  if (params.otpVerifiedAt) {
    addText(`Verification Timestamp: ${format(new Date(params.otpVerifiedAt), "MMMM d, yyyy 'at' h:mm:ss a")}`, margin, currentY, { fontSize: 8 });
    currentY += 5;
  }
  currentY += 5;
  
  // Key Terms Acknowledgment
  addSectionHeader('KEY TERMS ACKNOWLEDGMENT');
  checkPageBreak(50);
  
  const sortedTerms = Object.entries(params.keyTermsCheckboxes)
    .sort((a, b) => new Date(a[1].checked_at).getTime() - new Date(b[1].checked_at).getTime());
  
  for (const [termId, state] of sortedTerms) {
    checkPageBreak(8);
    const label = params.keyTermsLabels[termId] || termId;
    addCheckbox(state.checked, margin, currentY, 3.5);
    addText(label, margin + 6, currentY, { fontSize: 8, fontStyle: 'bold' });
    const timeStr = format(new Date(state.checked_at), 'h:mm:ss a');
    addText(`Acknowledged at ${timeStr}`, pageWidth - margin - 40, currentY, { fontSize: 7, color: [100, 100, 100] });
    currentY += 6;
  }
  currentY += 5;
  
  // Initials Acknowledgments
  addSectionHeader('INITIALS ACKNOWLEDGMENTS');
  const initialsLabels: Record<string, string> = {
    no_refunds: 'No Refunds / Ad Spend Non-Refundable',
    chargebacks: 'Chargebacks Prohibited + $250 Fee',
    arbitration: 'Arbitration / Class Action Waiver',
    ip_no_copying: 'IP Protection / No Copying',
    personal_guarantee: 'Personal Guarantee',
  };
  
  for (const [sectionId, data] of Object.entries(params.initialsSections)) {
    if (data) {
      checkPageBreak(8);
      const label = initialsLabels[sectionId] || sectionId;
      // Draw rounded initials box
      pdf.setDrawColor(60, 60, 60);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(margin, currentY - 3.5, 12, 5, 1, 1);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bolditalic');
      pdf.text(data.initials, margin + 6, currentY, { align: 'center' });
      
      addText(label, margin + 15, currentY, { fontSize: 8 });
      addText(`${format(new Date(data.timestamp), 'h:mm:ss a')}`, pageWidth - margin - 25, currentY, { fontSize: 7, color: [100, 100, 100] });
      currentY += 7;
    }
  }
  currentY += 5;
  
  // Electronic Intent
  checkPageBreak(25);
  addSectionHeader('ELECTRONIC SIGNATURE CONSENT');
  addText(`E-SIGN Act / UETA Consent: ${params.electronicIntentAccepted ? 'ACCEPTED ✓' : 'NOT ACCEPTED'}`, margin, currentY, { fontSize: 9, fontStyle: 'bold' });
  currentY += 5;
  if (params.electronicIntentAcceptedAt) {
    addText(`Consent Timestamp: ${format(new Date(params.electronicIntentAcceptedAt), "MMMM d, yyyy 'at' h:mm:ss a")}`, margin, currentY, { fontSize: 8 });
    currentY += 8;
  }
  
  // Signature capture
  checkPageBreak(45);
  addSectionHeader('SIGNATURE CAPTURE');
  
  if (params.signatureDataUrl) {
    try {
      currentY += 2;
      pdf.addImage(params.signatureDataUrl, 'PNG', margin, currentY, 60, 20);
      currentY += 25;
    } catch (e) {
      addText('[Signature image embedded]', margin, currentY, { fontSize: 9 });
      currentY += 8;
    }
  }
  
  if (params.typedSignature) {
    addText(`Typed Signature: ${params.typedSignature}`, margin, currentY, { fontSize: 9, fontStyle: 'italic' });
    currentY += 5;
  }
  addText(`Printed Name: ${params.printedName}`, margin, currentY, { fontSize: 9 });
  currentY += 5;
  addText(`Execution Timestamp: ${format(new Date(params.signedAt), "MMMM d, yyyy 'at' h:mm:ss a")}`, margin, currentY, { fontSize: 9, fontStyle: 'bold' });
  currentY += 10;
  
  // Technical Audit Trail
  checkPageBreak(80);
  addSectionHeader('TECHNICAL AUDIT TRAIL');
  
  const techInfo = [
    ['IP Address', params.ipAddress || 'Unknown'],
    ['Session ID', params.sessionId],
    ['User Agent', params.userAgent.substring(0, 70) + (params.userAgent.length > 70 ? '...' : '')],
    ['Platform/OS', params.platformOs],
    ['Screen Resolution', params.screenResolution],
    ['Language/Locale', params.languageLocale],
    ['Geolocation', `${params.geolocationCity || 'Unknown'}, ${params.geolocationRegion || 'Unknown'}`],
    ['Time on Page', `${params.timeOnPageSeconds} seconds`],
    ['Scrolled to Bottom', params.scrolledToBottom ? 'YES' : 'NO'],
    ['Scroll Completed', params.scrolledToBottomAt ? format(new Date(params.scrolledToBottomAt), 'h:mm:ss a') : 'N/A'],
    ['Read Confirmed', params.readConfirmed ? 'YES' : 'NO'],
    ['Read Confirmed At', params.readConfirmedAt ? format(new Date(params.readConfirmedAt), 'h:mm:ss a') : 'N/A'],
    ['Tab Focus Events', String(params.focusEvents.length)],
  ];
  
  for (const [label, value] of techInfo) {
    checkPageBreak(6);
    addText(`${label}:`, margin, currentY, { fontSize: 7, fontStyle: 'bold' });
    addText(value, margin + 35, currentY, { fontSize: 7, maxWidth: contentWidth - 40 });
    currentY += 4.5;
  }
  currentY += 5;
  
  // Complete Event Log
  checkPageBreak(30);
  addSectionHeader('COMPLETE EVENT LOG');
  
  addText(`Total Events: ${params.auditEvents.length}`, margin, currentY, { fontSize: 8, fontStyle: 'bold' });
  currentY += 6;
  
  // Table header - rounded
  pdf.setFillColor(240, 240, 240);
  pdf.roundedRect(margin, currentY - 3, contentWidth, 5, 1, 1, 'F');
  addText('Time', margin + 2, currentY, { fontSize: 7, fontStyle: 'bold' });
  addText('Event', margin + 25, currentY, { fontSize: 7, fontStyle: 'bold' });
  addText('Details', margin + 80, currentY, { fontSize: 7, fontStyle: 'bold' });
  currentY += 5;
  
  for (const event of params.auditEvents) {
    checkPageBreak(6);
    const time = format(new Date(event.timestamp), 'HH:mm:ss');
    const action = event.action.replace(/_/g, ' ');
    const meta = event.metadata ? JSON.stringify(event.metadata).substring(0, 50) : '';
    
    addText(time, margin + 2, currentY, { fontSize: 6 });
    addText(action, margin + 25, currentY, { fontSize: 6, maxWidth: 50 });
    addText(meta, margin + 80, currentY, { fontSize: 6, maxWidth: contentWidth - 85, color: [100, 100, 100] });
    currentY += 4.5;
  }
  
  // Footer
  currentY = pageHeight - 18;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;
  addText('This audit certificate was generated by Alpha Agent Marketing electronic signing system.', margin, currentY, { fontSize: 7, align: 'center', color: [100, 100, 100] });
  currentY += 4;
  addText('Document integrity can be verified using the SHA-256 content hash.', margin, currentY, { fontSize: 7, align: 'center', color: [100, 100, 100] });

  // Generate blob and hash
  const pdfBlob = pdf.output('blob');
  const pdfArrayBuffer = await pdfBlob.arrayBuffer();
  const pdfUint8Array = new Uint8Array(pdfArrayBuffer);
  let binaryString = '';
  for (let i = 0; i < pdfUint8Array.length; i++) {
    binaryString += String.fromCharCode(pdfUint8Array[i]);
  }
  const pdfHash = SHA256(binaryString).toString();
  
  return { blob: pdfBlob, hash: pdfHash };
}
