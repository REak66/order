import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  Menu,
  User,
  X
} from 'lucide-react';
import { cn } from '../utils/cx';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Staff Management', path: '/staff', icon: Users },
    { label: 'Manual Order', path: '/manual-order', icon: ClipboardList },
    { label: 'Lunch Reports', path: '/reports', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-500">LunchOrder</h1>
        <button
          className="lg:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 overflow-hidden",
              isActive
                ? "text-primary-600 dark:text-primary-400 font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
            )}
            onClick={() => setIsSidebarOpen(false)}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute inset-0 bg-primary-50 dark:bg-primary-900/10 border-l-4 border-primary-500 z-0 motion-preset-fade motion-duration-3000"
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  <item.icon size={20} className={isActive ? "text-primary-600 dark:text-primary-400" : ""} />
                  <span>{item.label}</span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Mobile Sidebar overlay & drawer */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden motion-preset-fade motion-duration-3000"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 lg:hidden motion-preset-fade motion-duration-3000"
          >
            {renderSidebarContent()}
          </aside>
        </>
      )}

      {/* Desktop Sidebar (static) */}
      <aside className="hidden lg:block w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0">
        {renderSidebarContent()}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
          <button
            className="p-2 lg:hidden text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-800 dark:text-white">{admin?.username}</span>
              <span className="text-xs text-slate-500">Administrator</span>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <User size={20} className="text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
