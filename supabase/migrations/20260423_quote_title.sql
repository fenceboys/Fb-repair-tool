-- Add an internal-only title to repair_quotes so Colt can tell multiple
-- quotes for the same customer apart (e.g. "Front fence repair" vs
-- "Back gate replacement"). Nullable so existing quotes are unaffected and
-- title is never required — repair_description is still the customer-facing
-- text used on the PDF and portal.

alter table repair_quotes
  add column if not exists title text;
