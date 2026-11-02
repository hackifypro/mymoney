import React from 'react';
import {
  LayoutDashboard,
  Home as HomeIcon,
  DoorOpen,
  ShoppingBag,
  Users,
  BarChart3,
  ListOrdered,
  Settings,
  Wallet,
  Sun,
  Moon,
  PlusCircle,
  LogOut,
  Shield,
  User,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/dateUtils';

export type NavTab =
  | 'dashboard'
  | 'home'
  | 'room'
  | 'other'
  | 'people'
  | 'reports'
  | 'all_transactions'
  | 'settings'
  | 'admin';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, onOpenAddModal }) => {
  const { summary } = useExpense();
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'home' as NavTab, label: 'Home Money', icon: HomeIcon, countBadge: formatINR(summary.remainingHomeBalance) },
    { id: 'room' as NavTab, label: 'Room Expenses', icon: DoorOpen, countBadge: formatINR(summary.totalRoomExpenses) },
    { id: 'other' as NavTab, label: 'Other Expenses', icon: ShoppingBag, countBadge: formatINR(summary.totalOtherExpenses) },
    { id: 'people' as NavTab, label: 'People (Udhar)', icon: Users, countBadge: formatINR(summary.netPeopleBalance) },
    { id: 'reports' as NavTab, label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'all_transactions' as NavTab, label: 'All Transactions', icon: ListOrdered, badgeNum: summary.totalTransactionsCount },
    { id: 'settings' as NavTab, label: 'Settings & Profile', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({
      id: 'admin' as NavTab,
      label: 'Admin Security',
      icon: Shield,
    });
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">My Money</h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Personal Money Manager</p>
          </div>
        </div>

        {/* Available Balance Pill */}
        <div className="mt-5 p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-slate-800/60 rounded-xl border border-blue-200/60 dark:border-blue-900/50">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-medium">
            <span>Available Balance</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="text-xl font-extrabold text-blue-700 dark:text-blue-300 font-sans mt-0.5">
            {formatINR(summary.availableBalance)}
          </div>
        </div>

        {/* Quick Add Button */}
        <button
          onClick={onOpenAddModal}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;
          const isAdminItem = item.id === 'admin';

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? isAdminItem
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm border border-indigo-200/60 dark:border-indigo-800/40'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm border border-emerald-200/60 dark:border-emerald-800/40'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? isAdminItem
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                      : isAdminItem
                      ? 'text-indigo-500'
                      : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badgeNum !== undefined && (
                <span className="ml-2 px-2 py-0.5 text-[11px] font-bold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {item.badgeNum}
                </span>
              )}

              {isAdminItem && (
                <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  SEC
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Profile & Controls */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
        {/* User Profile Card */}
        <div
          onClick={() => onSelectTab(isAdmin ? 'admin' : 'settings')}
          className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          {isAdmin ? (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
              Admin
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
              User
            </span>
          )}
        </div>

        {/* Theme Toggle & Logout */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </>
            )}
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
