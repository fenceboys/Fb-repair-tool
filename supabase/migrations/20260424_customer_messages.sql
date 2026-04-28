-- Log of outbound SMS messages Colt/Cielo sent to customers from within the
-- app. Phase 1 of communications tracking — outbound only. Inbound sync from
-- the Quo webhook is deferred.

create table if not exists customer_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_id uuid references customers(id) on delete cascade,
  quote_id uuid references repair_quotes(id) on delete set null,
  direction text not null check (direction in ('outbound', 'inbound')),
  to_number text,
  from_number text,
  content text not null,
  quo_message_id text,
  sent_by text,
  status text
);

create index if not exists customer_messages_customer_idx
  on customer_messages (customer_id, created_at desc);

alter table customer_messages enable row level security;

drop policy if exists "authenticated read customer_messages" on customer_messages;
create policy "authenticated read customer_messages"
  on customer_messages for select
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated write customer_messages" on customer_messages;
create policy "authenticated write customer_messages"
  on customer_messages for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
