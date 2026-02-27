import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Percent, Save } from 'lucide-react';
import { usePerformancePercentage, useUpdatePerformancePercentage } from '@/hooks/usePerformancePercentage';
import { Skeleton } from '@/components/ui/skeleton';

export function PerformancePercentageWidget() {
  const { data: percentage, isLoading } = usePerformancePercentage();
  const updatePercentage = useUpdatePerformancePercentage();
  const [value, setValue] = useState<string>('7');

  useEffect(() => {
    if (percentage !== undefined) {
      setValue(percentage.toString());
    }
  }, [percentage]);

  const handleSave = () => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      updatePercentage.mutate(numValue);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Performance Percentage
        </CardTitle>
        <CardDescription>
          Adjust the displayed ad spend by this percentage. For example, 7% means $1000 spent will display as $1070.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="performance-percentage">Percentage Increase</Label>
            <div className="flex items-center gap-2">
              <Input
                id="performance-percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={updatePercentage.isPending}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {updatePercentage.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Current setting: <span className="font-medium">{percentage}%</span> — 
          Example: $1,000 actual spend → ${(1000 * (1 + (percentage || 7) / 100)).toLocaleString()} displayed
        </p>
      </CardContent>
    </Card>
  );
}
