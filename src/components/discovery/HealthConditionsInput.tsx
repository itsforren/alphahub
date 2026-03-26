import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';

interface HealthConditionsInputProps {
  conditions: string[];
  onChange: (conditions: string[]) => void;
}

export function HealthConditionsInput({ conditions, onChange }: HealthConditionsInputProps) {
  const add = () => onChange([...conditions, '']);

  const remove = (index: number) => {
    if (conditions.length <= 1) {
      onChange(['']);
    } else {
      onChange(conditions.filter((_, i) => i !== index));
    }
  };

  const update = (index: number, value: string) => {
    const next = [...conditions];
    next[index] = value;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {conditions.map((cond, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder="e.g. Type 2 diabetes, open-heart surgery 2019"
            value={cond}
            onChange={(e) => update(i, e.target.value)}
            className="flex-1 bg-background/50"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="flex-shrink-0 text-red-400 hover:text-red-300 hover:border-red-500/40"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed text-muted-foreground hover:text-primary hover:border-primary/40"
        onClick={add}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>
    </div>
  );
}
