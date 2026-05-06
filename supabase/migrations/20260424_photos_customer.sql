-- Photos are property-scoped, not quote-scoped: a customer's repeat visits
-- usually concern the same fence/job site, so binding photos to a single
-- quote loses the reuse value. Add a customer_id FK and backfill from the
-- existing quote_id → customer_id path. quote_id stays nullable so photos
-- uploaded directly on the customer profile don't need a quote.

alter table quote_photos
  add column if not exists customer_id uuid references customers(id) on delete cascade;

-- Backfill: every photo that has a quote pointing at a linked customer gets
-- that customer_id stamped onto it. Safe to re-run: only touches rows where
-- customer_id is currently null.
update quote_photos qp
set customer_id = rq.customer_id
from repair_quotes rq
where qp.quote_id = rq.id
  and qp.customer_id is null
  and rq.customer_id is not null;

create index if not exists quote_photos_customer_id_idx on quote_photos (customer_id);
