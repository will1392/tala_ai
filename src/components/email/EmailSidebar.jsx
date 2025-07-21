/**
 * Email Sidebar Component
 * 
 * Navigation and account management for email inbox
 */

import React, { useState } from 'react';
import {
  Mail,
  Inbox,
  Send,
  Archive,
  Trash2,
  Star,
  Tag,
  Plus,
  Settings,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';

const EmailSidebar = ({
  accounts,
  activeAccount,
  onAccountSelect,
  filters,
  onFilterChange,
  onComposeClick
}) => {
  const navigate = useNavigate();
  const [showAccounts, setShowAccounts] = useState(true);

  // Navigation items
  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: 12 },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 }
  ];

  // Labels
  const labels = [
    { id: 'booking', label: 'Bookings', color: 'bg-blue-500' },
    { id: 'inquiry', label: 'Inquiries', color: 'bg-green-500' },
    { id: 'important', label: 'Important', color: 'bg-red-500' },
    { id: 'newsletter', label: 'Newsletters', color: 'bg-gray-500' }
  ];

  // Get account status icon
  const getAccountStatusIcon = (account) => {
    if (!account.isHealthy) {
      return <AlertCircle size={14} className="text-red-500" />;
    }
    if (account.syncing) {
      return <Circle size={14} className="text-blue-500 animate-pulse" />;
    }
    return <CheckCircle size={14} className="text-green-500" />;
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Compose Button */}
      <div className="p-4">
        <button
          onClick={onComposeClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Compose
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2">
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onFilterChange({ ...filters, label: item.id })}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                filters.label === item.id
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.count && (
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Labels */}
        <div className="mt-6">
          <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Labels
          </h3>
          <div className="space-y-1">
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() => onFilterChange({ ...filters, label: label.id })}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  filters.label === label.id
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <span className={cn("w-3 h-3 rounded-full", label.color)} />
                <span className="text-sm">{label.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Email Accounts */}
        <div className="mt-6">
          <button
            onClick={() => setShowAccounts(!showAccounts)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300"
          >
            <span>Email Accounts</span>
            {showAccounts ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          {showAccounts && (
            <div className="mt-2 space-y-1">
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => onAccountSelect(account)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left",
                      activeAccount?.id === account.id
                        ? "bg-gray-800 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    {getAccountStatusIcon(account)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{account.email}</p>
                      <p className="text-xs text-gray-500">{account.provider}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500 text-sm">
                  No accounts connected
                </div>
              )}
              
              <button
                onClick={() => navigate('/settings/email')}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Plus size={14} />
                <span className="text-sm">Add Account</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => navigate('/settings/email')}
          className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Settings size={18} />
          <span className="text-sm">Email Settings</span>
        </button>
      </div>
    </div>
  );
};

export default EmailSidebar;