'use client';

import { useState } from 'react';

const FIELDS_TO_CALIBRATE = [
  'client_name',
  'phone',
  'email',
  'address',
  'city_state',
  'zip',
  'repair_description',
  'total_price',
  'deposit',
  'client_signature',
  'salesperson_signature',
  'date',
  'issue_date',
];

// PDF dimensions (standard letter: 612 x 792 points)
const PDF_WIDTH = 612;
const PDF_HEIGHT = 792;

export default function CalibratePage() {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; pdfX: number; pdfY: number }>>({});
  const [currentField, setCurrentField] = useState<string>(FIELDS_TO_CALIBRATE[0]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // The overlay matches the PDF display size
    // Convert to PDF coordinates (flip Y axis, PDF origin is bottom-left)
    const pdfX = Math.round((x / rect.width) * PDF_WIDTH);
    const pdfY = Math.round(PDF_HEIGHT - (y / rect.height) * PDF_HEIGHT);

    setPositions(prev => ({
      ...prev,
      [currentField]: { x, y, pdfX, pdfY }
    }));

    // Move to next field
    const currentIndex = FIELDS_TO_CALIBRATE.indexOf(currentField);
    if (currentIndex < FIELDS_TO_CALIBRATE.length - 1) {
      setCurrentField(FIELDS_TO_CALIBRATE[currentIndex + 1]);
    }
  };

  const generateCode = () => {
    const code: Record<string, { x: number; y: number }> = {};

    Object.entries(positions).forEach(([name, pos]) => {
      code[name] = { x: pos.pdfX, y: pos.pdfY };
    });

    return `export const FIELD_POSITIONS: Record<string, { x: number; y: number }> = ${JSON.stringify(code, null, 2)};`;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generateCode());
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">PDF Field Calibration</h1>

        <div className="mb-4 bg-white p-4 rounded-lg shadow">
          <p className="mb-2">
            <strong>Current field:</strong>{' '}
            <span className="text-green-600 font-mono text-lg">{currentField}</span>
          </p>
          <p className="text-gray-600 text-sm">
            Click on the PDF where this field's text should START (top-left corner of text)
          </p>

          <div className="flex gap-2 mt-3 flex-wrap">
            {FIELDS_TO_CALIBRATE.map(field => (
              <button
                key={field}
                onClick={() => setCurrentField(field)}
                className={`px-3 py-1 rounded text-sm ${
                  field === currentField
                    ? 'bg-green-500 text-white'
                    : positions[field]
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {field}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 bg-white p-4 rounded-lg shadow">
            <div
              className="relative cursor-crosshair border border-gray-300 mx-auto"
              style={{ width: '612px', height: '792px' }}
            >
              {/* PDF Display - hide toolbar with #toolbar=0 */}
              <iframe
                src="/FB_Repair_Contract_Clean.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH"
                className="w-full h-full absolute inset-0 pointer-events-none"
                style={{ border: 'none' }}
              />

              {/* Click overlay */}
              <div
                onClick={handleOverlayClick}
                className="absolute inset-0 z-10"
                style={{ background: 'transparent' }}
              >
                {/* Markers for calibrated positions */}
                {Object.entries(positions).map(([name, pos]) => {
                  const isCurrentField = name === currentField;
                  return (
                    <div
                      key={name}
                      className="absolute"
                      style={{
                        left: `${(pos.pdfX / PDF_WIDTH) * 100}%`,
                        top: `${((PDF_HEIGHT - pos.pdfY) / PDF_HEIGHT) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isCurrentField ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                      />
                      <span className="absolute left-4 top-0 text-xs bg-white px-1 rounded shadow whitespace-nowrap">
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="w-80 bg-white p-4 rounded-lg shadow h-fit sticky top-4">
            <h2 className="font-bold mb-2">Calibrated Positions</h2>
            <div className="space-y-1 text-sm font-mono mb-4 max-h-60 overflow-auto">
              {Object.entries(positions).map(([name, pos]) => (
                <div key={name} className="flex justify-between">
                  <span>{name}:</span>
                  <span className="text-blue-600">({pos.pdfX}, {pos.pdfY})</span>
                </div>
              ))}
            </div>

            <button
              onClick={copyCode}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mb-2"
            >
              Copy Code
            </button>

            <button
              onClick={() => setPositions({})}
              className="w-full bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200"
            >
              Reset All
            </button>

            <div className="mt-4">
              <h3 className="font-bold mb-2">Generated Code:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-60">
                {generateCode()}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
