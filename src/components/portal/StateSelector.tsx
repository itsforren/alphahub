import { useState, useEffect } from 'react';
import { Check, ChevronDown, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const US_STATES = [
  { abbrev: 'AL', name: 'Alabama' },
  { abbrev: 'AK', name: 'Alaska' },
  { abbrev: 'AZ', name: 'Arizona' },
  { abbrev: 'AR', name: 'Arkansas' },
  { abbrev: 'CA', name: 'California' },
  { abbrev: 'CO', name: 'Colorado' },
  { abbrev: 'CT', name: 'Connecticut' },
  { abbrev: 'DE', name: 'Delaware' },
  { abbrev: 'FL', name: 'Florida' },
  { abbrev: 'GA', name: 'Georgia' },
  { abbrev: 'HI', name: 'Hawaii' },
  { abbrev: 'ID', name: 'Idaho' },
  { abbrev: 'IL', name: 'Illinois' },
  { abbrev: 'IN', name: 'Indiana' },
  { abbrev: 'IA', name: 'Iowa' },
  { abbrev: 'KS', name: 'Kansas' },
  { abbrev: 'KY', name: 'Kentucky' },
  { abbrev: 'LA', name: 'Louisiana' },
  { abbrev: 'ME', name: 'Maine' },
  { abbrev: 'MD', name: 'Maryland' },
  { abbrev: 'MA', name: 'Massachusetts' },
  { abbrev: 'MI', name: 'Michigan' },
  { abbrev: 'MN', name: 'Minnesota' },
  { abbrev: 'MS', name: 'Mississippi' },
  { abbrev: 'MO', name: 'Missouri' },
  { abbrev: 'MT', name: 'Montana' },
  { abbrev: 'NE', name: 'Nebraska' },
  { abbrev: 'NV', name: 'Nevada' },
  { abbrev: 'NH', name: 'New Hampshire' },
  { abbrev: 'NJ', name: 'New Jersey' },
  { abbrev: 'NM', name: 'New Mexico' },
  { abbrev: 'NY', name: 'New York' },
  { abbrev: 'NC', name: 'North Carolina' },
  { abbrev: 'ND', name: 'North Dakota' },
  { abbrev: 'OH', name: 'Ohio' },
  { abbrev: 'OK', name: 'Oklahoma' },
  { abbrev: 'OR', name: 'Oregon' },
  { abbrev: 'PA', name: 'Pennsylvania' },
  { abbrev: 'RI', name: 'Rhode Island' },
  { abbrev: 'SC', name: 'South Carolina' },
  { abbrev: 'SD', name: 'South Dakota' },
  { abbrev: 'TN', name: 'Tennessee' },
  { abbrev: 'TX', name: 'Texas' },
  { abbrev: 'UT', name: 'Utah' },
  { abbrev: 'VT', name: 'Vermont' },
  { abbrev: 'VA', name: 'Virginia' },
  { abbrev: 'WA', name: 'Washington' },
  { abbrev: 'WV', name: 'West Virginia' },
  { abbrev: 'WI', name: 'Wisconsin' },
  { abbrev: 'WY', name: 'Wyoming' },
  { abbrev: 'DC', name: 'Washington DC' },
  { abbrev: 'PR', name: 'Puerto Rico' },
];

interface StateSelectorProps {
  value: string | null | undefined;
  onSave: (states: string) => Promise<void>;
  disabled?: boolean;
  clientId?: string;
  googleCampaignId?: string | null;
}

export function StateSelector({ value, onSave, disabled, clientId, googleCampaignId }: StateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Parse current states from comma-separated string
  const parseStates = (statesStr: string | null | undefined): string[] => {
    if (!statesStr || statesStr === 'null') return [];
    return statesStr
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => US_STATES.some(state => state.abbrev === s || state.name.toUpperCase() === s));
  };

  const [selectedStates, setSelectedStates] = useState<string[]>(() => parseStates(value));

  // Sync internal state when value prop changes (e.g., after page navigation or data refresh)
  useEffect(() => {
    setSelectedStates(parseStates(value));
  }, [value]);

  const toggleState = (abbrev: string) => {
    setSelectedStates(prev => 
      prev.includes(abbrev) 
        ? prev.filter(s => s !== abbrev)
        : [...prev, abbrev].sort()
    );
  };

  const selectAll = () => {
    setSelectedStates(US_STATES.map(s => s.abbrev));
  };

  const clearAll = () => {
    setSelectedStates([]);
  };

  const handleSyncFromGoogleAds = async () => {
    if (!clientId || !googleCampaignId) {
      toast.error('Cannot sync', { description: 'Missing client ID or Google Campaign ID' });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-ads-targeting', {
        body: { clientId },
      });

      if (error) {
        console.error('Error syncing from Google Ads:', error);
        toast.error('Failed to sync from Google Ads', { description: error.message });
        return;
      }

      if (data?.success && data.syncedStates) {
        setSelectedStates(data.syncedStates);
        toast.success('Synced from Google Ads', {
          description: `${data.syncedStates.length} states: ${data.syncedStates.join(', ')}`,
        });
        // Refresh the page data
        await onSave(data.statesString);
        setOpen(false);
      } else {
        toast.error('Sync failed', { description: data?.error || 'Unknown error' });
      }
    } catch (error) {
      console.error('Error syncing from Google Ads:', error);
      toast.error('Failed to sync from Google Ads');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // If we have a clientId and googleCampaignId, update Google Ads targeting
      if (clientId && googleCampaignId) {
        const { data, error } = await supabase.functions.invoke('update-google-ads-targeting', {
          body: { clientId, states: selectedStates },
        });

        if (error) {
          console.error('Error updating Google Ads targeting:', error);
          toast.error('Failed to update Google Ads targeting', {
            description: error.message,
          });
          // Still save to database even if Google Ads update fails
        } else if (data?.success) {
          const added = data.added?.length || 0;
          const removed = data.removed?.length || 0;
          if (added > 0 || removed > 0) {
            toast.success('Google Ads targeting updated', {
              description: `Added: ${data.added?.join(', ') || 'none'} | Removed: ${data.removed?.join(', ') || 'none'}`,
            });
          }
        }
      }

      await onSave(selectedStates.join(', '));
      setOpen(false);
    } catch (error) {
      console.error('Error saving states:', error);
      toast.error('Failed to save states');
    } finally {
      setSaving(false);
    }
  };

  const displayValue = selectedStates.length === 0 
    ? 'No states selected'
    : selectedStates.length <= 5
      ? selectedStates.join(', ')
      : `${selectedStates.slice(0, 5).join(', ')} +${selectedStates.length - 5} more`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="justify-between min-w-[200px] h-auto py-2 px-3 font-normal"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="truncate text-sm">{displayValue}</span>
            {googleCampaignId && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0 border-blue-500/50 text-blue-600">
                Ads
              </Badge>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-popover border-border" align="start">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {selectedStates.length} of {US_STATES.length} states selected
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
                Clear All
              </Button>
            </div>
          </div>
          
          {/* Selected states badges */}
          {selectedStates.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedStates.map(abbrev => (
                <Badge 
                  key={abbrev} 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-destructive/20"
                  onClick={() => toggleState(abbrev)}
                >
                  {abbrev}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        <div className="max-h-[300px] overflow-y-auto p-2">
          <div className="grid grid-cols-3 gap-1">
            {US_STATES.map((state) => {
              const isSelected = selectedStates.includes(state.abbrev);
              return (
                <button
                  key={state.abbrev}
                  onClick={() => toggleState(state.abbrev)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left",
                    isSelected 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="truncate">{state.abbrev}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="p-3 border-t border-border flex items-center justify-between">
          {googleCampaignId && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSyncFromGoogleAds} 
              disabled={syncing || !clientId}
              className="text-xs"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", syncing && "animate-spin")} />
              {syncing ? 'Syncing...' : 'Sync from Google Ads'}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
