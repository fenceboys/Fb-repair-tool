'use client';

import { useState } from 'react';
import { usePortalCopy } from '@/hooks/usePortalCopy';
import { useStatusConfig } from '@/hooks/useStatusConfig';
import { PortalCopy, getStatusColorClasses } from '@/types/admin';

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

  // Render status-specific preview
  const renderStatusPreview = (statusKey: string, title: string, description: string, customMessage?: string | null) => {
    if (statusKey === 'awaiting_signature') {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-1">{title || 'Signature Required'}</h3>
          <p className="text-gray-500 mb-6">{description || 'Please review your quote and sign below to proceed'}</p>
          <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
            <p className="text-sm text-blue-800">{customMessage || 'By signing, you agree to the repair work and pricing outlined in your quote.'}</p>
          </div>
        </div>
      );
    }

    if (statusKey === 'awaiting_payment') {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-1">{title || 'Contract Signed!'}</h3>
          <p className="text-gray-500 mb-6">{description || 'Thank you! Complete your payment to get scheduled.'}</p>
          <div className="bg-gray-50 rounded-xl py-5 px-6 mb-4">
            <p className="text-sm text-gray-500 mb-1">Deposit Due</p>
            <p className="text-3xl font-bold text-gray-900">$1,250.00</p>
          </div>
          {customMessage && <p className="text-sm text-gray-600 mb-4">{customMessage}</p>}
          <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Pay Now
          </button>
        </div>
      );
    }

    if (statusKey === 'paid') {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-1">{title || 'Payment Received!'}</h3>
          <p className="text-gray-500 mb-6">{description || "Thank you! We'll contact you soon to schedule your repair."}</p>
          <div className="bg-green-50 rounded-xl p-5 border border-green-100">
            <p className="text-sm text-green-800">{customMessage || 'Our team will reach out within 1-2 business days to schedule your repair appointment.'}</p>
          </div>
        </div>
      );
    }

    if (statusKey === 'repair_scheduled') {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-1">{title || 'Repair Scheduled!'}</h3>
          <p className="text-gray-500 mb-6">{description || "Mark your calendar - we're coming to fix your fence"}</p>
          <div className="bg-gray-50 rounded-xl py-6 px-8 mb-4">
            <p className="text-2xl font-bold text-gray-900">Monday, April 14</p>
            <p className="text-xl text-blue-600 font-semibold mt-1">10:00 AM</p>
          </div>
          {customMessage && <p className="text-sm text-gray-600">{customMessage}</p>}
        </div>
      );
    }

    // Default fallback (shouldn't be used for main statuses)
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-500">{description}</p>
        {customMessage && <p className="text-sm text-gray-600 mt-4">{customMessage}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {sortedCopy.map((copy) => {
        const status = statuses.find((s) => s.status_key === copy.status_key);
        const statusColorClasses = getStatusColorClasses(status?.color || 'gray');
        const isEditing = editingKey === copy.status_key;

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


                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </label>
                    {renderStatusPreview(copy.status_key, editForm.title || '', editForm.description || '', editForm.custom_message)}
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
                  {renderStatusPreview(copy.status_key, copy.title, copy.description, copy.custom_message)}
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
