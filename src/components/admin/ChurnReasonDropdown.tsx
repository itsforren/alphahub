import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChurnReasonDropdownProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const CHURN_REASONS = [
  { value: 'too_expensive', label: 'Too Expensive' },
  { value: 'no_results', label: 'No Results / ROI' },
  { value: 'slow_lead_delivery', label: 'Slow Lead Delivery' },
  { value: 'found_competitor', label: 'Found Competitor' },
  { value: 'business_closed', label: 'Business Closed' },
  { value: 'personal_reasons', label: 'Personal Reasons' },
  { value: 'service_issues', label: 'Service/Support Issues' },
  { value: 'not_ready', label: 'Not Ready to Scale' },
  { value: 'other', label: 'Other' },
];

export default function ChurnReasonDropdown({ value, onChange, disabled }: ChurnReasonDropdownProps) {
  return (
    <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select reason for cancellation" />
      </SelectTrigger>
      <SelectContent>
        {CHURN_REASONS.map((reason) => (
          <SelectItem key={reason.value} value={reason.value}>
            {reason.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { CHURN_REASONS };
