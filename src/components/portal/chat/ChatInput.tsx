import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, X, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CHAT_PERSONAS, type ChatPersonaId } from '@/hooks/useChat';

interface ChatInputProps {
  onSend: (message: string, attachment?: { url: string; type: string; name: string }, personaId?: ChatPersonaId) => void;
  disabled?: boolean;
  placeholder?: string;
  clientId?: string;
  isAdmin?: boolean;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = 'Type a message...',
  clientId,
  isAdmin = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<{ file: File; preview: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<ChatPersonaId>('default');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && !attachment) || disabled || isUploading) return;
    // Synchronous guard — prevents double-submit from keyboard repeat or rapid clicks
    if (isSendingRef.current) return;
    isSendingRef.current = true;

    let attachmentData: { url: string; type: string; name: string } | undefined;

    if (attachment) {
      setIsUploading(true);
      try {
        // Ensure we have a fresh session before uploading
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          // Try refreshing the session
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            toast.error('Session expired. Please refresh the page and try again.');
            setIsUploading(false);
            isSendingRef.current = false;
            return;
          }
        }

        const fileExt = attachment.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, attachment.file, {
            contentType: attachment.file.type,
            upsert: true,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError.message, uploadError);
          if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('Unauthorized')) {
            toast.error('Upload permission denied. Please refresh the page and try again.');
          } else {
            toast.error(`Upload failed: ${uploadError.message}`);
          }
          setIsUploading(false);
          isSendingRef.current = false;
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);

        attachmentData = {
          url: publicUrl,
          type: attachment.file.type.startsWith('image/') ? 'image' : 'file',
          name: attachment.file.name,
        };
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error(error?.message || 'Failed to upload file');
        setIsUploading(false);
        isSendingRef.current = false;
        return;
      }
      setIsUploading(false);
    }

    onSend(trimmedMessage || `Sent ${attachmentData?.type === 'image' ? 'an image' : 'a file'}`, attachmentData, selectedPersona);
    setMessage('');
    setAttachment(null);
    // Release guard after a short delay to let isPending propagate
    setTimeout(() => { isSendingRef.current = false; }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const processFile = useCallback((file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const preview = isImage ? URL.createObjectURL(file) : '';
    setAttachment({ file, preview });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = '';
  };

  const removeAttachment = () => {
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachment(null);
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the actual drop zone
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Accept images and common document types
      const allowedTypes = [
        'image/', 
        'application/pdf', 
        'application/msword',
        'application/vnd.openxmlformats-officedocument',
        'text/',
        'application/vnd.ms-excel'
      ];
      
      const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
      if (isAllowed) {
        processFile(file);
      } else {
        toast.error('File type not supported');
      }
    }
  }, [processFile]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div 
      ref={dropZoneRef}
      className={`border-t border-border bg-card/50 flex-shrink-0 pb-safe transition-colors ${
        isDragOver ? 'bg-primary/5 border-primary/50' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay indicator */}
      {isDragOver && (
        <div className="p-3 border-b border-primary/30 bg-primary/10 text-center">
          <p className="text-sm text-primary font-medium">Drop your file here</p>
        </div>
      )}
      {/* Attachment Preview */}
      {attachment && (
        <div className="p-2 sm:p-3 border-b border-border/50">
          <div className="flex items-center gap-2 sm:gap-3 p-2 bg-muted/50 rounded-lg">
            {attachment.preview ? (
              <img 
                src={attachment.preview} 
                alt="Preview" 
                className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-md flex items-center justify-center">
                <Paperclip className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(attachment.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={removeAttachment}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex items-end gap-1.5 sm:gap-2 p-2 sm:p-3">
        {/* File Upload Button - handles both images and files */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-primary flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        {/* Hidden file input - accepts both images and documents */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          className="hidden"
          onChange={(e) => handleFileSelect(e, false)}
        />

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isUploading}
          className="min-h-[40px] max-h-[120px] resize-none bg-background/50 border-border/50 focus:border-primary/50 text-sm sm:text-base"
          rows={1}
        />
        {/* Persona selector — admin only */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`flex-shrink-0 h-9 sm:h-10 text-xs gap-1 px-2 ${
                  selectedPersona !== 'default' ? 'text-primary border border-primary/30 bg-primary/5' : 'text-muted-foreground'
                }`}
              >
                {selectedPersona === 'default' ? 'You' : CHAT_PERSONAS.find(p => p.id === selectedPersona)?.name}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CHAT_PERSONAS.map((persona) => (
                <DropdownMenuItem
                  key={persona.id}
                  onClick={() => setSelectedPersona(persona.id)}
                  className={selectedPersona === persona.id ? 'bg-primary/10' : ''}
                >
                  <span className="font-medium">{persona.name}</span>
                  {persona.title && (
                    <span className="text-xs text-muted-foreground ml-2">{persona.title}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          onClick={handleSubmit}
          disabled={(!message.trim() && !attachment) || disabled || isUploading}
          size="icon"
          className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
