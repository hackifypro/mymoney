import React, { useState, useEffect } from 'react';
import {
  Menu,
  PlusCircle,
  Sun,
  Moon,
  Clock,
  Shield,
  User,
  LogOut,
  Bell,
  AlertTriangle,
  X,
  Info,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useExpense } from '../../context/ExpenseContext';
import { NavTab } from './Sidebar';
import { formatDisplayDate, formatDisplayTime, getISTNow } from '../../lib/dateUtils';

interface NavbarProps {
  currentTab: NavTab;
  onOpenMobileMenu: () => void;
  onOpenAddModal: () => void;
  onSelectTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenMobileMenu,
  onOpenAddModal,
  onSelectTab,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();
  const { maintenanceSettings, notifications, dynamicSections } = useExpense();
  const [istTimeStr, setIstTimeStr] = useState('');
  const [istDateStr, setIstDateStr] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Active notifications for this user or all users
  const activeNotifs = notifications.filter(
    (n) => n.is_active && (!n.target_user_id || n.target_user_id === user?.uid)
  );

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const ist = getISTNow();
      const hours = String(ist.getHours()).padStart(2, '0');
      const minutes = String(ist.getMinutes()).padStart(2, '0');
      const seconds = String(ist.getSeconds()).padStart(2, '0');
      setIstTimeStr(formatDisplayTime(`${hours}:${minutes}:${seconds}`));

      const year = ist.getFullYear();
      const month = String(ist.getMonth() + 1).padStart(2, '0');
      const day = String(ist.getDate()).padStart(2, '0');
      setIstDateStr(formatDisplayDate(`${year}-${month}-${day}`));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const titles: Record<string, { title: string; subtitle: string; shortTitle: string }> = {
    dashboard: { title: 'Dashboard', shortTitle: 'Dashboard', subtitle: 'Overview & 4 Main Sections' },
    home: { title: 'Home Section', shortTitle: 'Home Money', subtitle: 'Money received & spent for home' },
    room: { title: 'Room Section', shortTitle: 'Room Expenses', subtitle: 'Gas, grocery, room rent & power bill' },
    other: { title: 'Other Expenses', shortTitle: 'Other Expenses', subtitle: 'Shopping, travel, food & personal' },
    people: { title: 'People Section (Udhar)', shortTitle: 'People (Udhar)', subtitle: 'Money given & received from people' },
    reports: { title: 'Reports & Analytics', shortTitle: 'Reports', subtitle: 'Expense charts & cashflow trends' },
    all_transactions: { title: 'All Transactions Ledger', shortTitle: 'All Ledger', subtitle: 'Searchable master ledger' },
    recycle_bin: { title: 'Recycle Bin & Recovery', shortTitle: 'Recycle Bin', subtitle: 'Soft-deleted transactions & safety recovery' },
    settings: { title: 'Settings & Profile', shortTitle: 'Settings', subtitle: 'User profile & preferences' },
    admin: { title: 'Admin Master Control Center', shortTitle: 'Admin Control', subtitle: 'Complete multi-user management, transactions & platform settings' },
  };

  // Check if currentTab is a dynamic custom section
  const customSec = dynamicSections.find((s) => s.id === currentTab);
  const currentInfo = customSec
    ? { title: customSec.name, shortTitle: customSec.name, subtitle: customSec.description || 'Custom Section' }
    : titles[currentTab] || { title: 'Dashboard', shortTitle: 'Dashboard', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Hamburger + Logo + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <img
            src="/logo.jpg"
            alt="My Money Manager Logo"
            className="w-8 h-8 rounded-lg object-cover lg:hidden border border-emerald-500/30 shrink-0"
          />

          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 truncate">
              <span className="sm:hidden">{currentInfo.shortTitle}</span>
              <span className="hidden sm:inline">{currentInfo.title}</span>
            </h2>
            <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 truncate">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: IST Clock + User Pill + Add Button + Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Admin Maintenance Mode Indicator */}
          {isAdmin && maintenanceSettings.isEnabled && (
            <div
              onClick={() => onSelectTab('admin')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-lg uppercase tracking-wider cursor-pointer shadow-sm animate-pulse"
              title="Maintenance Mode is Active! Normal users are blocked. Click to manage."
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Maintenance Active</span>
            </div>
          )}

          {/* Broadcast Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative cursor-pointer"
              title="Broadcast Notifications"
            >
              <Bell className="w-4 h-4" />
              {activeNotifs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-ping" />
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-500" />
                    <span>System Announcements</span>
                  </h4>
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {activeNotifs.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No active announcements.
                    </p>
                  ) : (
                    activeNotifs.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          n.type === 'maintenance'
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                            : n.type === 'warning'
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
                        }`}
                      >
                        <p className="font-bold">{n.title}</p>
                        <p className="text-[11px] opacity-90 leading-relaxed">{n.message}</p>
                        <span className="text-[9px] opacity-60 block pt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live IST clock */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 font-mono">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>{istDateStr}</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{istTimeStr} (IST)</span>
          </div>

          {/* User Badge */}
          {user && (
            <div
              onClick={() => onSelectTab(isAdmin ? 'admin' : 'settings')}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              title={isAdmin ? 'Open Admin Control' : 'View Profile Settings'}
            >
              <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="truncate max-w-[100px]">{user.displayName}</span>
              {isAdmin && (
                <span className="px-1 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                  Admin
                </span>
              )}
            </div>
          )}

          {/* Add Transaction Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>+ Add</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0 cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
