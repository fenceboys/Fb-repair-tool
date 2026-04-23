-- Internal photo attachments on a quote. Never shown in the customer portal.
--
-- PREREQUISITE: create the "quote-photos" Storage bucket in the Supabase
-- dashboard BEFORE running this migration:
--   1. Storage → New bucket → name: quote-photos
--   2. Public bucket: ON  (we store public_url in the table; set to OFF only if
--      you also switch the hook/API to use signed URLs)
--   3. Allowed MIME types: image/* (optional hardening)
--   4. File size limit: 10 MB (matches the API route's MAX_BYTES constant)
--
-- With the service-role key on the server, the upload API bypasses bucket RLS,
-- so no additional storage policies are required for uploads. Reads use the
-- public URL directly, so no bucket policy is required for reads either.

create table if not exists quote_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  quote_id uuid not null references repair_quotes(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  filename text not null,
  file_size int,
  mime_type text,
  caption text,
  sort_order int default 0
);

create index if not exists quote_photos_quote_id_idx on quote_photos(quote_id);

alter table quote_photos enable row level security;

drop policy if exists "authenticated read quote_photos" on quote_photos;
create policy "authenticated read quote_photos"
  on quote_photos
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated write quote_photos" on quote_photos;
create policy "authenticated write quote_photos"
  on quote_photos
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
