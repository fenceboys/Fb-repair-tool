export interface LineItem {
  id: string;
  description: string;
  cost: number;
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
  status: 'draft' | 'sent' | 'signed' | 'paid';
  pdf_url: string | null;
  signed_copy_url: string | null;
  client_signature: string | null;
  salesperson_signature: string | null;
}

export type RepairQuoteInsert = Omit<RepairQuote, 'id' | 'created_at' | 'updated_at'>;
export type RepairQuoteUpdate = Partial<RepairQuoteInsert>;
