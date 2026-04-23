-- Split repair_quotes.base_cost into material_cost + labor_cost, plus a free-text
-- materials breakdown note. All three columns are internal-only (not surfaced in
-- the customer portal or PDF) and nullable so legacy quotes remain valid.
alter table repair_quotes
  add column if not exists material_cost numeric,
  add column if not exists labor_cost numeric,
  add column if not exists materials_notes text;
