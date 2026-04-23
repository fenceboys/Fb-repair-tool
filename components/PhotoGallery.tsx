'use client';

import { useState } from 'react';
import type { QuotePhoto } from '@/types/photo';

interface PhotoGalleryProps {
  photos: QuotePhoto[];
  onDelete?: (id: string) => void;
}

export function PhotoGallery({ photos, onDelete }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No photos attached yet.</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group"
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="absolute inset-0 w-full h-full"
              aria-label={`View ${photo.filename}`}
            >
              <img
                src={photo.public_url}
                alt={photo.caption ?? photo.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this photo?')) onDelete(photo.id);
                }}
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-700 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Delete photo"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <img
            src={photos[lightboxIndex].public_url}
            alt={photos[lightboxIndex].caption ?? photos[lightboxIndex].filename}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
