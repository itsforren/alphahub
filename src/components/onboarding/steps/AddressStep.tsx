import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { US_STATES } from '../useOnboardingReducer';
import type { AddressData, OnboardingAction } from '../useOnboardingReducer';

interface Props {
  address: AddressData;
  dispatch: React.Dispatch<OnboardingAction>;
}

export default function AddressStep({ address, dispatch }: Props) {
  const updateField = (field: keyof AddressData, value: string) => {
    dispatch({ type: 'SET_ADDRESS', address: { [field]: value } });
  };

  return (
    <div className="glass-card p-8 max-w-lg w-full mx-auto">
      <h2 className="text-2xl font-semibold text-white">What's your business address?</h2>
      <p className="text-sm text-white/50 mt-1 mb-6">Used for compliance and correspondence</p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-white/60">Street Address</Label>
          <Input
            type="text"
            placeholder="123 Main St, Suite 100"
            value={address.street}
            onChange={(e) => updateField('street', e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-white/60">City</Label>
            <Input
              type="text"
              placeholder="Dallas"
              value={address.city}
              onChange={(e) => updateField('city', e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-white/60">State</Label>
            <Select
              value={address.state}
              onValueChange={(value) => updateField('state', value)}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/20">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                {US_STATES.map((state) => (
                  <SelectItem
                    key={state.code}
                    value={state.code}
                    className="text-white/80 focus:bg-white/10 focus:text-white"
                  >
                    {state.code} - {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-white/60">ZIP Code</Label>
            <Input
              type="text"
              placeholder="75201"
              value={address.zip}
              onChange={(e) => updateField('zip', e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-white/60">Country</Label>
            <Input
              type="text"
              value="United States"
              readOnly
              className="bg-white/5 border-white/10 text-white/50 cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
