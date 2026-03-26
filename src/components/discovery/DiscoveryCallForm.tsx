import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Lightbulb, CheckCircle, DollarSign, Target, Building2, Heart, ClipboardList } from 'lucide-react';
import { TemperatureSelector } from './TemperatureSelector';
import { AccountsInput } from './AccountsInput';
import { HealthConditionsInput } from './HealthConditionsInput';
import type { DiscoveryFormData, DiscoveryOutcome } from '@/hooks/useDiscoveryCalls';
import type { DiscoveryLead } from '@/hooks/useLeadDiscoveryQueue';

// ── Constants ────────────────────────────────────────────────────────────────

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
  'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

const INTEREST_OPTIONS = [
  { value: 'tax-free-retirement', label: 'Tax-free retirement income' },
  { value: 'life-insurance', label: 'Life insurance protection' },
  { value: 'no-tax-growth', label: 'No tax liability on growth' },
  { value: 'zero-risk', label: 'Zero risk / no market exposure' },
  { value: 'preservation', label: 'Preservation of capital' },
  { value: 'just-learning', label: 'Just learning how it works' },
  { value: 'other', label: 'Other' },
];

const CONTRIBUTION_OPTIONS = [
  'Under $100', '$100-$249', '$250-$499', '$500-$999', '$1,000+',
];

// ── Props ────────────────────────────────────────────────────────────────────

interface DiscoveryCallFormProps {
  lead: DiscoveryLead;
  agentId: string;
  onSave: (data: {
    outcome: DiscoveryOutcome;
    temperature?: string;
    discovery_data: DiscoveryFormData;
    appointment_datetime?: string;
  }) => void;
  saving?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function DiscoveryCallForm({ lead, agentId, onSave, saving }: DiscoveryCallFormProps) {
  // Form state
  const [firstName, setFirstName] = useState(lead.first_name || '');
  const [lastName, setLastName] = useState(lead.last_name || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [email, setEmail] = useState(lead.email || '');
  const [age, setAge] = useState(lead.age || '');
  const [state, setState] = useState(lead.state || '');
  const [occupation, setOccupation] = useState(lead.employment || '');

  const [interests, setInterests] = useState<string[]>(() => {
    if (!lead.interest) return [];
    // Data comes as JSON array string: ["Tax-Free Retirement Income","No Tax Liability on Growth"]
    const interestMap: Record<string, string> = {
      'tax-free retirement income': 'tax-free-retirement',
      'life insurance protection': 'life-insurance',
      'no tax liability on growth': 'no-tax-growth',
      'zero risk or exposure to market downturns': 'zero-risk',
      'preservation of capital': 'preservation',
      'just learning how it works': 'just-learning',
    };
    try {
      const parsed = JSON.parse(lead.interest);
      if (Array.isArray(parsed)) {
        return parsed
          .map((s: string) => interestMap[s.trim().toLowerCase()] || '')
          .filter(Boolean);
      }
    } catch {
      // Fallback: comma-separated
      return lead.interest
        .replace(/^\[|\]$/g, '')
        .replace(/"/g, '')
        .split(',')
        .map((s) => interestMap[s.trim().toLowerCase()] || '')
        .filter(Boolean);
    }
    return [];
  });
  const [interestOther, setInterestOther] = useState('');

  const [spouse, setSpouse] = useState<string | null>(null);
  const [kids, setKids] = useState<string | null>(null);
  const [numKids, setNumKids] = useState('');
  const [kidAges, setKidAges] = useState('');

  // Pre-fill savings → contribution mapping
  const [contribution, setContribution] = useState<string | null>(() => {
    if (!lead.savings) return null;
    // Map GHL savings values to contribution pills
    const savingsMap: Record<string, string> = {
      'less than $300': 'Under $100',
      '$300 - $500': '$250-$499',
      '$500 - $1,000': '$500-$999',
      'more than $1,000': '$1,000+',
    };
    return savingsMap[lead.savings.toLowerCase()] || null;
  });
  const [contributionCustom, setContributionCustom] = useState('');
  const [retireAge, setRetireAge] = useState('');

  // Pre-fill accounts from investments field
  const [hasAccounts, setHasAccounts] = useState<string | null>(() => {
    if (!lead.investments) return null;
    try {
      const parsed = JSON.parse(lead.investments);
      return Array.isArray(parsed) && parsed.length > 0 ? 'yes' : null;
    } catch {
      return lead.investments.trim() ? 'yes' : null;
    }
  });
  const [accounts, setAccounts] = useState(() => {
    if (!lead.investments) return [{ type: '', balance: '' }];
    const acctTypeMap: Record<string, string> = {
      '401 (k)': '401(K)', '401(k)': '401(K)',
      'ira': 'IRA', 'roth ira': 'Roth IRA',
      'holding cash': 'Holding Cash',
      'active trading': 'Active Trading',
      'self directed brokerage account': 'Self Directed Brokerage Account',
    };
    try {
      const parsed = JSON.parse(lead.investments);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mapped = parsed
          .map((s: string) => ({ type: acctTypeMap[s.trim().toLowerCase()] || s.trim(), balance: '' }))
          .filter((a) => a.type);
        return mapped.length > 0 ? mapped : [{ type: '', balance: '' }];
      }
    } catch {
      // ignore
    }
    return [{ type: '', balance: '' }];
  });

  const [healthCond, setHealthCond] = useState<string | null>(null);
  const [conditions, setConditions] = useState(['']);
  const [tobacco, setTobacco] = useState<string | null>(null);
  const [tobaccoType, setTobaccoType] = useState('');
  const [tobaccoFrequency, setTobaccoFrequency] = useState('');
  const [felony, setFelony] = useState<string | null>(null);

  const [temperature, setTemperature] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const contribValue = contribution === 'Custom'
      ? contributionCustom || 'Custom'
      : contribution || '';

    const kidDetails = kids === 'yes'
      ? `${numKids || '?'} kid(s), ages: ${kidAges || 'unknown'}`
      : '';

    const tobaccoDetail = tobacco === 'yes'
      ? [tobaccoType, tobaccoFrequency].filter(Boolean).join(' — ') || 'yes'
      : tobacco || undefined;

    const discoveryData: DiscoveryFormData = {
      spouse: spouse || undefined,
      kids: kids || undefined,
      kid_details: kidDetails || undefined,
      contribution: contribValue || undefined,
      retire_age: retireAge || undefined,
      accounts: accounts.filter((a) => a.type || a.balance),
      health_conditions: conditions.filter(Boolean),
      tobacco: tobaccoDetail,
      tobacco_type: tobaccoType || undefined,
      tobacco_frequency: tobaccoFrequency || undefined,
      felony: felony || undefined,
      interests: interests,
      interest_other: interestOther || undefined,
      occupation: occupation || undefined,
      notes: notes || undefined,
      savings: lead.savings || undefined,
    };

    // No outcome here — outcome is decided in the next step (booking/skip screen)
    onSave({
      outcome: 'strategy_booked', // placeholder — DiscoveryCallSheet overrides this based on what happens next
      temperature: temperature || undefined,
      discovery_data: discoveryData,
    });
  };

  return (
    <div className="space-y-4 pb-28 sm:pb-24">
      {/* Interest Section */}
      <SectionCard title="Why They Looked Into IULs" icon={Lightbulb} accent="amber">
        <div className="space-y-2">
          {INTEREST_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                interests.includes(opt.value)
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border hover:border-primary/20'
              )}
            >
              <Checkbox
                checked={interests.includes(opt.value)}
                onCheckedChange={(checked) => {
                  if (checked) setInterests([...interests, opt.value]);
                  else setInterests(interests.filter((i) => i !== opt.value));
                }}
              />
              <span className="text-sm font-medium">{opt.label}</span>
            </label>
          ))}
          {interests.includes('other') && (
            <Input
              placeholder="Describe their interest..."
              value={interestOther}
              onChange={(e) => setInterestOther(e.target.value)}
              className="mt-2 bg-background/50"
            />
          )}
        </div>
      </SectionCard>

      {/* Confirm Details */}
      <SectionCard title="Confirm Details" icon={CheckCircle} accent="default">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 38" min={18} max={85} />
          </Field>
          <Field label="State">
            <Select value={state} onValueChange={setState}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Occupation">
          <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. RN, Business Owner" />
        </Field>
        <Field label="Spouse?">
          <ToggleGroup value={spouse} onChange={setSpouse} />
        </Field>
        <Field label="Kids?">
          <ToggleGroup value={kids} onChange={setKids} />
        </Field>
        {kids === 'yes' && (
          <div className="grid grid-cols-2 gap-3 mt-2 p-3 rounded-lg border border-border bg-background/30">
            <Field label="How many?">
              <Input type="number" value={numKids} onChange={(e) => setNumKids(e.target.value)} placeholder="e.g. 2" />
            </Field>
            <Field label="Ages">
              <Input value={kidAges} onChange={(e) => setKidAges(e.target.value)} placeholder="e.g. 4, 9, 14" />
            </Field>
          </div>
        )}
      </SectionCard>

      {/* Monthly Contribution */}
      <SectionCard title="Monthly Contribution" icon={DollarSign} accent="green">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CONTRIBUTION_OPTIONS.map((opt) => (
            <PillButton key={opt} label={opt} selected={contribution === opt} onClick={() => setContribution(opt)} />
          ))}
          <PillButton label="Custom..." selected={contribution === 'Custom'} onClick={() => setContribution('Custom')} />
        </div>
        {contribution === 'Custom' && (
          <Input
            placeholder="e.g. $350/month"
            value={contributionCustom}
            onChange={(e) => setContributionCustom(e.target.value)}
            className="mt-2 bg-background/50"
          />
        )}
      </SectionCard>

      {/* Retirement Timeline */}
      <SectionCard title="Retirement Timeline" icon={Target} accent="default">
        <Field label="Target retirement age">
          <Input type="number" value={retireAge} onChange={(e) => setRetireAge(e.target.value)} placeholder="e.g. 62" min={30} max={85} />
        </Field>
      </SectionCard>

      {/* Existing Accounts */}
      <SectionCard title="Existing Retirement Accounts" icon={Building2} accent="default">
        <Field label="401k, IRA, savings, or investments?">
          <ToggleGroup value={hasAccounts} onChange={setHasAccounts} />
        </Field>
        {hasAccounts === 'yes' && (
          <div className="mt-3">
            <AccountsInput accounts={accounts} onChange={setAccounts} />
          </div>
        )}
      </SectionCard>

      {/* Health */}
      <SectionCard title="Health Qualification" icon={Heart} accent="rose">
        <Field label="Major health conditions, surgeries, or hospitalizations?">
          <ToggleGroup value={healthCond} onChange={setHealthCond} />
        </Field>
        {healthCond === 'yes' && (
          <div className="mt-3">
            <HealthConditionsInput conditions={conditions} onChange={setConditions} />
          </div>
        )}
        <Field label="Smoker or tobacco user?" className="mt-3">
          <ToggleGroup value={tobacco} onChange={setTobacco} />
        </Field>
        {tobacco === 'yes' && (
          <div className="mt-2 p-3 rounded-lg border border-border bg-background/30 space-y-3">
            <Field label="Type">
              <div className="flex flex-wrap gap-2">
                {['Cigarettes', 'Cigars', 'Pouches', 'Vape', 'Chew', 'Other'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTobaccoType(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                      tobaccoType === t
                        ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                        : 'border-border bg-background/50 text-muted-foreground hover:border-rose-500/30'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="How often?">
              <Input value={tobaccoFrequency} onChange={(e) => setTobaccoFrequency(e.target.value)} placeholder="e.g. half a pack a day, occasional cigar" className="bg-background/50" />
            </Field>
          </div>
        )}
        <Field label="Any felony on record?" className="mt-3">
          <ToggleGroup value={felony} onChange={setFelony} />
        </Field>
      </SectionCard>

      {/* Wrap-Up — temperature + notes (NO outcome — that's decided after save) */}
      <SectionCard title="Wrap Up" icon={ClipboardList} accent="purple">
        <Field label="Lead Temperature">
          <TemperatureSelector value={temperature} onChange={setTemperature} />
        </Field>
        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Objections, special circumstances, anything to flag..."
            className="bg-background/50 min-h-[80px]"
          />
        </Field>
      </SectionCard>

      {/* Save Bar — saves discovery data, then sheet handles booking/outcome */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-12 font-bold text-base bg-gradient-to-r from-pink-600 via-pink-700 to-amber-700 hover:from-pink-500 hover:via-pink-600 hover:to-amber-600 shadow-lg"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ElementType;
  accent: 'default' | 'amber' | 'green' | 'rose' | 'purple';
  children: React.ReactNode;
}) {
  const accentColors = {
    default: 'border-l-primary',
    amber: 'border-l-amber-500',
    green: 'border-l-green-500',
    rose: 'border-l-rose-500',
    purple: 'border-l-purple-500',
  };
  const titleColors = {
    default: 'text-primary',
    amber: 'text-amber-400',
    green: 'text-green-400',
    rose: 'text-rose-400',
    purple: 'text-purple-400',
  };

  return (
    <Card className={cn('border-l-4', accentColors[accent])}>
      <CardContent className="p-5 space-y-4">
        <div className={cn('flex items-center gap-2 text-xs font-bold uppercase tracking-wider', titleColors[accent])}>
          <Icon className="h-4 w-4" />
          {title}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-sm font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleGroup({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className={cn(
          'flex-1',
          value === 'yes' && 'border-green-500 bg-green-500/10 text-green-400'
        )}
        onClick={() => onChange('yes')}
      >
        Yes
      </Button>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'flex-1',
          value === 'no' && 'border-rose-500 bg-rose-500/10 text-rose-400'
        )}
        onClick={() => onChange('no')}
      >
        No
      </Button>
    </div>
  );
}

function PillButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'py-2.5 px-2 rounded-xl border-2 text-sm font-bold transition-all',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background/50 text-muted-foreground hover:border-primary/30'
      )}
    >
      {label}
    </button>
  );
}
