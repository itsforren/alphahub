import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AdminProfile } from '@/hooks/useAdminChat';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description: string, memberIds: string[]) => void;
  adminUsers: AdminProfile[];
  isLoading: boolean;
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  onSubmit,
  adminUsers,
  isLoading,
}: CreateChannelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), description.trim(), selectedMembers);
    // Reset form
    setName('');
    setDescription('');
    setSelectedMembers([]);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    return '?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. general, marketing"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Add Members</Label>
            <ScrollArea className="h-48 border rounded-lg p-2">
              <div className="space-y-2">
                {adminUsers.map(admin => (
                  <label
                    key={admin.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(admin.id)}
                      onCheckedChange={() => toggleMember(admin.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={admin.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(admin.name, admin.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{admin.name || admin.email}</p>
                      {admin.name && (
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      )}
                    </div>
                  </label>
                ))}
                {adminUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No other admins to add
                  </p>
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              You'll be added as a member automatically
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Channel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
