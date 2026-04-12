'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatusEditor } from '@/components/admin/StatusEditor';

export default function StatusesPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Status Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure status labels, colors, and display order for the dashboard.
          </p>
        </div>
        <StatusEditor />
      </div>
    </AdminLayout>
  );
}
