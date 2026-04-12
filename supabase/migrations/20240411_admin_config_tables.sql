-- Admin Configuration Tables Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. app_config - Global application settings (single row)
-- ============================================
CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  portal_brand_name text DEFAULT 'Fence Boys',
  portal_logo_url text DEFAULT '/fence-boys-logo.jpg',
  portal_closed_message text DEFAULT 'This quote is no longer available. Please contact Fence Boys if you have questions.',
  dashboard_title text DEFAULT 'Repair Quotes Dashboard',
  deposit_percentage integer DEFAULT 50,
  markup_percentage integer DEFAULT 25,
  payout_colt_percentage integer DEFAULT 75,
  payout_fb_percentage integer DEFAULT 25,
  default_salesperson_name text DEFAULT 'Colt Stonerook'
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS app_config_single_row ON app_config ((true));

-- ============================================
-- 2. status_config - Status labels, colors, and order
-- ============================================
CREATE TABLE IF NOT EXISTS status_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status_key text UNIQUE NOT NULL,
  label text NOT NULL,
  color text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  show_in_dashboard_filter boolean DEFAULT true
);

-- ============================================
-- 3. notification_templates - Per-status notification settings
-- ============================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status_key text NOT NULL REFERENCES status_config(status_key) ON DELETE CASCADE,
  slack_enabled boolean DEFAULT true,
  slack_template text NOT NULL,
  sms_enabled boolean DEFAULT false,
  sms_template text,
  email_enabled boolean DEFAULT false,
  email_subject text,
  email_template text
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_templates_status_key ON notification_templates(status_key);

-- ============================================
-- 4. portal_copy - Per-status portal content
-- ============================================
CREATE TABLE IF NOT EXISTS portal_copy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status_key text NOT NULL REFERENCES status_config(status_key) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  show_sign_button boolean DEFAULT false,
  show_pay_button boolean DEFAULT false,
  show_schedule_info boolean DEFAULT false,
  custom_message text,
  alert_color text DEFAULT 'blue'
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_copy_status_key ON portal_copy(status_key);

-- ============================================
-- 5. dashboard_views - Saved dashboard view configurations
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean DEFAULT false,
  columns jsonb DEFAULT '[]'::jsonb,
  filters jsonb DEFAULT '[]'::jsonb,
  default_sort_field text DEFAULT 'created_at',
  default_sort_direction text DEFAULT 'desc'
);

-- ============================================
-- Update timestamp triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_status_config_updated_at
  BEFORE UPDATE ON status_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portal_copy_updated_at
  BEFORE UPDATE ON portal_copy
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_views_updated_at
  BEFORE UPDATE ON dashboard_views
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_copy ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_views ENABLE ROW LEVEL SECURITY;

-- Public read access for all config tables (needed for customer portal)
CREATE POLICY "Allow public read access on app_config"
  ON app_config FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on status_config"
  ON status_config FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on portal_copy"
  ON portal_copy FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on notification_templates"
  ON notification_templates FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on dashboard_views"
  ON dashboard_views FOR SELECT
  USING (true);

-- Authenticated users can update all config tables
CREATE POLICY "Allow authenticated update on app_config"
  ON app_config FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert on app_config"
  ON app_config FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on status_config"
  ON status_config FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on notification_templates"
  ON notification_templates FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on portal_copy"
  ON portal_copy FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on dashboard_views"
  ON dashboard_views FOR ALL
  USING (auth.role() = 'authenticated');
