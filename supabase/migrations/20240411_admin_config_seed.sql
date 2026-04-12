-- Seed Data for Admin Configuration Tables
-- Run this AFTER the tables migration

-- ============================================
-- Seed app_config (single row)
-- ============================================
INSERT INTO app_config (
  portal_brand_name,
  portal_logo_url,
  portal_closed_message,
  dashboard_title,
  deposit_percentage,
  markup_percentage,
  payout_colt_percentage,
  payout_fb_percentage,
  default_salesperson_name
) VALUES (
  'Fence Boys',
  '/fence-boys-logo.jpg',
  'This quote is no longer available. Please contact Fence Boys if you have questions.',
  'Repair Quotes Dashboard',
  50,
  25,
  75,
  25,
  'Colt Stonerook'
) ON CONFLICT DO NOTHING;

-- ============================================
-- Seed status_config
-- ============================================
INSERT INTO status_config (status_key, label, color, sort_order, show_in_dashboard_filter) VALUES
  ('scheduling_quote', 'Scheduling Quote', 'orange', 1, true),
  ('quote_scheduled', 'Quote Scheduled', 'gray', 2, true),
  ('draft', 'Draft', 'amber', 3, false),
  ('awaiting_signature', 'Awaiting Signature', 'blue', 4, true),
  ('awaiting_payment', 'Awaiting Payment', 'green', 5, true),
  ('paid', 'Paid', 'purple', 6, true),
  ('repair_scheduled', 'Repair Scheduled', 'teal', 7, true)
ON CONFLICT (status_key) DO NOTHING;

-- ============================================
-- Seed notification_templates
-- ============================================
INSERT INTO notification_templates (status_key, slack_enabled, slack_template) VALUES
  ('scheduling_quote', true, 'New lead: {{customer_name}} - needs quote appointment scheduled'),
  ('quote_scheduled', true, 'Quote appointment scheduled for {{scheduled_date}}'),
  ('draft', true, 'Quote created for {{customer_name}}'),
  ('awaiting_signature', true, 'Proposal sent to {{customer_name}}'),
  ('awaiting_payment', true, '{{customer_name}} signed the contract - awaiting payment'),
  ('paid', true, '{{customer_name}} paid! Ready to schedule repair'),
  ('repair_scheduled', true, 'Repair scheduled for {{scheduled_date}}')
ON CONFLICT (status_key) DO NOTHING;

-- ============================================
-- Seed portal_copy
-- ============================================
INSERT INTO portal_copy (status_key, title, description, show_sign_button, show_pay_button, show_schedule_info, alert_color) VALUES
  ('awaiting_signature', 'Signature Required', 'Please review and sign to proceed.', true, false, false, 'blue'),
  ('awaiting_payment', 'Contract Signed', 'Ready to pay your deposit or balance.', false, true, false, 'green'),
  ('paid', 'Payment Received', 'Thank you! We''ll be in touch to schedule your repair.', false, false, false, 'green'),
  ('repair_scheduled', 'Repair Scheduled', 'Your repair appointment is confirmed.', false, false, true, 'green')
ON CONFLICT (status_key) DO NOTHING;

-- ============================================
-- Seed dashboard_views (default view)
-- ============================================
INSERT INTO dashboard_views (name, sort_order, is_default, columns, filters, default_sort_field, default_sort_direction) VALUES
  ('All Quotes', 1, true,
   '[{"field": "client_name", "visible": true, "order": 1}, {"field": "address", "visible": true, "order": 2}, {"field": "status", "visible": true, "order": 3}, {"field": "quote_price", "visible": true, "order": 4}, {"field": "created_at", "visible": true, "order": 5}]'::jsonb,
   '[]'::jsonb,
   'created_at', 'desc'),
  ('Awaiting Payment', 2, false,
   '[{"field": "client_name", "visible": true, "order": 1}, {"field": "phone", "visible": true, "order": 2}, {"field": "quote_price", "visible": true, "order": 3}, {"field": "deposit", "visible": true, "order": 4}]'::jsonb,
   '[{"field": "status", "operator": "equals", "value": "awaiting_payment"}]'::jsonb,
   'created_at', 'desc'),
  ('Ready to Schedule', 3, false,
   '[{"field": "client_name", "visible": true, "order": 1}, {"field": "address", "visible": true, "order": 2}, {"field": "phone", "visible": true, "order": 3}]'::jsonb,
   '[{"field": "status", "operator": "equals", "value": "paid"}]'::jsonb,
   'updated_at', 'asc')
ON CONFLICT DO NOTHING;
