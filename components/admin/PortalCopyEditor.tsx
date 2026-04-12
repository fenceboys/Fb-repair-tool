'use client';

import { useState } from 'react';
import { usePortalCopy } from '@/hooks/usePortalCopy';
import { useStatusConfig } from '@/hooks/useStatusConfig';
import { PortalCopy, getStatusColorClasses, getAlertColorClasses } from '@/types/admin';

const ALERT_COLORS = ['blue', 'green', 'orange', 'red', 'yellow', 'purple', 'teal'];

export function PortalCopyEditor() {
  const { portalCopy, loading, error, updatePortalCopy, resetToDefaults } = usePortalCopy();
  const { statuses, loading: statusLoading } = useStatusConfig();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PortalCopy>>({});
  const [saving, setSaving] = useState(false);

  const handleEdit = (copy: PortalCopy) => {
    setEditingKey(copy.status_key);
    setEditForm({
      title: copy.title,
      description: copy.description,
      show_sign_button: copy.show_sign_button,
      show_pay_button: copy.show_pay_button,
      show_schedule_info: copy.show_schedule_info,
      custom_message: copy.custom_message,
      alert_color: copy.alert_color,
    });
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setSaving(true);
    await updatePortalCopy(editingKey, editForm);
    setEditingKey(null);
    setEditForm({});
    setSaving(false);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditForm({});
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all portal copy to defaults?')) {
      setSaving(true);
      await resetToDefaults();
      setSaving(false);
    }
  };

  if (loading || statusLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
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

  // Sort portal copy by status order
  const sortedCopy = [...portalCopy].sort((a, b) => {
    const statusA = statuses.find((s) => s.status_key === a.status_key);
    const statusB = statuses.find((s) => s.status_key === b.status_key);
    return (statusA?.sort_order || 0) - (statusB?.sort_order || 0);
  });

  return (
    <div className="space-y-4">
      {sortedCopy.map((copy) => {
        const status = statuses.find((s) => s.status_key === copy.status_key);
        const statusColorClasses = getStatusColorClasses(status?.color || 'gray');
        const isEditing = editingKey === copy.status_key;
        const alertColor = isEditing ? (editForm.alert_color || copy.alert_color) : copy.alert_color;
        const alertClasses = getAlertColorClasses(alertColor);

        return (
          <div key={copy.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColorClasses.bg} ${statusColorClasses.text}`}>
                {status?.label || copy.status_key}
              </span>
              {!isEditing && (
                <button
                  onClick={() => handleEdit(copy)}
                  className="px-3 py-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    {copy.status_key !== 'repair_scheduled' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alert Color
                        </label>
                        <select
                          value={editForm.alert_color || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, alert_color: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          {ALERT_COLORS.map((color) => (
                            <option key={color} value={color}>
                              {color.charAt(0).toUpperCase() + color.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Message (optional)
                    </label>
                    <textarea
                      value={editForm.custom_message || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, custom_message: e.target.value }))}
                      rows={2}
                      placeholder="Additional content to display below the description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  {copy.status_key !== 'repair_scheduled' && (
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.show_sign_button ?? false}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, show_sign_button: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Show Sign Button
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.show_pay_button ?? false}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, show_pay_button: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Show Pay Button
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.show_schedule_info ?? false}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, show_schedule_info: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Show Schedule Info
                      </label>
                    </div>
                  )}

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </label>
                    {copy.status_key === 'repair_scheduled' ? (
                      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">{editForm.title || 'Repair Scheduled!'}</h3>
                        <p className="text-gray-500 mb-6">{editForm.description || "Mark your calendar - we're coming to fix your fence"}</p>
                        <div className="bg-gray-50 rounded-xl py-6 px-8 mb-4">
                          <p className="text-2xl font-bold text-gray-900">Monday, April 14</p>
                          <p className="text-xl text-blue-600 font-semibold mt-1">10:00 AM</p>
                        </div>
                        {editForm.custom_message && (
                          <p className="text-sm text-gray-600">{editForm.custom_message}</p>
                        )}
                      </div>
                    ) : (
                      <div className={`rounded-lg border p-4 ${alertClasses.bg} ${alertClasses.border}`}>
                        <div className="flex items-center gap-3">
                          <svg className={`h-8 w-8 flex-shrink-0 ${alertClasses.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className={`font-semibold ${alertClasses.text}`}>{editForm.title}</p>
                            <p className={`text-sm ${alertClasses.icon}`}>{editForm.description}</p>
                          </div>
                        </div>
                        {editForm.custom_message && (
                          <p className={`mt-2 text-sm ${alertClasses.text}`}>{editForm.custom_message}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-blue-400"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Preview */}
                  {copy.status_key === 'repair_scheduled' ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">{copy.title || 'Repair Scheduled!'}</h3>
                      <p className="text-gray-500 mb-6">{copy.description || "Mark your calendar - we're coming to fix your fence"}</p>
                      <div className="bg-gray-50 rounded-xl py-6 px-8 mb-4">
                        <p className="text-2xl font-bold text-gray-900">Monday, April 14</p>
                        <p className="text-xl text-blue-600 font-semibold mt-1">10:00 AM</p>
                      </div>
                      {copy.custom_message && (
                        <p className="text-sm text-gray-600">{copy.custom_message}</p>
                      )}
                    </div>
                  ) : (
                    <div className={`rounded-lg border p-4 ${alertClasses.bg} ${alertClasses.border}`}>
                      <div className="flex items-center gap-3">
                        <svg className={`h-8 w-8 flex-shrink-0 ${alertClasses.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className={`font-semibold ${alertClasses.text}`}>{copy.title}</p>
                          <p className={`text-sm ${alertClasses.icon}`}>{copy.description}</p>
                        </div>
                      </div>
                      {copy.custom_message && (
                        <p className={`mt-2 text-sm ${alertClasses.text}`}>{copy.custom_message}</p>
                      )}
                    </div>
                  )}

                  {copy.status_key !== 'repair_scheduled' && (
                    <div className="flex gap-4 text-xs text-gray-500">
                      {copy.show_sign_button && <span>Sign Button</span>}
                      {copy.show_pay_button && <span>Pay Button</span>}
                      {copy.show_schedule_info && <span>Schedule Info</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
