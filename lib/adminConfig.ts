// Server-side admin configuration helpers
import { supabase } from './supabase';
import type { AppConfig, StatusConfig, NotificationTemplate, PortalCopy } from '@/types/admin';
import { DEFAULT_APP_CONFIG, DEFAULT_STATUS_CONFIG, DEFAULT_NOTIFICATION_TEMPLATES, DEFAULT_PORTAL_COPY } from '@/types/admin';

// Cache for config (refreshed on each page load)
let configCache: {
  appConfig: AppConfig | null;
  statusConfig: StatusConfig[] | null;
  notificationTemplates: NotificationTemplate[] | null;
  portalCopy: PortalCopy[] | null;
  lastFetch: number;
} = {
  appConfig: null,
  statusConfig: null,
  notificationTemplates: null,
  portalCopy: null,
  lastFetch: 0,
};

const CACHE_TTL = 60 * 1000; // 1 minute cache

function isCacheValid(): boolean {
  return Date.now() - configCache.lastFetch < CACHE_TTL;
}

// Get app config
export async function getAppConfig(): Promise<AppConfig> {
  if (configCache.appConfig && isCacheValid()) {
    return configCache.appConfig;
  }

  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      console.warn('Using default app config');
      return DEFAULT_APP_CONFIG as AppConfig;
    }

    configCache.appConfig = data;
    configCache.lastFetch = Date.now();
    return data;
  } catch {
    return DEFAULT_APP_CONFIG as AppConfig;
  }
}

// Get status config
export async function getStatusConfig(): Promise<StatusConfig[]> {
  if (configCache.statusConfig && isCacheValid()) {
    return configCache.statusConfig;
  }

  try {
    const { data, error } = await supabase
      .from('status_config')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_STATUS_CONFIG as StatusConfig[];
    }

    configCache.statusConfig = data;
    configCache.lastFetch = Date.now();
    return data;
  } catch {
    return DEFAULT_STATUS_CONFIG as StatusConfig[];
  }
}

// Get notification templates
export async function getNotificationTemplates(): Promise<NotificationTemplate[]> {
  if (configCache.notificationTemplates && isCacheValid()) {
    return configCache.notificationTemplates;
  }

  try {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*');

    if (error || !data || data.length === 0) {
      return DEFAULT_NOTIFICATION_TEMPLATES as NotificationTemplate[];
    }

    configCache.notificationTemplates = data;
    configCache.lastFetch = Date.now();
    return data;
  } catch {
    return DEFAULT_NOTIFICATION_TEMPLATES as NotificationTemplate[];
  }
}

// Get notification template by status
export async function getNotificationTemplateByStatus(statusKey: string): Promise<NotificationTemplate | undefined> {
  const templates = await getNotificationTemplates();
  return templates.find((t) => t.status_key === statusKey);
}

// Get portal copy
export async function getPortalCopy(): Promise<PortalCopy[]> {
  if (configCache.portalCopy && isCacheValid()) {
    return configCache.portalCopy;
  }

  try {
    const { data, error } = await supabase
      .from('portal_copy')
      .select('*');

    if (error || !data || data.length === 0) {
      return DEFAULT_PORTAL_COPY as PortalCopy[];
    }

    configCache.portalCopy = data;
    configCache.lastFetch = Date.now();
    return data;
  } catch {
    return DEFAULT_PORTAL_COPY as PortalCopy[];
  }
}

// Get portal copy by status
export async function getPortalCopyByStatus(statusKey: string): Promise<PortalCopy | undefined> {
  const copy = await getPortalCopy();
  return copy.find((c) => c.status_key === statusKey);
}

// Clear cache (useful after admin updates)
export function clearConfigCache(): void {
  configCache = {
    appConfig: null,
    statusConfig: null,
    notificationTemplates: null,
    portalCopy: null,
    lastFetch: 0,
  };
}

// Replace merge tags in a template string
export function replaceMergeTags(
  template: string,
  data: {
    customer_name?: string | null;
    phone?: string | null;
    address?: string | null;
    city_state?: string | null;
    quote_price?: number;
    deposit?: number;
    scheduled_date?: string | null;
    repair_description?: string | null;
  }
): string {
  let result = template;

  result = result.replace(/\{\{customer_name\}\}/g, data.customer_name || 'Customer');
  result = result.replace(/\{\{phone\}\}/g, data.phone || '');
  result = result.replace(/\{\{address\}\}/g, data.address || '');
  result = result.replace(/\{\{city_state\}\}/g, data.city_state || '');
  result = result.replace(/\{\{quote_price\}\}/g, data.quote_price ? `$${data.quote_price.toLocaleString()}` : '');
  result = result.replace(/\{\{deposit\}\}/g, data.deposit ? `$${data.deposit.toLocaleString()}` : '');

  if (data.scheduled_date) {
    const date = new Date(data.scheduled_date);
    const formatted = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    result = result.replace(/\{\{scheduled_date\}\}/g, formatted);
  } else {
    result = result.replace(/\{\{scheduled_date\}\}/g, '');
  }

  result = result.replace(/\{\{repair_description\}\}/g, data.repair_description || '');

  return result;
}
