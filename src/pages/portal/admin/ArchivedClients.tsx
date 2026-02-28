import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, differenceInHours, format } from 'date-fns';
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  Clock, 
  AlertTriangle,
  ArrowLeft,
  Users
} from 'lucide-react';
import { useArchivedClients, useRestoreClient, usePermanentlyDeleteClient, Client } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ClientAvatar from '@/components/portal/ClientAvatar';
import { cn } from '@/lib/utils';

type ArchivedClient = Client & { deleted_at: string; deleted_by: string | null };

function getTimeRemaining(deletedAt: string): { days: number; hours: number; text: string; isExpiring: boolean } {
  const deletedDate = new Date(deletedAt);
  const expiryDate = new Date(deletedDate.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days later
  const now = new Date();
  
  const hoursRemaining = differenceInHours(expiryDate, now);
  const daysRemaining = Math.floor(hoursRemaining / 24);
  const remainingHours = hoursRemaining % 24;
  
  if (hoursRemaining <= 0) {
    return { days: 0, hours: 0, text: 'Pending deletion', isExpiring: true };
  }
  
  if (daysRemaining === 0) {
    return { 
      days: 0, 
      hours: remainingHours, 
      text: `${remainingHours}h remaining`, 
      isExpiring: true 
    };
  }
  
  return { 
    days: daysRemaining, 
    hours: remainingHours, 
    text: `${daysRemaining}d ${remainingHours}h remaining`, 
    isExpiring: daysRemaining <= 1 
  };
}

function ArchivedClientRow({ client }: { client: ArchivedClient }) {
  const restoreClient = useRestoreClient();
  const permanentlyDeleteClient = usePermanentlyDeleteClient();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const timeRemaining = getTimeRemaining(client.deleted_at);
  
  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restoreClient.mutateAsync(client.id);
    } finally {
      setIsRestoring(false);
    }
  };
  
  const handlePermanentDelete = async () => {
    setIsDeleting(true);
    try {
      await permanentlyDeleteClient.mutateAsync(client.id);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <ClientAvatar name={client.name} src={client.profile_image_url} size="md" />
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{client.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Archived {format(new Date(client.deleted_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
            timeRemaining.isExpiring 
              ? "bg-destructive/10 text-destructive" 
              : "bg-muted text-muted-foreground"
          )}>
            <Clock className="w-3.5 h-3.5" />
            {timeRemaining.text}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestore}
              disabled={isRestoring}
            >
              <RotateCcw className={cn("w-4 h-4 mr-1", isRestoring && "animate-spin")} />
              Restore
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Now
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Permanently Delete Client?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{client.name}</strong> and all their data including billing records, leads, chat history, and wallet. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handlePermanentDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArchivedClients() {
  const navigate = useNavigate();
  const { data: archivedClients = [], isLoading } = useArchivedClients();
  
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hub/admin/clients')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Archive className="w-6 h-6" />
            Archived Clients
          </h1>
          <p className="text-muted-foreground">
            Clients are permanently deleted 5 days after archiving
          </p>
        </div>
      </div>
      
      {/* Info Alert */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/50">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Archive Retention Policy</p>
          <p className="text-sm text-muted-foreground">
            Archived clients are kept for 5 days before automatic permanent deletion. 
            You can restore a client at any time during this period, or delete them immediately if needed.
          </p>
        </div>
      </div>
      
      {/* Archived Clients List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : archivedClients.length === 0 ? (
        <div className="frosted-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Archived Clients</h3>
          <p className="text-muted-foreground">
            When you delete a client, they'll appear here for 5 days before permanent deletion.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {archivedClients.map(client => (
            <ArchivedClientRow key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
