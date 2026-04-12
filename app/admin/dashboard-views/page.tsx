'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { DashboardViewEditor } from '@/components/admin/DashboardViewEditor';

export default function DashboardViewsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Dashboard Views</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage saved dashboard views with custom columns and filters.
          </p>
        </div>
        <DashboardViewEditor />
      </div>
    </AdminLayout>
  );
}
