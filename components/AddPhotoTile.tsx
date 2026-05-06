'use client';

import { useRef, useState } from 'react';

// Square "+ add photos" tile sized to match a PhotoGallery cell. Lives as the
// leadingTile in the gallery grid so the add action visually integrates with
// the photos instead of floating above as a long horizontal button.
interface AddPhotoTileProps {
  onUpload: (file: File) => Promise<unknown>;
  disabled?: boolean;
}

export function AddPhotoTile({ onUpload, disabled = false }: AddPhotoTileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await onUpload(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled || uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="shrink-0 w-28 sm:w-auto aspect-square snap-start rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 text-gray-500 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Add photos"
        title={error ?? 'Add photos'}
      >
        {uploading ? (
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent" />
        ) : (
          <>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium">Add</span>
          </>
        )}
      </button>
    </>
  );
}
