// Admin Configuration Types

export interface AppConfig {
  id: string;
  created_at: string;
  updated_at: string;
  portal_brand_name: string;
  portal_logo_url: string;
  portal_closed_message: string;
  dashboard_title: string;
  deposit_percentage: number;
  markup_percentage: number;
  payout_colt_percentage: number;
  payout_fb_percentage: number;
  default_salesperson_name: string;
}

export interface StatusConfig {
  id: string;
  created_at: string;
  updated_at: string;
  status_key: string;
  label: string;
  color: string; // Tailwind color name (e.g., 'orange', 'blue', 'green')
  sort_order: number;
  show_in_dashboard_filter: boolean;
}

export interface NotificationTemplate {
  id: string;
  created_at: string;
  updated_at: string;
  status_key: string;
  slack_enabled: boolean;
  slack_template: string;
  sms_enabled: boolean;
  sms_template: string | null;
  email_enabled: boolean;
  email_subject: string | null;
  email_template: string | null;
}

export interface PortalCopy {
  id: string;
  created_at: string;
  updated_at: string;
  status_key: string;
  title: string;
  description: string;
  show_sign_button: boolean;
  show_pay_button: boolean;
  show_schedule_info: boolean;
  custom_message: string | null;
  alert_color: string; // 'blue', 'green', 'orange', etc.
}

export interface DashboardColumn {
  field: string;
  visible: boolean;
  order: number;
  width?: number;
}

export interface DashboardFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number | boolean;
}

export interface DashboardView {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  sort_order: number;
  is_default: boolean;
  columns: DashboardColumn[];
  filters: DashboardFilter[];
  default_sort_field: string;
  default_sort_direction: 'asc' | 'desc';
}

// Merge tags available for notification templates
export const MERGE_TAGS = [
  { tag: '{{customer_name}}', label: 'Customer Name', description: 'Client name' },
  { tag: '{{phone}}', label: 'Phone', description: 'Phone number' },
  { tag: '{{address}}', label: 'Address', description: 'Full address' },
  { tag: '{{city_state}}', label: 'City/State', description: 'City, State' },
  { tag: '{{quote_price}}', label: 'Quote Price', description: 'Total quote amount' },
  { tag: '{{deposit}}', label: 'Deposit', description: 'Deposit amount' },
  { tag: '{{scheduled_date}}', label: 'Scheduled Date', description: 'Formatted appointment date' },
  { tag: '{{repair_description}}', label: 'Repair Description', description: 'Description of work' },
] as const;

export type MergeTag = typeof MERGE_TAGS[number]['tag'];

// Default status configurations (matches current hardcoded values)
export const DEFAULT_STATUS_CONFIG: Omit<StatusConfig, 'id' | 'created_at' | 'updated_at'>[] = [
  { status_key: 'scheduling_quote', label: 'Scheduling Quote', color: 'orange', sort_order: 1, show_in_dashboard_filter: true },
  { status_key: 'quote_scheduled', label: 'Quote Scheduled', color: 'gray', sort_order: 2, show_in_dashboard_filter: true },
  { status_key: 'draft', label: 'Building Proposal', color: 'amber', sort_order: 3, show_in_dashboard_filter: false },
  { status_key: 'awaiting_signature', label: 'Awaiting Signature', color: 'blue', sort_order: 4, show_in_dashboard_filter: true },
  { status_key: 'awaiting_payment', label: 'Awaiting Payment', color: 'green', sort_order: 5, show_in_dashboard_filter: true },
  { status_key: 'paid', label: 'Paid', color: 'purple', sort_order: 6, show_in_dashboard_filter: true },
  { status_key: 'repair_scheduled', label: 'Repair Scheduled', color: 'teal', sort_order: 7, show_in_dashboard_filter: true },
];

// Default notification templates
export const DEFAULT_NOTIFICATION_TEMPLATES: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    status_key: 'scheduling_quote',
    slack_enabled: true,
    slack_template: 'New lead: {{customer_name}} - needs quote appointment scheduled',
    sms_enabled: false,
    sms_template: null,
    email_enabled: false,
    email_subject: null,
    email_template: null,
  },
  {
    status_key: 'quote_scheduled',
    slack_enabled: true,
    slack_template: 'Quote appointment scheduled for {{scheduled_date}}',
    sms_enabled: false,
    sms_template: null,
    email_enabled: false,
    email_subject: null,
    email_template: null,
  },
  {
    status_key: 'draft',
    slack_enabled: true,
    slack_template: 'Quote created for {{customer_name}}',
    sms_enabled: false,
    sms_template: null,
    email_enabled: false,
    email_subject: null,
    email_template: null,
  },
  {
    status_key: 'awaiting_signature',
    slack_enabled: true,
    slack_template: 'Proposal sent to {{customer_name}}',
    sms_enabled: false,
    sms_template: null,
    email_enabled: false,
    email_subject: null,
    email_template: null,
  },
  {
    status_key: 'awaiting_payment',
    slack_enabled: true,
    slack_template: '{{customer_name}} signed the contract - awaiting payment',
    sms_enabled: false,
    sms_template: null,
    email_enabled: false,
    email_subject: null,
    email_template: null,
  },
  {
    status_key: 'paid',
    slack_enabled: true,
    slack_template: '{{customer_name}} paid! Ready to schedule repair',
    sms_enabled: false,
    sms_template: null,
    email_enabled: false,
    email_subject: null,
    email_template: null,
  },
  {
    status_key: 'repair_scheduled',
    slack_enabled: true,
    slack_template: 'Repair scheduled for {{scheduled_date}}',
    sms_enabled: false,
    sms_template: null,
    email_enabled: false,
    email_subject: null,
    email_template: null,
  },
];

// Default portal copy
export const DEFAULT_PORTAL_COPY: Omit<PortalCopy, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    status_key: 'awaiting_signature',
    title: 'Signature Required',
    description: 'Please review and sign to proceed.',
    show_sign_button: true,
    show_pay_button: false,
    show_schedule_info: false,
    custom_message: null,
    alert_color: 'blue',
  },
  {
    status_key: 'awaiting_payment',
    title: 'Contract Signed',
    description: 'Ready to pay your deposit or balance.',
    show_sign_button: false,
    show_pay_button: true,
    show_schedule_info: false,
    custom_message: null,
    alert_color: 'green',
  },
  {
    status_key: 'paid',
    title: 'Payment Received',
    description: "Thank you! We'll be in touch to schedule your repair.",
    show_sign_button: false,
    show_pay_button: false,
    show_schedule_info: false,
    custom_message: null,
    alert_color: 'green',
  },
  {
    status_key: 'repair_scheduled',
    title: 'Repair Scheduled',
    description: 'Your repair appointment is confirmed.',
    show_sign_button: false,
    show_pay_button: false,
    show_schedule_info: true,
    custom_message: null,
    alert_color: 'green',
  },
];

// Default app config
export const DEFAULT_APP_CONFIG: Omit<AppConfig, 'id' | 'created_at' | 'updated_at'> = {
  portal_brand_name: 'Fence Boys',
  portal_logo_url: '/fence-boys-logo.jpg',
  portal_closed_message: 'This quote is no longer available. Please contact Fence Boys if you have questions.',
  dashboard_title: 'Repair Quotes Dashboard',
  deposit_percentage: 50,
  markup_percentage: 33,
  payout_colt_percentage: 75,
  payout_fb_percentage: 25,
  default_salesperson_name: 'Colt Stonerook',
};

// Type for status keys used throughout the app
export type QuoteStatus = 'scheduling_quote' | 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';

// Helper to get status color classes for Tailwind
export function getStatusColorClasses(color: string): { bg: string; text: string } {
  const colorMap: Record<string, { bg: string; text: string }> = {
    orange: { bg: 'bg-orange-100', text: 'text-orange-700' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-700' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
    green: { bg: 'bg-green-100', text: 'text-green-700' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
    red: { bg: 'bg-red-100', text: 'text-red-700' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-700' },
  };
  return colorMap[color] || colorMap.gray;
}

// Helper to get alert color classes for portal
export function getAlertColorClasses(color: string): { bg: string; border: string; text: string; icon: string } {
  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-500' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: 'text-orange-500' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: 'text-yellow-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', icon: 'text-purple-500' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', icon: 'text-teal-500' },
  };
  return colorMap[color] || colorMap.blue;
}
