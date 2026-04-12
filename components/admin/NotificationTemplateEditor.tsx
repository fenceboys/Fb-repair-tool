'use client';

import { useState, useRef } from 'react';
import { useNotificationTemplates, replaceMergeTags } from '@/hooks/useNotificationTemplates';
import { useStatusConfig } from '@/hooks/useStatusConfig';
import { NotificationTemplate, getStatusColorClasses } from '@/types/admin';
import { MergeTagButton } from './MergeTagButton';

export function NotificationTemplateEditor() {
  const { templates, loading, error, updateTemplate, resetToDefaults } = useNotificationTemplates();
  const { statuses, loading: statusLoading } = useStatusConfig();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NotificationTemplate>>({});
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sample data for preview
  const sampleData = {
    customer_name: 'John Smith',
    phone: '(555) 123-4567',
    address: '123 Main St',
    city_state: 'Indianapolis, IN',
    quote_price: 2500,
    deposit: 1250,
    scheduled_date: new Date().toISOString(),
    repair_description: 'Fence repair',
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingKey(template.status_key);
    setEditForm({
      slack_enabled: template.slack_enabled,
      slack_template: template.slack_template,
    });
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setSaving(true);
    await updateTemplate(editingKey, editForm);
    setEditingKey(null);
    setEditForm({});
    setSaving(false);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditForm({});
  };

  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = editForm.slack_template || '';
    const newValue = currentValue.substring(0, start) + tag + currentValue.substring(end);

    setEditForm((prev) => ({ ...prev, slack_template: newValue }));

    // Set cursor position after the inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all notification templates to defaults?')) {
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
              <div className="h-20 bg-gray-200 rounded"></div>
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

  // Sort templates by status order
  const sortedTemplates = [...templates].sort((a, b) => {
    const statusA = statuses.find((s) => s.status_key === a.status_key);
    const statusB = statuses.find((s) => s.status_key === b.status_key);
    return (statusA?.sort_order || 0) - (statusB?.sort_order || 0);
  });

  return (
    <div className="space-y-4">
      {sortedTemplates.map((template) => {
        const status = statuses.find((s) => s.status_key === template.status_key);
        const colorClasses = getStatusColorClasses(status?.color || 'gray');
        const isEditing = editingKey === template.status_key;

        return (
          <div key={template.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses.bg} ${colorClasses.text}`}>
                  {status?.label || template.status_key}
                </span>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={isEditing ? (editForm.slack_enabled ?? true) : template.slack_enabled}
                    onChange={(e) => {
                      if (isEditing) {
                        setEditForm((prev) => ({ ...prev, slack_enabled: e.target.checked }));
                      } else {
                        updateTemplate(template.status_key, { slack_enabled: e.target.checked });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Slack enabled
                </label>
              </div>
              {!isEditing && (
                <button
                  onClick={() => handleEdit(template)}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slack Message Template
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={editForm.slack_template || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, slack_template: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insert Merge Tag
                    </label>
                    <MergeTagButton onInsert={handleInsertTag} />
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </label>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-800 border border-gray-200">
                      {replaceMergeTags(editForm.slack_template || '', sampleData)}
                    </div>
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
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 font-mono bg-gray-50 px-3 py-2 rounded">
                    {template.slack_template}
                  </p>
                  <p className="text-xs text-gray-500">
                    Preview: {replaceMergeTags(template.slack_template, sampleData)}
                  </p>
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
