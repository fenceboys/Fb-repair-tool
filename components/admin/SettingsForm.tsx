'use client';

import { useState, useEffect } from 'react';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { AppConfig } from '@/types/admin';

export function SettingsForm() {
  const { config, loading, error, updateConfig, resetToDefaults } = useAdminConfig();
  const [formData, setFormData] = useState<Partial<AppConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (config) {
      setFormData({
        portal_brand_name: config.portal_brand_name,
        portal_logo_url: config.portal_logo_url,
        portal_closed_message: config.portal_closed_message,
        dashboard_title: config.dashboard_title,
        deposit_percentage: config.deposit_percentage,
        markup_percentage: config.markup_percentage,
        payout_colt_percentage: config.payout_colt_percentage,
        payout_fb_percentage: config.payout_fb_percentage,
        default_salesperson_name: config.default_salesperson_name,
      });
    }
  }, [config]);

  const handleChange = (field: keyof AppConfig, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await updateConfig(formData);
    setSaveStatus(success ? 'saved' : 'error');
    setSaving(false);

    if (success) {
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setSaving(true);
      const success = await resetToDefaults();
      setSaveStatus(success ? 'saved' : 'error');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Brand Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portal Brand Name
            </label>
            <input
              type="text"
              value={formData.portal_brand_name || ''}
              onChange={(e) => handleChange('portal_brand_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portal Logo URL
            </label>
            <input
              type="text"
              value={formData.portal_logo_url || ''}
              onChange={(e) => handleChange('portal_logo_url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Path to logo image (e.g., /fence-boys-logo.jpg)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dashboard Title
            </label>
            <input
              type="text"
              value={formData.dashboard_title || ''}
              onChange={(e) => handleChange('dashboard_title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portal Closed Message
            </label>
            <textarea
              value={formData.portal_closed_message || ''}
              onChange={(e) => handleChange('portal_closed_message', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Message shown when portal access is closed</p>
          </div>
        </div>
      </div>

      {/* Pricing Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Pricing Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deposit Percentage
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.deposit_percentage || 0}
                onChange={(e) => handleChange('deposit_percentage', parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Markup Percentage
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.markup_percentage || 0}
                onChange={(e) => handleChange('markup_percentage', parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Payout Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Colt Payout Percentage
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.payout_colt_percentage || 0}
                onChange={(e) => handleChange('payout_colt_percentage', parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fence Boys Payout Percentage
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.payout_fb_percentage || 0}
                onChange={(e) => handleChange('payout_fb_percentage', parseInt(e.target.value) || 0)}
                min={0}
                max={100}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Total: {(formData.payout_colt_percentage || 0) + (formData.payout_fb_percentage || 0)}%
          {(formData.payout_colt_percentage || 0) + (formData.payout_fb_percentage || 0) !== 100 && (
            <span className="text-orange-600 ml-2">(Should equal 100%)</span>
          )}
        </p>
      </div>

      {/* Default Values */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Default Values</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Salesperson Name
          </label>
          <input
            type="text"
            value={formData.default_salesperson_name || ''}
            onChange={(e) => handleChange('default_salesperson_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Used for auto-generating salesperson signature</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          Reset to Defaults
        </button>
        <div className="flex items-center gap-3">
          {saveStatus === 'saved' && (
            <span className="text-green-600 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-600 text-sm">Failed to save</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
