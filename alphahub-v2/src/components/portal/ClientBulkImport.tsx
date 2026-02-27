import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBulkImportClients, Client } from '@/hooks/useClients';
import { toast } from 'sonner';

interface ImportRow {
  [key: string]: string | undefined;
}

// Full column mapping from the CSV to database fields
const COLUMN_MAPPINGS: Record<string, keyof Client | null> = {
  'agent_id': 'agent_id',
  'agent': 'name',
  'email': 'email',
  'agent_phone': 'phone',
  'status': 'status',
  'headshot_url': 'profile_image_url',
  'states': 'states',
  'management_fee': 'management_fee',
  'management_fee_renewal': 'management_fee_renewal',
  'ad_spend_budget': 'ad_spend_budget',
  'ad_spend_renewal': 'ad_spend_renewal',
  'mtd_ad_spend': 'mtd_ad_spend',
  'mtd_leads': 'mtd_leads',
  'mtd_calls': 'booked_calls',
  'mtd_apps': 'applications',
  'cost_per_lead_(cpl)': 'cpl',
  'cost_per_booked_call_(cpbc)': 'cpba',
  'cost_per_application_(cpa)': 'cpa',
  'cost_per_click_(cpc)': 'cpc',
  'click_through_rate_(ctr)': 'ctr',
  'conversion_rate': 'conversion_rate',
  'target_daily_spend': 'target_daily_spend',
  'nps_score': 'nps_score',
  'ads_campaign': 'ads_link',
  'crm': 'crm_link',
  'lander_w_id': 'lander_link',
  'scheduler': 'scheduler_link',
  'nfia_profile': 'nfia_link',
  'subaccount_id': 'subaccount_id',
  'team': 'team',
  'total_delivered': 'total_delivered',
  'ads_live?': 'ads_live',
  'current_quota': 'current_quota',
  'behind': 'behind_target',
  // Ignored columns (used for display only)
  'nps_comment': null,
  'nps_status': null,
  'nps_survey_link': null,
  'lander_(google_ads)': null,
  'tfwp_profile': null,
  'ads_campaign_id': 'google_campaign_id',
  'start_date': null,
  'due_date': null,
  'campaign_name': null,
  'delivered_today': null,
  'clickup_url': null,
  'clickup_id': null,
  'intro_cal_id': null,
  'alpha_blue_number': null,
  'signed_agreement': null,
  'mtd_booked_calls': 'booked_calls',
  'mtd_submitted_comissions': null,
  'mtd_booked_call_%': null,
  'referall_link': null,
  'refered_by_agent': null,
  'active_referred_agents': null,
  'referral_%': null,
  'rev_generated': null,
  'credits_earned': null,
  'remaining_credit_balance': null,
  'intial_pay_date': null,
  'launch_date': null,
  'onboarding_days': null,
  'onboarding_kpi': null,
  'mailing_address': null,
  'multiple_ads_campaigns': null,
  'thank_you_page_url': null,
  'package_purchased': null,
  'overflow_agent': null,
  'age_filter': 'filters_notes',
};

export function ClientBulkImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const importMutation = useBulkImportClients();

  const normalizeHeader = (header: string): string => {
    return header
      .toLowerCase()
      .replace(/[\r\n]+/g, '') // Remove newlines that might be in headers
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .trim();
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
        result.push(current.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
        current = '';
      } else if (char !== '\r') { // Skip carriage returns
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const parseCSV = useCallback((text: string): ImportRow[] => {
    // Clean up the text - handle different line endings
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header row - handle multi-line headers by joining them
    let headerLine = lines[0];
    let dataStartIndex = 1;
    
    // Check if first row contains newlines embedded in quotes (malformed CSV)
    const rawHeaders = parseCSVLine(headerLine);
    const headers = rawHeaders.map(h => normalizeHeader(h));
    
    const rows: ImportRow[] = [];

    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = parseCSVLine(line);
      if (values.length < 3) continue; // Skip rows with too few values

      const row: ImportRow = {};
      headers.forEach((header, index) => {
        const value = values[index];
        if (value && value.trim() && value !== 'N/A' && value !== 'NA' && value !== '#REF!') {
          row[header] = value.trim();
        }
      });

      // Only include rows with at least a name (agent)
      if (row.agent || row.name || row.agent_id) {
        rows.push(row);
      }
    }

    return rows;
  }, []);

  const parseCurrency = (value: string | undefined): number | null => {
    if (!value) return null;
    const cleaned = value.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const parseNumber = (value: string | undefined): number | null => {
    if (!value) return null;
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const parseBoolean = (value: string | undefined): boolean | null => {
    if (!value) return null;
    const lower = value.toLowerCase().trim();
    if (lower === 'yes' || lower === 'true' || lower === '1') return true;
    if (lower === 'no' || lower === 'false' || lower === '0') return false;
    return null;
  };

  const parseDate = (value: string | undefined): string | null => {
    if (!value) return null;
    const v = value.trim();
    if (!v) return null;

    const lowered = v.toLowerCase();
    if (lowered === 'na' || lowered === 'n/a' || lowered === '-') return null;

    const pad2 = (n: string) => n.padStart(2, '0');

    // YYYY-MM-DD
    const ymd = v.match(/^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/);
    if (ymd) return `${ymd[1]}-${pad2(ymd[2])}-${pad2(ymd[3])}`;

    // MM/DD/YYYY or M/D/YY
    const mdy = v.match(/^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*$/);
    if (mdy) {
      const month = pad2(mdy[1]);
      const day = pad2(mdy[2]);
      let year = mdy[3];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }

    // Fallback: try Date parsing (then coerce to date-only)
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

    return null;
  };

  const mapRowToClient = (row: ImportRow): Partial<Client> & { name: string; email: string } => {
    // Get name - try multiple column names
    const name = row.agent || row.name || row.agent_name || row.client_name || 'Unknown';
    
    // Get email - generate a placeholder if not present
    let email = row.email || row.agent_email;
    if (!email || email === 'N/A' || email === 'NA') {
      // Generate email from name and agent_id if no email
      const agentId = row.agent_id || '';
      const safeName = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
      email = agentId ? `${safeName}.${agentId}@placeholder.local` : `${safeName}@placeholder.local`;
    }

    // Map status
    let status = (row.status || 'active').toLowerCase();
    if (status.includes('inactive')) status = 'cancelled';
    else if (status.includes('pending')) status = 'paused';
    else if (status.includes('active')) status = 'active';
    else status = 'active';

    return {
      name,
      email: email.toLowerCase().trim(),
      agent_id: row.agent_id || null,
      phone: row.agent_phone || row.phone || null,
      status,
      profile_image_url: row.headshot_url || null,
      states: row.states || null,
      team: row.team || null,
      
      // Financial
      management_fee: parseCurrency(row.management_fee),
      management_fee_renewal: parseDate(row.management_fee_renewal),
      ad_spend_budget: parseCurrency(row.ad_spend_budget),
      ad_spend_renewal: parseDate(row.ad_spend_renewal),
      mtd_ad_spend: parseCurrency(row.mtd_ad_spend),
      target_daily_spend: parseCurrency(row.target_daily_spend),
      
      // Performance metrics (stored raw, calculated in UI)
      mtd_leads: parseNumber(row.mtd_leads),
      booked_calls: parseNumber(row.mtd_calls) || parseNumber(row.mtd_booked_calls),
      applications: parseNumber(row.mtd_apps),
      cpl: parseCurrency(row['cost_per_lead_(cpl)']),
      cpba: parseCurrency(row['cost_per_booked_call_(cpbc)']),
      cpa: parseCurrency(row['cost_per_application_(cpa)']),
      cpc: parseCurrency(row['cost_per_click_(cpc)']),
      ctr: parseNumber(row['click_through_rate_(ctr)']),
      conversion_rate: parseNumber(row.conversion_rate),
      
      // NPS
      nps_score: parseNumber(row.nps_score),
      
      // Links
      ads_link: row.ads_campaign && row.ads_campaign !== 'NA' && row.ads_campaign !== 'N/A' ? row.ads_campaign : null,
      crm_link: row.crm && row.crm !== 'NA' && row.crm !== 'N/A' ? row.crm : null,
      lander_link: row.lander_w_id || null,
      scheduler_link: row.scheduler || null,
      nfia_link: row.nfia_profile || null,
      subaccount_id: row.subaccount_id || null,
      google_campaign_id: row.ads_campaign_id && row.ads_campaign_id !== 'NA' && row.ads_campaign_id !== 'N/A' ? row.ads_campaign_id : null,
      
      // Quota
      total_delivered: parseNumber(row.total_delivered),
      current_quota: parseNumber(row.current_quota),
      behind_target: parseNumber(row.behind),
      ads_live: parseBoolean(row['ads_live?']),
      
      // Notes
      filters_notes: row.age_filter || null,
    };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);
    setErrors([]);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      setTotalRows(parsed.length);
      setPreview(parsed.slice(0, 5)); // Show first 5 rows as preview

      if (parsed.length === 0) {
        setErrors(['No valid rows found. Make sure your CSV has agent data.']);
      }
    } catch (error) {
      toast.error('Failed to parse CSV file');
      setErrors(['Failed to parse CSV file']);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast.error('No valid rows to import');
        return;
      }

      // Transform to client format
      const clients = parsed.map(mapRowToClient);

      await importMutation.mutateAsync(clients);
      
      // Reset form
      setFile(null);
      setPreview([]);
      setTotalRows(0);
      setErrors([]);
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Agent ID', 'Agent', 'Email', 'Agent Phone', 'Status', 'Headshot URL', 
      'STATES', 'Management Fee', 'Ad Spend Budget', 'MTD Ad Spend', 'MTD Leads',
      'MTD Calls', 'MTD Apps', 'Target Daily Spend', 'NPS SCORE', 'Team',
      'Total Delivered', 'ADS LIVE?', 'ADS CAMPAIGN', 'CRM', 'SCHEDULER',
      'NFIA PROFILE', 'Intercom URL'
    ];
    const sampleRow = [
      'ABC123', 'John Smith', 'john@example.com', '555-123-4567', 'ACTIVE',
      'https://example.com/photo.jpg', 'CA, TX', '$997', '$1500', '$500', '25',
      '10', '5', '$50', '9', 'Team Alpha', '150', 'YES', 
      'https://ads.google.com/...', 'https://crm.example.com/...', 
      'https://calendar.example.com/...', 'https://nfia.example.com/...',
      'https://intercom.example.com/...'
    ];
    
    const csv = headers.join(',') + '\n' + sampleRow.join(',');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="frosted-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Bulk Import Clients
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Import clients from your CSV file (supports the Agent Config format)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Template
        </Button>
      </div>

      {/* File upload */}
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center mb-4 hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="client-csv-upload"
        />
        <label htmlFor="client-csv-upload" className="cursor-pointer">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          {file ? (
            <div>
              <p className="text-sm text-foreground font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalRows} clients found
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click to upload CSV or drag and drop
            </p>
          )}
        </label>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errors.map((error, i) => (
              <p key={i}>{error}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Preview (first 5 rows):</p>
          <div className="bg-muted/50 rounded-lg p-3 overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-1">Name</th>
                  <th className="text-left p-1">Email</th>
                  <th className="text-left p-1">Agent ID</th>
                  <th className="text-left p-1">Status</th>
                  <th className="text-left p-1">Team</th>
                  <th className="text-left p-1">States</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-1 truncate max-w-[120px]">{row.agent || row.name || '-'}</td>
                    <td className="p-1 truncate max-w-[150px]">{row.email || 'Generated'}</td>
                    <td className="p-1 truncate max-w-[100px]">{row.agent_id || '-'}</td>
                    <td className="p-1">{row.status || 'active'}</td>
                    <td className="p-1 truncate max-w-[100px]">{row.team || '-'}</td>
                    <td className="p-1 truncate max-w-[100px]">{row.states || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      <Button 
        onClick={handleImport}
        disabled={!file || preview.length === 0 || importMutation.isPending}
        className="w-full"
      >
        {importMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Import {totalRows > 0 ? `${totalRows} Clients` : 'Clients'}
          </>
        )}
      </Button>
    </div>
  );
}
