'use client';

import { useState } from 'react';
import { useStatusConfig } from '@/hooks/useStatusConfig';
import { StatusConfig, getStatusColorClasses } from '@/types/admin';

const AVAILABLE_COLORS = [
  'orange', 'gray', 'amber', 'blue', 'green', 'purple', 'teal', 'red', 'yellow', 'indigo', 'pink'
];

export function StatusEditor() {
  const { statuses, loading, error, updateStatus, reorderStatuses, resetToDefaults } = useStatusConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StatusConfig>>({});
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleEdit = (status: StatusConfig) => {
    setEditingId(status.id);
    setEditForm({
      label: status.label,
      color: status.color,
      show_in_dashboard_filter: status.show_in_dashboard_filter,
    });
  };

  const handleSave = async (statusKey: string) => {
    setSaving(true);
    await updateStatus(statusKey, editForm);
    setEditingId(null);
    setEditForm({});
    setSaving(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDragStart = (e: React.DragEvent, statusKey: string) => {
    setDraggedItem(statusKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetKey) {
      setDraggedItem(null);
      return;
    }

    const orderedKeys = statuses.map((s) => s.status_key);
    const draggedIndex = orderedKeys.indexOf(draggedItem);
    const targetIndex = orderedKeys.indexOf(targetKey);

    orderedKeys.splice(draggedIndex, 1);
    orderedKeys.splice(targetIndex, 0, draggedItem);

    await reorderStatuses(orderedKeys);
    setDraggedItem(null);
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all statuses to defaults? This will also reset notification templates and portal copy.')) {
      setSaving(true);
      await resetToDefaults();
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
              <div className="h-6 bg-gray-200 rounded flex-1"></div>
              <div className="h-6 w-20 bg-gray-200 rounded"></div>
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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">Drag to reorder. Click edit to change label and color.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {statuses.map((status) => {
            const isEditing = editingId === status.id;
            const colorClasses = getStatusColorClasses(isEditing ? (editForm.color || status.color) : status.color);

            return (
              <div
                key={status.id}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, status.status_key)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status.status_key)}
                className={`px-4 py-3 flex items-center gap-4 ${
                  draggedItem === status.status_key ? 'opacity-50' : ''
                } ${!isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                {/* Drag Handle */}
                {!isEditing && (
                  <div className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                )}

                {isEditing ? (
                  <>
                    {/* Edit Form */}
                    <div className="flex-1 flex items-center gap-4">
                      <input
                        type="text"
                        value={editForm.label || ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, label: e.target.value }))}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Status label"
                      />
                      <select
                        value={editForm.color || ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, color: e.target.value }))}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        {AVAILABLE_COLORS.map((color) => (
                          <option key={color} value={color}>
                            {color.charAt(0).toUpperCase() + color.slice(1)}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.show_in_dashboard_filter ?? true}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, show_in_dashboard_filter: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Show in filter
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(status.status_key)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-blue-400"
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Display */}
                    <div className="flex-1 flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses.bg} ${colorClasses.text}`}>
                        {status.label}
                      </span>
                      <span className="text-sm text-gray-500 font-mono">{status.status_key}</span>
                      {!status.show_in_dashboard_filter && (
                        <span className="text-xs text-gray-400">(hidden in filter)</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleEdit(status)}
                      className="px-3 py-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
