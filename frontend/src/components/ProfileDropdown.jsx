import React from 'react';
import { User, Settings, LogOut } from 'lucide-react';

export default function ProfileDropdown({
  isOpen,
  user,
  isLoggingOut,
  onViewProfile,
  onEditProfile,
  onLogout,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute right-0 top-12 w-64 rounded-xl border border-dark-700 bg-dark-900 shadow-2xl animate-slide-up z-30">
      <div className="px-4 py-3 border-b border-dark-700">
        <p className="text-sm font-medium text-slate-100 truncate">{user?.name || 'User'}</p>
        <p className="text-xs text-slate-500 truncate">{user?.email || 'No email available'}</p>
      </div>

      <div className="p-2">
        <button
          type="button"
          onClick={onViewProfile}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-slate-300 hover:bg-dark-800 hover:text-white transition-colors"
        >
          <User size={16} />
          <span>View Profile</span>
        </button>

        <button
          type="button"
          onClick={onEditProfile}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-slate-300 hover:bg-dark-800 hover:text-white transition-colors"
        >
          <Settings size={16} />
          <span>Edit Profile</span>
        </button>
      </div>

      <div className="p-2 border-t border-dark-700">
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors disabled:opacity-60"
        >
          <LogOut size={16} />
          <span>{isLoggingOut ? 'Signing out...' : 'Logout'}</span>
        </button>
      </div>
    </div>
  );
}
