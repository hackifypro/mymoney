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
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
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
  const [istTimeStr, setIstTimeStr] = useState('');
  const [istDateStr, setIstDateStr] = useState('');

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

  const titles: Record<NavTab, { title: string; subtitle: string; shortTitle: string }> = {
    dashboard: { title: 'Dashboard', shortTitle: 'Dashboard', subtitle: 'Overview & 4 Main Sections' },
    home: { title: 'Home Section', shortTitle: 'Home Money', subtitle: 'Money received & spent for home' },
    room: { title: 'Room Section', shortTitle: 'Room Expenses', subtitle: 'Gas, grocery, room rent & power bill' },
    other: { title: 'Other Expenses', shortTitle: 'Other Expenses', subtitle: 'Shopping, travel, food & personal' },
    people: { title: 'People Section (Udhar)', shortTitle: 'People (Udhar)', subtitle: 'Money given & received from people' },
    reports: { title: 'Reports & Analytics', shortTitle: 'Reports', subtitle: 'Expense charts & cashflow trends' },
    all_transactions: { title: 'All Transactions Ledger', shortTitle: 'All Ledger', subtitle: 'Searchable master ledger' },
    settings: { title: 'Settings & Profile', shortTitle: 'Settings', subtitle: 'User profile & preferences' },
    admin: { title: 'Security Admin Dashboard', shortTitle: 'Admin Security', subtitle: 'Restricted user management & security controls' },
  };

  const currentInfo = titles[currentTab] || { title: 'Dashboard', shortTitle: 'Dashboard', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-3 transition-colors">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Hamburger + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

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
              title={isAdmin ? 'Open Admin Dashboard' : 'View Profile Settings'}
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
