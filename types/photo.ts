export interface QuotePhoto {
  id: string;
  created_at: string;
  quote_id: string;
  storage_path: string;
  public_url: string;
  filename: string;
  file_size: number | null;
  mime_type: string | null;
  caption: string | null;
  sort_order: number;
}
