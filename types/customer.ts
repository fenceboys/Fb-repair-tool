export interface Customer {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city_state: string | null;
  zip: string | null;
  notes: string | null;
  quote_appointment_date: string | null;
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;
export type CustomerUpdate = Partial<CustomerInsert>;

export interface CustomerQuoteSummary {
  id: string;
  title: string | null;
  status: string;
  quote_price: number;
  repair_description: string | null;
  created_at: string;
  quote_appointment_date: string | null;
  scheduled_date: string | null;
}

export interface CustomerWithCounts extends Customer {
  quote_count?: number;
  last_activity?: string | null;
  quotes?: CustomerQuoteSummary[];
}
