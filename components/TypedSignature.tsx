'use client';

import { useState, useEffect } from 'react';

interface TypedSignatureProps {
  label: string;
  signature: string | null;
  onSign: (dataUrl: string) => void;
  onClear: () => void;
}

export function TypedSignature({
  label,
  signature,
  onSign,
  onClear,
}: TypedSignatureProps) {
  const [typedName, setTypedName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Generate signature image from typed name (transparent background)
  const generateSignature = (name: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Keep transparent background - don't fill with white
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'black';
      ctx.font = 'italic 36px "Brush Script MT", cursive, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    }

    return canvas.toDataURL('image/png');
  };

  const handleSign = () => {
    if (!typedName.trim()) return;
    const signatureDataUrl = generateSignature(typedName.trim());
    onSign(signatureDataUrl);
    setIsEditing(false);
  };

  const handleClear = () => {
    setTypedName('');
    setIsEditing(false);
    onClear();
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // If there's a signature and we're not editing, show it
  if (signature && !isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Clear
          </button>
        </div>
        <div className="border border-gray-300 rounded-lg overflow-hidden bg-white p-2">
          <img src={signature} alt="Signature" className="h-16 mx-auto" />
        </div>
      </div>
    );
  }

  // Editing or no signature mode
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Cancel
          </button>
        )}
      </div>

      {!isEditing && !signature ? (
        <button
          onClick={handleStartEdit}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          Tap to sign
        </button>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your name"
            autoFocus
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          />

          {typedName.trim() && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Preview:</p>
              <p
                className="text-2xl text-center"
                style={{ fontFamily: '"Brush Script MT", cursive, serif', fontStyle: 'italic' }}
              >
                {typedName}
              </p>
            </div>
          )}

          <button
            onClick={handleSign}
            disabled={!typedName.trim()}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Apply Signature
          </button>
        </div>
      )}
    </div>
  );
}
