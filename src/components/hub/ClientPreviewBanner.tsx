import { X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientPreview } from '@/contexts/ClientPreviewContext';
import { useClient } from '@/hooks/useClients';

export function ClientPreviewBanner() {
  const { viewAsClientId, isPreviewMode, exitPreviewMode } = useClientPreview();
  const { data: client } = useClient(viewAsClientId || undefined);

  if (!isPreviewMode) return null;

  return (
    <div className="bg-amber-500/90 text-amber-950 px-4 py-2 flex items-center justify-between gap-4 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span className="font-medium text-sm">
          Preview Mode: Viewing as{' '}
          <span className="font-bold">{client?.name || 'Client'}</span>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={exitPreviewMode}
        className="h-7 gap-1.5 text-amber-950 hover:bg-amber-600/50 hover:text-amber-950"
      >
        <X className="w-3.5 h-3.5" />
        Exit Preview
      </Button>
    </div>
  );
}
