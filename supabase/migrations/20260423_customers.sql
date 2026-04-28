-- Customers: top-level contact records. A customer can own many repair_quotes.
-- Existing quotes remain untouched (customer_id null) so this migration is
-- additive-only. Soft-delete via deleted_at is added to repair_quotes at the
-- same time so the trash recovery flow works for both tables.

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  name text not null,
  phone text,
  email text,
  address text,
  city_state text,
  zip text,
  notes text
);

create index if not exists customers_phone_idx on customers (phone);
create index if not exists customers_address_lower_idx on customers (lower(address));
create index if not exists customers_deleted_at_idx on customers (deleted_at);

alter table customers enable row level security;

drop policy if exists "authenticated read customers" on customers;
create policy "authenticated read customers"
  on customers for select
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated write customers" on customers;
create policy "authenticated write customers"
  on customers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Link quotes to customers (nullable so existing rows are preserved exactly)
alter table repair_quotes
  add column if not exists customer_id uuid references customers(id) on delete set null;

-- Soft-delete for quotes (recovery flow via /trash)
alter table repair_quotes
  add column if not exists deleted_at timestamptz;

create index if not exists repair_quotes_customer_id_idx on repair_quotes (customer_id);
create index if not exists repair_quotes_deleted_at_idx on repair_quotes (deleted_at);
