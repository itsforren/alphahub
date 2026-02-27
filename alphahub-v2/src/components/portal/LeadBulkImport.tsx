import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, Check, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBulkImportLeads, CreateLeadInput } from '@/hooks/useLeads';
import { toast } from 'sonner';

interface LeadBulkImportProps {
  onComplete?: () => void;
}

export function LeadBulkImport({ onComplete }: LeadBulkImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<CreateLeadInput[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const bulkImport = useBulkImportLeads();

  const parseCSV = (text: string): CreateLeadInput[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Find column indices
    const findCol = (names: string[]) => {
      return headers.findIndex(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));
    };

    const leadIdCol = findCol(['Lead ID', 'lead_id', 'leadId']);
    const agentIdCol = findCol(['Agent ID', 'agent_id', 'agentId']);
    const leadDateCol = findCol(['Lead Date', 'lead_date', 'leadDate']);
    const firstNameCol = findCol(['First Name', 'first_name', 'firstName']);
    const lastNameCol = findCol(['Last Name', 'last_name', 'lastName']);
    const phoneCol = findCol(['Phone']);
    const emailCol = findCol(['Email']);
    const stateCol = findCol(['State']);
    const ageCol = findCol(['Age']);
    const employmentCol = findCol(['Employment']);
    const interestCol = findCol(['Interest']);
    const savingsCol = findCol(['Savings']);
    const investmentsCol = findCol(['Investments']);
    const timezoneCol = findCol(['Timezone']);
    const leadSourceCol = findCol(['Lead Source', 'lead_source', 'leadSource']);

    const leads: CreateLeadInput[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      const leadId = leadIdCol >= 0 ? values[leadIdCol]?.trim() : '';
      const agentId = agentIdCol >= 0 ? values[agentIdCol]?.trim() : '';

      if (!leadId || !agentId) continue;

      const leadDate = leadDateCol >= 0 ? parseDate(values[leadDateCol]) : undefined;

      leads.push({
        lead_id: leadId,
        agent_id: agentId,
        lead_date: leadDate,
        first_name: firstNameCol >= 0 ? values[firstNameCol]?.trim() : undefined,
        last_name: lastNameCol >= 0 ? values[lastNameCol]?.trim() : undefined,
        phone: phoneCol >= 0 ? values[phoneCol]?.trim() : undefined,
        email: emailCol >= 0 ? values[emailCol]?.trim() : undefined,
        state: stateCol >= 0 ? values[stateCol]?.trim() : undefined,
        age: ageCol >= 0 ? values[ageCol]?.trim() : undefined,
        employment: employmentCol >= 0 ? values[employmentCol]?.trim() : undefined,
        interest: interestCol >= 0 ? values[interestCol]?.trim() : undefined,
        savings: savingsCol >= 0 ? values[savingsCol]?.trim() : undefined,
        investments: investmentsCol >= 0 ? values[investmentsCol]?.trim() : undefined,
        timezone: timezoneCol >= 0 ? values[timezoneCol]?.trim() : undefined,
        lead_source: leadSourceCol >= 0 ? values[leadSourceCol]?.trim() : undefined,
        status: 'new',
      });
    }

    return leads;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const parseDate = (dateStr: string | undefined): string | undefined => {
    if (!dateStr?.trim()) return undefined;
    
    // Try MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      const date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(date.getTime())) return date.toISOString();
    }
    
    // Try ISO format
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date.toISOString();
    
    return undefined;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const leads = parseCSV(text);
      setParsedLeads(leads);
      
      if (leads.length === 0) {
        toast.error('No valid leads found in CSV. Make sure it has Lead ID and Agent ID columns.');
      } else {
        toast.success(`Found ${leads.length} leads ready to import`);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (parsedLeads.length === 0) return;

    setImporting(true);
    setProgress(0);

    try {
      // Simulate progress during import
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 5, 90));
      }, 200);

      const imported = await bulkImport.mutateAsync(parsedLeads);
      
      clearInterval(progressInterval);
      setProgress(100);

      const successCount = imported.length;
      const skippedCount = parsedLeads.length - successCount;
      
      setResult({ success: successCount, skipped: skippedCount });
      toast.success(`Imported ${successCount} leads${skippedCount > 0 ? `, ${skippedCount} duplicates skipped` : ''}`);
      
      if (onComplete) onComplete();
    } catch (error) {
      toast.error('Failed to import leads');
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedLeads([]);
    setProgress(0);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="frosted-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Bulk Import Leads</h3>
            <p className="text-xs text-muted-foreground">Upload a CSV file to import leads</p>
          </div>
        </div>
        {file && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">Click to upload CSV</p>
          <p className="text-xs text-muted-foreground mt-1">
            Must include Lead ID and Agent ID columns
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <FileSpreadsheet className="w-8 h-8 text-purple-400" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {parsedLeads.length} leads ready to import
              </p>
            </div>
            {result ? (
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-500">{result.success} imported</span>
              </div>
            ) : null}
          </div>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Importing leads... {progress}%
              </p>
            </div>
          )}

          {!result && !importing && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Duplicates (matching Lead ID) will be skipped automatically
              </p>
            </div>
          )}

          {!result && (
            <Button
              className="w-full"
              onClick={handleImport}
              disabled={importing || parsedLeads.length === 0}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import {parsedLeads.length} Leads
                </>
              )}
            </Button>
          )}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".csv"
        onChange={handleFileSelect}
      />
    </div>
  );
}
