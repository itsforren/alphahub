import React, { forwardRef, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-react';
import type { KeyTermCheckboxState } from '@/hooks/useAgreement';

interface KeyTerm {
  id: string;
  label: string;
  description: string;
}

interface AgreementViewerProps {
  content: string;
  keyTerms?: KeyTerm[];
  keyTermsChecked: Record<string, KeyTermCheckboxState>;
  onKeyTermCheck: (termId: string, checked: boolean) => void;
}

// Parse agreement content and add inline checkboxes at key sections
export const AgreementViewer = forwardRef<HTMLDivElement, AgreementViewerProps>(
  ({ content, keyTerms = [], keyTermsChecked, onKeyTermCheck }, ref) => {
    
    // Create patterns from key term DESCRIPTIONS (the actual statement text)
    // This ensures deterministic matching on the legal statement, not headers
    const keyTermPatterns = useMemo(() => {
      if (!keyTerms.length) return [];
      
      return keyTerms.map(term => {
        // Use first 40 characters of description for matching
        const matchText = term.description
          .slice(0, 40)
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
          .trim();
        
        return {
          id: term.id,
          label: term.label,
          description: term.description,
          pattern: new RegExp(matchText, 'i'),
        };
      });
    }, [keyTerms]);
    
    // Split content into sections for formatting
    const formatContent = (text: string) => {
      const lines = text.split('\n');
      const elements: React.ReactNode[] = [];
      
      // Track which key terms have already been matched to prevent duplicates
      const matchedTerms = new Set<string>();
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          elements.push(<div key={index} className="h-3" />);
          return;
        }
        
        // Detect headers (numbered sections, all caps, or key headers)
        const isMainHeader = /^[0-9]+\.\s+[A-Z][A-Z\s]+$/.test(trimmedLine) || 
                             /^[A-Z][A-Z\s]{5,}$/.test(trimmedLine);
        const isSubHeader = /^[0-9]+\.[0-9]+/.test(trimmedLine) ||
                            /^[a-z]\)/.test(trimmedLine) ||
                            /^•/.test(trimmedLine);
        const isTitle = /SERVICE AGREEMENT|MASTER AGREEMENT|TERMS AND CONDITIONS/i.test(trimmedLine);
        
        // Check if this line contains any key term DESCRIPTION that hasn't been matched yet
        let matchedKeyTerm: { id: string; label: string; description: string } | null = null;
        for (const pattern of keyTermPatterns) {
          if (!matchedTerms.has(pattern.id) && pattern.pattern.test(trimmedLine)) {
            matchedKeyTerm = pattern;
            matchedTerms.add(pattern.id);
            break;
          }
        }
        
        if (isTitle) {
          elements.push(
            <h1 key={index} className="text-2xl font-bold text-center mb-6 mt-4 text-foreground font-montserrat">
              {trimmedLine}
            </h1>
          );
        } else if (matchedKeyTerm) {
          // This line contains a key term description - add checkbox on THIS line
          const isChecked = keyTermsChecked[matchedKeyTerm.id]?.checked;
          const termId = matchedKeyTerm.id;
          
          elements.push(
            <div 
              key={index} 
              className={`my-4 p-4 rounded-xl border-2 transition-all ${
                isChecked 
                  ? 'border-emerald-500/50 bg-emerald-500/10' 
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <div 
                  onClick={() => onKeyTermCheck(termId, !isChecked)}
                  className="cursor-pointer mt-0.5 flex-shrink-0"
                >
                  <Checkbox checked={isChecked} className="pointer-events-none h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm leading-relaxed font-montserrat ${isChecked ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                    {trimmedLine}
                  </p>
                  {isChecked && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 mt-2 font-montserrat">
                      <Check className="h-3 w-3" /> Acknowledged
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        } else if (isMainHeader) {
          elements.push(
            <h2 key={index} className="text-lg font-bold mt-8 mb-3 text-foreground border-b pb-2 border-border font-montserrat">
              {trimmedLine}
            </h2>
          );
        } else if (isSubHeader) {
          elements.push(
            <h3 key={index} className="text-sm font-semibold mt-4 mb-2 text-foreground/90 ml-4 font-montserrat">
              {trimmedLine}
            </h3>
          );
        } else {
          // Regular paragraph
          elements.push(
            <p key={index} className="text-sm leading-relaxed mb-2 text-foreground/80 font-montserrat">
              {trimmedLine}
            </p>
          );
        }
      });
      
      return elements;
    };
    
    return (
      <div ref={ref} className="agreement-content font-montserrat">
        <div className="max-w-none">
          {formatContent(content)}
        </div>
      </div>
    );
  }
);

AgreementViewer.displayName = 'AgreementViewer';
