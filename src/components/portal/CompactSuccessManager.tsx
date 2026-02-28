import { useState } from 'react';
import { Edit2, Phone, Mail, X, Save, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CompactSuccessManagerProps {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  onSave?: (data: {
    success_manager_name: string;
    success_manager_email: string;
    success_manager_phone: string;
    success_manager_image_url: string;
  }) => Promise<void>;
  isSaving?: boolean;
}

export function CompactSuccessManager({
  name,
  email,
  phone,
  imageUrl,
  onSave,
  isSaving,
}: CompactSuccessManagerProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    success_manager_name: name || '',
    success_manager_email: email || '',
    success_manager_phone: phone || '',
    success_manager_image_url: imageUrl || '',
  });

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SM';

  const hasManager = name || email;

  const handleSave = async () => {
    if (onSave) {
      await onSave(formData);
      setEditMode(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open && hasManager) {
      setFormData({
        success_manager_name: name || '',
        success_manager_email: email || '',
        success_manager_phone: phone || '',
        success_manager_image_url: imageUrl || '',
      });
    }
    if (!open) {
      setEditMode(false);
    }
  };

  if (!hasManager && !onSave) return null;

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors border border-border/50">
          <Avatar className="w-6 h-6">
            <AvatarImage src={imageUrl || undefined} alt={name || 'Success Manager'} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-foreground max-w-[120px] truncate">
            {name || 'Assign Manager'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        {!editMode ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={imageUrl || undefined} alt={name || 'Success Manager'} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{name || 'Not assigned'}</p>
                <p className="text-xs text-muted-foreground">Success Manager</p>
              </div>
            </div>

            {(email || phone) && (
              <div className="space-y-2 pt-2 border-t border-border">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {phone}
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{email}</span>
                  </a>
                )}
              </div>
            )}

            {onSave && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setEditMode(true)}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                {hasManager ? 'Edit' : 'Assign Manager'}
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <h4 className="font-medium text-sm text-foreground">Edit Success Manager</h4>
            <div className="space-y-2">
              <Input
                value={formData.success_manager_name}
                onChange={(e) =>
                  setFormData({ ...formData, success_manager_name: e.target.value })
                }
                placeholder="Name"
                className="h-8 text-sm"
              />
              <Input
                value={formData.success_manager_email}
                onChange={(e) =>
                  setFormData({ ...formData, success_manager_email: e.target.value })
                }
                placeholder="Email"
                className="h-8 text-sm"
              />
              <Input
                value={formData.success_manager_phone}
                onChange={(e) =>
                  setFormData({ ...formData, success_manager_phone: e.target.value })
                }
                placeholder="Phone"
                className="h-8 text-sm"
              />
              <Input
                value={formData.success_manager_image_url}
                onChange={(e) =>
                  setFormData({ ...formData, success_manager_image_url: e.target.value })
                }
                placeholder="Photo URL"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setEditMode(false)}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
              <Button size="sm" className="flex-1" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
