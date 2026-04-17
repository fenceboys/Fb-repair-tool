-- Run this in the Supabase SQL editor before deploying the payment logging + caching changes.

-- 1) Cache Stripe PaymentIntent clientSecret per quote so retries don't create duplicate PIs.
alter table repair_quotes
  add column if not exists payment_client_secret text;

-- 2) Capture client-side payment failures so we can see which branch fires without needing a live customer.
create table if not exists client_errors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  quote_id uuid references repair_quotes(id) on delete set null,
  source text not null,
  error_branch text not null,
  http_status int,
  user_agent text,
  connection_type text,
  save_data boolean,
  raw_name text,
  raw_message text,
  request_id text
);

create index if not exists client_errors_quote_id_idx on client_errors (quote_id);
create index if not exists client_errors_created_at_idx on client_errors (created_at desc);

-- Allow the anon role (used by the customer portal) to insert rows.
alter table client_errors enable row level security;

drop policy if exists "client_errors anon insert" on client_errors;
create policy "client_errors anon insert"
  on client_errors
  for insert
  to anon
  with check (true);

-- Match the project's existing pattern (see supabase/migrations/20240411_admin_config_tables.sql):
-- authenticated users (your admin dashboard) can read rows.
drop policy if exists "Allow authenticated read on client_errors" on client_errors;
create policy "Allow authenticated read on client_errors"
  on client_errors
  for select
  using (auth.role() = 'authenticated');
