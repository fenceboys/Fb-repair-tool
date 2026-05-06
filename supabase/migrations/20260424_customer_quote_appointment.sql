-- Move the quote-visit appointment to the customer level. A property gets
-- one on-site visit regardless of how many priced variants Colt eventually
-- presents. Existing repair_quotes.quote_appointment_date stays for back-compat
-- but the customer-level column is the new source of truth for "when is
-- Colt's visit."

alter table customers
  add column if not exists quote_appointment_date timestamptz;

create index if not exists customers_quote_appt_idx
  on customers (quote_appointment_date)
  where quote_appointment_date is not null;
