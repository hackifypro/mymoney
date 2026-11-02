import React from 'react';
import {
  LayoutDashboard,
  Home,
  DoorOpen,
  ShoppingBag,
  Users,
  BarChart3,
  ListOrdered,
  Settings,
  X,
  Wallet,
  Plus,
  Sun,
  Moon,
  LogOut,
  Shield,
  User,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { useExpense } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../lib/dateUtils';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  onOpenAddModal,
}) => {
  const { summary } = useExpense();
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'home' as NavTab, label: 'Home Section', icon: Home, badge: formatINR(summary.remainingHomeBalance) },
    { id: 'room' as NavTab, label: 'Room Section', icon: DoorOpen, badge: formatINR(summary.totalRoomExpenses) },
    { id: 'other' as NavTab, label: 'Other Expenses', icon: ShoppingBag, badge: formatINR(summary.totalOtherExpenses) },
    { id: 'people' as NavTab, label: 'People Section (Udhar)', icon: Users, badge: formatINR(summary.netPeopleBalance) },
    { id: 'reports' as NavTab, label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'all_transactions' as NavTab, label: 'All Transactions Ledger', icon: ListOrdered, count: summary.totalTransactionsCount },
    { id: 'settings' as NavTab, label: 'Settings & Profile', icon: Settings },
    ...(isAdmin ? [{ id: 'admin' as NavTab, label: 'Admin Security', icon: Shield }] : []),
  ];

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Slide-out Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">My Money</h2>
              <p className="text-[10px] text-slate-500">Personal Money Manager</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card in Mobile Drawer */}
        {user && (
          <div className="mx-4 mt-3 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                  {user.displayName}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
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
        )}

        {/* Available Balance Box */}
        <div className="p-4 mx-4 my-2.5 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-slate-800/60 rounded-xl border border-blue-200/60 dark:border-blue-900/50">
          <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Available Balance</span>
          <div className="text-xl font-extrabold text-blue-700 dark:text-blue-300 mt-0.5">
            {formatINR(summary.availableBalance)}
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Appearance</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
            >
              {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Floating Action Button (FAB) for Mobile Quick Add */}
      <div className="fixed bottom-16 right-4 z-40 lg:hidden">
        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xl shadow-emerald-600/40 transition-transform p-3.5"
          aria-label="Add Transaction"
          title="Add Transaction"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Fixed Bottom Navigation for Mobile (All 4 Core Sections + Dashboard) */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 lg:hidden px-1 py-1 flex items-center justify-around shadow-lg">
        {/* 1. Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] font-medium transition-colors ${
            currentTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/60 dark:bg-emerald-950/40'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span className="truncate">Home</span>
        </button>

        {/* 2. Home Section */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] font-medium transition-colors ${
            currentTab === 'home'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/60 dark:bg-emerald-950/40'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span className="truncate">Ghar</span>
        </button>

        {/* 3. Room Section */}
        <button
          onClick={() => onSelectTab('room')}
          className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] font-medium transition-colors ${
            currentTab === 'room'
              ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/60 dark:bg-blue-950/40'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <DoorOpen className="w-4 h-4 mb-0.5" />
          <span className="truncate">Room</span>
        </button>

        {/* 4. Other Expenses */}
        <button
          onClick={() => onSelectTab('other')}
          className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] font-medium transition-colors ${
            currentTab === 'other'
              ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-50/60 dark:bg-purple-950/40'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4 mb-0.5" />
          <span className="truncate">Other</span>
        </button>

        {/* 5. People Section (Udhar) */}
        <button
          onClick={() => onSelectTab('people')}
          className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl text-[10px] font-medium transition-colors ${
            currentTab === 'people'
              ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50/60 dark:bg-amber-950/40'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span className="truncate">Udhar</span>
        </button>
      </div>
    </>
  );
};
