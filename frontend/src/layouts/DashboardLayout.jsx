import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Briefcase, Users, Upload,
  LogOut, Menu, X, Zap, Bell, ChevronDown
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationsDropdown from '../components/NotificationsDropdown';
import Breadcrumb from '../components/Breadcrumb';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/resumes', icon: FileText, label: 'Resumes' },
  { to: '/resumes/upload', icon: Upload, label: 'Upload Resumes' },
  { to: '/jobs', icon: Briefcase, label: 'Job Openings' },
  { to: '/jobs/new', icon: Zap, label: 'Create Job' },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  const {
    user,
    logout,
    notifications,
    notificationsLoading,
    fetchNotifications,
    markNotificationRead,
  } = useAuthStore();

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openNotifications = async () => {
    const nextOpenState = !notificationsOpen;
    setNotificationsOpen(nextOpenState);
    setProfileOpen(false);

    if (nextOpenState) {
      const result = await fetchNotifications();
      if (!result.success) {
        toast.error(result.error || 'Failed to load notifications');
      }
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    const result = await markNotificationRead(notificationId);
    if (!result.success) {
      toast.error(result.error || 'Could not mark as read');
    }
  };

  const handleViewProfile = () => {
    setProfileOpen(false);
    navigate('/profile');
  };

  const handleEditProfile = () => {
    setProfileOpen(false);
    navigate('/profile');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
      setProfileOpen(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-6 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-sm leading-tight">AI Hiring</h1>
            <p className="text-slate-500 text-xs">Intelligence Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider px-3 mb-3">Navigation</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="border-t border-dark-700 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-display font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-900/20" disabled={isLoggingOut}>
          <LogOut size={18} />
          <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-dark-900 border-r border-dark-700 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-dark-900 border-r border-dark-700 z-10">
            <div className="absolute top-4 right-4">
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-dark-900 border-b border-dark-700 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
              <Menu size={20} />
            </button>
            <Breadcrumb />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={openNotifications}
                className="relative text-slate-400 hover:text-white p-2 rounded-lg hover:bg-dark-700 transition-colors"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-400 rounded-full" />
                )}
              </button>

              <NotificationsDropdown
                isOpen={notificationsOpen}
                isLoading={notificationsLoading}
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
              />
            </div>

            <div className="h-6 w-px bg-dark-700" />
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-dark-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-bold text-xs">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block text-sm text-slate-300">{user?.name || 'User'}</span>
                <ChevronDown size={14} className="text-slate-500" />
              </button>

              <ProfileDropdown
                isOpen={profileOpen}
                user={user}
                isLoggingOut={isLoggingOut}
                onViewProfile={handleViewProfile}
                onEditProfile={handleEditProfile}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
