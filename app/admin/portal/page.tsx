'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { PortalCopyEditor } from '@/components/admin/PortalCopyEditor';

export default function PortalPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Portal Copy</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure customer-facing content for each quote status. This controls what customers see in the portal.
          </p>
        </div>
        <PortalCopyEditor />
      </div>
    </AdminLayout>
  );
}
