import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Upload, Camera } from 'lucide-react';
import type { OnboardingAction } from '../useOnboardingReducer';

interface Props {
  headshotFile: File | null;
  headshotPreviewUrl: string | null;
  dispatch: React.Dispatch<OnboardingAction>;
}

const MAX_SIZE_MB = 5;

export default function HeadshotStep({ headshotFile, headshotPreviewUrl, dispatch }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File must be under ${MAX_SIZE_MB}MB`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      dispatch({ type: 'SET_FIELD', field: 'headshotFile', value: file });
      dispatch({ type: 'SET_FIELD', field: 'headshotPreviewUrl', value: previewUrl });
    },
    [dispatch]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="glass-card p-8 max-w-lg w-full mx-auto">
      <h2 className="text-2xl font-semibold text-white">Upload your headshot</h2>
      <p className="text-sm text-white/50 mt-1 mb-6">This will appear on your profile and marketing pages</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {headshotPreviewUrl ? (
        <div className="flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="relative"
          >
            <img
              src={headshotPreviewUrl}
              alt="Headshot preview"
              className="w-32 h-32 rounded-full object-cover border-2 border-white/20 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 bg-green-500/80 rounded-full p-1.5">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </motion.div>
          <p className="text-sm text-white/40">{headshotFile?.name}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-400 hover:text-blue-300 hover:bg-white/5"
          >
            Change photo
          </Button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            flex flex-col items-center justify-center gap-3 py-12 rounded-xl
            border-2 border-dashed cursor-pointer transition-all duration-200
            ${
              isDragging
                ? 'border-blue-500/50 bg-blue-500/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            }
          `}
        >
          <Upload className="w-8 h-8 text-white/30" />
          <p className="text-sm text-white/40">
            Drag and drop or <span className="text-blue-400">browse</span>
          </p>
          <p className="text-xs text-white/20">PNG, JPG up to {MAX_SIZE_MB}MB</p>
        </div>
      )}

      {error && <p className="text-xs text-red-400 text-center mt-3">{error}</p>}
    </div>
  );
}
