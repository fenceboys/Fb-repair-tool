'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { NotificationTemplateEditor } from '@/components/admin/NotificationTemplateEditor';

export default function NotificationsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notification Templates</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure Slack message templates for each status change. Use merge tags to include dynamic content.
          </p>
        </div>
        <NotificationTemplateEditor />
      </div>
    </AdminLayout>
  );
}
