'use client';

import { useQuotePhotos } from '@/hooks/useQuotePhotos';
import { PhotoGallery } from './PhotoGallery';
import { PhotoUploader } from './PhotoUploader';

interface PhotosSectionProps {
  quoteId: string;
  readOnly?: boolean;
}

export function PhotosSection({ quoteId, readOnly = false }: PhotosSectionProps) {
  const { photos, loading, error, uploadPhoto, deletePhoto } =
    useQuotePhotos(quoteId);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
        <span className="text-xs text-gray-500">Internal only</span>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}

      {!readOnly && <PhotoUploader onUpload={uploadPhoto} />}

      {loading ? (
        <p className="text-sm text-gray-500">Loading photos…</p>
      ) : (
        <PhotoGallery
          photos={photos}
          onDelete={readOnly ? undefined : deletePhoto}
        />
      )}
    </section>
  );
}
