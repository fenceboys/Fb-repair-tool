// PDF field positions for FB_Repair_Contract_Clean.pdf
// Coordinates are in PDF points (72 points = 1 inch)
// Y coordinates are from BOTTOM of page (PDF standard)

// Standard letter size PDF dimensions
export const PDF_WIDTH = 612;
export const PDF_HEIGHT = 792;

// Calibrated field positions (from calibration tool)
export const FIELD_POSITIONS: Record<string, { x: number; y: number }> = {
  client_name: { x: 108, y: 660 },
  phone: { x: 120, y: 638 },
  email: { x: 346, y: 638 },
  address: { x: 126, y: 616 },
  city_state: { x: 100, y: 594 },
  zip: { x: 410, y: 594 },
  repair_description: { x: 52, y: 543 },
  total_price: { x: 120, y: 368 },
  deposit: { x: 390, y: 368 },
  client_signature: { x: 65, y: 112 },
  salesperson_signature: { x: 60, y: 58 },
  date: { x: 410, y: 122 },
  issue_date: { x: 410, y: 73 },
};

// Repair description text wrapping bounds
export const REPAIR_DESCRIPTION_BOUNDS = {
  x: 52,
  y: 543,
  maxWidth: 510,
  lineHeight: 16,
  maxLines: 10,
};

// Signature dimensions
export const SIGNATURE_SIZE = {
  width: 200,
  height: 55,
};
