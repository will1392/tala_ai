import React from 'react';
import { Users } from 'lucide-react';

export function UserManagement() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-8 h-8" />
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">
          User management functionality coming soon.
        </p>
      </div>
    </div>
  );
}
