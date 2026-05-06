'use client';

import { useState } from 'react';
import type { QuotePhoto } from '@/types/photo';

interface PhotoGalleryProps {
  photos: QuotePhoto[];
  onDelete?: (id: string) => void;
  leadingTile?: React.ReactNode;
}

export function PhotoGallery({ photos, onDelete, leadingTile }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0 && !leadingTile) {
    return (
      <p className="text-sm text-gray-500 italic">No photos attached yet.</p>
    );
  }

  return (
    <>
      {/* Mobile: horizontal scroll strip so a growing gallery doesn't push the
          page tall. Desktop (≥sm): 3-col grid. Tile widths are fixed when
          scrolling so the tiles stay square and readable. */}
      <div className="flex overflow-x-auto gap-2 -mx-1 px-1 snap-x sm:grid sm:grid-cols-3 sm:overflow-visible sm:snap-none sm:mx-0 sm:px-0">
        {leadingTile}
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group shrink-0 w-28 sm:w-auto snap-start"
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
