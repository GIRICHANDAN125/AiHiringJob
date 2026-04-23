import React from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString();
}

export default function NotificationsDropdown({
  isOpen,
  isLoading,
  notifications,
  onMarkAsRead,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute right-0 top-12 w-80 rounded-xl border border-dark-700 bg-dark-900 shadow-2xl animate-slide-up z-30">
      <div className="px-4 py-3 border-b border-dark-700">
        <p className="text-sm font-semibold text-slate-100">Notifications</p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications...</div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-dark-800 flex items-center justify-center text-slate-500">
              <Bell size={18} />
            </div>
            <p className="text-sm text-slate-400">No notifications yet</p>
            <p className="text-xs text-slate-500 mt-1">You are all caught up.</p>
          </div>
        )}

        {!isLoading && notifications.length > 0 && (
          <div className="p-2 space-y-1">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg px-3 py-2 border transition-colors ${
                  item.is_read
                    ? 'bg-dark-900 border-dark-800'
                    : 'bg-primary-900/10 border-primary-900/30'
                }`}
              >
                <p className="text-sm text-slate-200">{item.message}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">{formatTime(item.created_at)}</span>
                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={() => onMarkAsRead(item.id)}
                      className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                    >
                      <CheckCircle2 size={14} />
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
