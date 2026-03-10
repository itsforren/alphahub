import { useCallback, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketImageUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingUrls?: string[];
  onRemoveExisting?: (url: string) => void;
  className?: string;
}

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function TicketImageUpload({
  files,
  onFilesChange,
  existingUrls = [],
  onRemoveExisting,
  className,
}: TicketImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const totalCount = files.length + existingUrls.length;

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const valid: File[] = [];
      for (const file of Array.from(incoming)) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > MAX_SIZE_BYTES) continue;
        if (totalCount + valid.length >= MAX_FILES) break;
        valid.push(file);
      }
      if (valid.length > 0) {
        onFilesChange([...files, ...valid]);
      }
    },
    [files, totalCount, onFilesChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
        e.target.value = '';
      }
    },
    [addFiles],
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-3', className)}>
      {totalCount < MAX_FILES && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <ImagePlus className="w-8 h-8" />
          <p className="text-sm">Drag & drop images or click to browse</p>
          <p className="text-xs">Max {MAX_FILES} files, 5MB each</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            className="hidden"
          />
        </div>
      )}

      {(existingUrls.length > 0 || files.length > 0) && (
        <div className="grid grid-cols-5 gap-2">
          {existingUrls.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-md border border-border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(url)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>
          ))}
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="group relative aspect-square overflow-hidden rounded-md border border-border">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
