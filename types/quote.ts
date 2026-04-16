export interface LineItem {
  id: string;
  description: string;
  cost: number;
}

export interface QuoteNote {
  id: string;
  content: string;
  createdAt: string;
}

export interface RepairQuote {
  id: string;
  created_at: string;
  updated_at: string;
  client_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city_state: string | null;
  zip: string | null;
  repair_description: string | null;
  line_items: LineItem[];
  base_cost: number;
  quote_price: number;
  misc: number;
  deposit: number;
  requires_deposit: boolean;
  status: 'scheduling_quote' | 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';
  pdf_url: string | null;
  signed_copy_url: string | null;
  client_signature: string | null;
  salesperson_signature: string | null;
  notes: QuoteNote[];
  scheduled_date: string | null;
  quote_appointment_date: string | null;
  revision_count: number;
  revised_at: string | null;
  portal_closed: boolean;
  internal_notes: string | null;
}

export type RepairQuoteInsert = Omit<RepairQuote, 'id' | 'created_at' | 'updated_at'>;
export type RepairQuoteUpdate = Partial<RepairQuoteInsert>;
