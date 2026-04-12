'use client';

import { useState } from 'react';
import { useDashboardViews, AVAILABLE_COLUMNS, FILTER_OPERATORS } from '@/hooks/useDashboardViews';
import { useStatusConfig } from '@/hooks/useStatusConfig';
import { DashboardView, DashboardColumn, DashboardFilter } from '@/types/admin';

export function DashboardViewEditor() {
  const { views, loading, error, createView, updateView, deleteView, setDefaultView } = useDashboardViews();
  const { statuses } = useStatusConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DashboardView>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setEditForm({
      name: 'New View',
      sort_order: views.length + 1,
      is_default: false,
      columns: AVAILABLE_COLUMNS.slice(0, 5).map((col, i) => ({
        field: col.field,
        visible: true,
        order: i + 1,
      })),
      filters: [],
      default_sort_field: 'created_at',
      default_sort_direction: 'desc',
    });
  };

  const handleEdit = (view: DashboardView) => {
    setIsCreating(false);
    setEditingId(view.id);
    setEditForm({
      name: view.name,
      columns: view.columns,
      filters: view.filters,
      default_sort_field: view.default_sort_field,
      default_sort_direction: view.default_sort_direction,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    if (isCreating) {
      await createView(editForm as Omit<DashboardView, 'id' | 'created_at' | 'updated_at'>);
    } else if (editingId) {
      await updateView(editingId, editForm);
    }
    setEditingId(null);
    setEditForm({});
    setIsCreating(false);
    setSaving(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this view?')) {
      await deleteView(id);
    }
  };

  const toggleColumn = (field: string) => {
    const columns = editForm.columns || [];
    const existingIndex = columns.findIndex((c) => c.field === field);

    if (existingIndex >= 0) {
      // Toggle visibility
      const newColumns = [...columns];
      newColumns[existingIndex] = {
        ...newColumns[existingIndex],
        visible: !newColumns[existingIndex].visible,
      };
      setEditForm((prev) => ({ ...prev, columns: newColumns }));
    } else {
      // Add column
      setEditForm((prev) => ({
        ...prev,
        columns: [...columns, { field, visible: true, order: columns.length + 1 }],
      }));
    }
  };

  const addFilter = () => {
    const filters = editForm.filters || [];
    setEditForm((prev) => ({
      ...prev,
      filters: [
        ...filters,
        { field: 'status', operator: 'equals' as const, value: '' },
      ],
    }));
  };

  const updateFilter = (index: number, updates: Partial<DashboardFilter>) => {
    const filters = [...(editForm.filters || [])];
    filters[index] = { ...filters[index], ...updates } as DashboardFilter;
    setEditForm((prev) => ({ ...prev, filters }));
  };

  const removeFilter = (index: number) => {
    const filters = [...(editForm.filters || [])];
    filters.splice(index, 1);
    setEditForm((prev) => ({ ...prev, filters }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
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

  const isEditing = editingId !== null || isCreating;

  return (
    <div className="space-y-4">
      {/* Views List */}
      {!isEditing && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {views.map((view) => (
                <div
                  key={view.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{view.name}</span>
                    {view.is_default && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        Default
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {view.columns.filter((c) => c.visible).length} columns
                      {view.filters.length > 0 && `, ${view.filters.length} filters`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!view.is_default && (
                      <button
                        onClick={() => setDefaultView(view.id)}
                        className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(view)}
                      className="px-3 py-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    {views.length > 1 && (
                      <button
                        onClick={() => handleDelete(view.id)}
                        className="px-3 py-1.5 text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New View
          </button>
        </>
      )}

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {isCreating ? 'Create New View' : 'Edit View'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  View Name
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Column Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visible Columns
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COLUMNS.map((col) => {
                    const isVisible = editForm.columns?.some((c) => c.field === col.field && c.visible);
                    return (
                      <button
                        key={col.field}
                        type="button"
                        onClick={() => toggleColumn(col.field)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isVisible
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {col.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filters
                </label>
                <div className="space-y-2">
                  {(editForm.filters || []).map((filter, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={filter.field}
                        onChange={(e) => updateFilter(index, { field: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {AVAILABLE_COLUMNS.map((col) => (
                          <option key={col.field} value={col.field}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(index, { operator: e.target.value as DashboardFilter['operator'] })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {FILTER_OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      {filter.field === 'status' ? (
                        <select
                          value={String(filter.value)}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Select status...</option>
                          {statuses.map((s) => (
                            <option key={s.status_key} value={s.status_key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={String(filter.value)}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      )}
                      <button
                        onClick={() => removeFilter(index)}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFilter}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add Filter
                  </button>
                </div>
              </div>

              {/* Sort Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Sort Field
                  </label>
                  <select
                    value={editForm.default_sort_field || 'created_at'}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, default_sort_field: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {AVAILABLE_COLUMNS.map((col) => (
                      <option key={col.field} value={col.field}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Direction
                  </label>
                  <select
                    value={editForm.default_sort_direction || 'desc'}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, default_sort_direction: e.target.value as 'asc' | 'desc' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {saving ? 'Saving...' : isCreating ? 'Create View' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
