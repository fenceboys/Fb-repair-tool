'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { SettingsForm } from '@/components/admin/SettingsForm';

export default function SettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Global Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure brand settings, pricing percentages, and default values.
          </p>
        </div>
        <SettingsForm />
      </div>
    </AdminLayout>
  );
}
