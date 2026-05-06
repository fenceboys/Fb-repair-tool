-- Four new workflow statuses requested to cover in-flight states that weren't
-- captured by the existing enum. ON CONFLICT DO NOTHING so re-running this
-- migration is safe.

insert into status_config (status_key, label, color, sort_order, show_in_dashboard_filter) values
  ('requesting_permit', 'Requesting Permit', 'yellow', 25, true),
  ('scheduling_repair', 'Scheduling Repair', 'indigo', 55, true),
  ('rejected_quote', 'Rejected Quote', 'red', 80, true),
  ('lost_contact', 'Lost Contact', 'gray', 90, true)
on conflict (status_key) do nothing;
