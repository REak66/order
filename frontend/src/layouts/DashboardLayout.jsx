import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Calendar,
  Settings,
  LogOut,
  Menu,
  User,
  X,
  UtensilsCrossed
} from 'lucide-react';
import { cn } from '../utils/cx';
import ThemeToggle from '../components/ThemeToggle';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Staff Management', path: '/admin/staff', icon: Users, shortLabel: 'Staff' },
    { label: 'Manual Order', path: '/admin/manual-order', icon: ClipboardList, shortLabel: 'Order' },
    { label: 'Lunch Reports', path: '/admin/reports', icon: FileText, shortLabel: 'Reports' },
    { label: 'Public Holidays', path: '/admin/holidays', icon: Calendar, shortLabel: 'Holidays' },
    { label: 'Settings', path: '/admin/settings', icon: Settings, shortLabel: 'Settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary-600 rounded-xl text-white shadow-md shadow-primary-500/25">
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">LunchOrder</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Admin Workspace</p>
          </div>
        </div>
        <button
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) => cn(
              "relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm",
              isActive
                ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold border-l-4 border-primary-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
            )}
            onClick={() => setIsSidebarOpen(false)}
          >
            {({ isActive }) => (
              <>
                <item.icon size={19} className={isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-400 dark:text-slate-500"} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Theme Toggle & Logout in Sidebar Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Appearance</span>
          <ThemeToggle />
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium cursor-pointer"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Mobile Sidebar overlay & drawer */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden motion-preset-fade motion-duration-200"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 lg:hidden shadow-2xl motion-preset-slide-right motion-duration-200 flex flex-col"
          >
            {renderSidebarContent()}
          </aside>
        </>
      )}

      {/* Desktop Sidebar (static) */}
      <aside className="hidden lg:block w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0">
        {renderSidebarContent()}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 transition-colors">
          <div className="flex items-center gap-3">
            <button
              className="p-2 -ml-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors lg:hidden cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Mobile Header Brand */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="p-1.5 bg-primary-600 rounded-lg text-white">
                <UtensilsCrossed size={16} />
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-base">LunchOrder</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 ml-auto">
            {/* Header Theme Toggle */}
            <ThemeToggle />

            {/* User Profile */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                  {admin?.username || 'Admin'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Administrator</span>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
                <User size={18} />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 pb-24 lg:pb-6 pb-safe">
          <Outlet />
        </main>

        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-colors"
          aria-label="Mobile Navigation"
        >
          <div className="grid grid-cols-6 h-[58px] items-stretch px-1">
            {navItems.map((item) => {
              const isItemActive = item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-150 relative",
                    isItemActive
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <div className={cn(
                    "p-1 rounded-xl transition-all",
                    isItemActive && "bg-primary-50 dark:bg-primary-950/50"
                  )}>
                    <Icon size={20} className={isItemActive ? "text-primary-600 dark:text-primary-400" : ""} />
                  </div>
                  <span className="text-[10px] leading-none mt-0.5 tracking-tight font-medium truncate max-w-[62px]">
                    {item.shortLabel || item.label}
                  </span>
                  {isItemActive && (
                    <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-primary-500" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;
