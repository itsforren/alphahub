import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import ClientAvatar from '@/components/portal/ClientAvatar';

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    name: string;
    email: string;
    user_id: string | null;
    profile_image_url?: string | null;
  };
  onConfirm: (deleteAuthUser: boolean) => Promise<void>;
  isDeleting: boolean;
}

export function DeleteClientDialog({
  open,
  onOpenChange,
  client,
  onConfirm,
  isDeleting,
}: DeleteClientDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [deleteAuthUser, setDeleteAuthUser] = useState(false);
  const [finalConfirm, setFinalConfirm] = useState(false);

  const canProceedStep1 = confirmText.toUpperCase() === 'DELETE';
  const canProceedStep2 = finalConfirm;

  const handleClose = () => {
    setStep(1);
    setConfirmText('');
    setDeleteAuthUser(false);
    setFinalConfirm(false);
    onOpenChange(false);
  };

  const handleContinue = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setFinalConfirm(false);
  };

  const handleDelete = async () => {
    await onConfirm(deleteAuthUser);
    handleClose();
  };

  return (
    <>
      {/* Step 1: Type DELETE to confirm */}
      <AlertDialog open={open && step === 1} onOpenChange={(o) => !o && handleClose()}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Client Profile
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>You are about to delete this client and all associated data:</p>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <ClientAvatar
                    name={client.name}
                    imageUrl={client.profile_image_url}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{client.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-delete" className="text-sm font-medium">
                    Type <span className="font-mono text-destructive">DELETE</span> to confirm:
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE here"
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleContinue}
              disabled={!canProceedStep1}
              variant="destructive"
            >
              Continue →
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 2: Final confirmation with data list */}
      <AlertDialog open={open && step === 2} onOpenChange={(o) => !o && handleClose()}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Final Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  The following data will be <strong className="text-destructive">permanently deleted</strong> for{' '}
                  <strong>{client.name}</strong>:
                </p>

                <ul className="text-sm space-y-1.5 pl-4 list-disc text-muted-foreground">
                  <li>Billing records & wallet transactions</li>
                  <li>Chat conversations & messages</li>
                  <li>Onboarding checklist & automation runs</li>
                  <li>Support tickets & NPS responses</li>
                  <li>Ad spend history & KPI data</li>
                  <li>Campaign audit logs & proposals</li>
                  <li>Agreements & credit records</li>
                  <li>Referral codes owned by this client</li>
                </ul>

                {client.user_id && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                    <Checkbox
                      id="delete-auth"
                      checked={deleteAuthUser}
                      onCheckedChange={(c) => setDeleteAuthUser(c === true)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="delete-auth" className="text-sm font-medium cursor-pointer">
                        Also delete login account
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        This will remove the auth account ({client.email}) so they cannot log in.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <Checkbox
                    id="final-confirm"
                    checked={finalConfirm}
                    onCheckedChange={(c) => setFinalConfirm(c === true)}
                  />
                  <Label htmlFor="final-confirm" className="text-sm cursor-pointer">
                    I understand this action <strong>cannot be undone</strong>
                  </Label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleBack} disabled={isDeleting}>
              ← Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canProceedStep2 || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Everything
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
