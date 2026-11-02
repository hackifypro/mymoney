import React, { useState } from 'react';
import {
  Wallet,
  Home,
  DoorOpen,
  ShoppingBag,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Clock,
  Calendar,
  Trash2,
  Edit3,
  Receipt,
  Eye,
  ChevronRight,
  Flame,
  Apple,
  Building,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../common/StatCard';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { Transaction } from '../../types';
import { formatINR, formatDisplayDate, formatDisplayTime } from '../../lib/dateUtils';
import { NavTab } from '../common/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenAddModal: (category?: any, subcategory?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenAddModal }) => {
  const { transactions, summary, deleteTransaction } = useExpense();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Recent transactions (top 8)
  const recentTransactions = transactions.slice(0, 8);

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(transactionToDelete.id);
      toast.success(
        'Transaction Deleted',
        `"${transactionToDelete.title}" (₹${transactionToDelete.amount.toLocaleString('en-IN')}) was removed.`
      );
      setTransactionToDelete(null);
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete transaction');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20 lg:pb-8">
      {/* Top Welcome & Cashflow Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl text-white shadow-xl shadow-emerald-900/10">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personal Money Manager</span>
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold mt-2 tracking-tight">
            Available Balance: {formatINR(summary.availableBalance)}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-50/90 mt-1 font-medium">
            Total Income: {formatINR(summary.totalIncome)} · Total Spent: {formatINR(summary.totalExpenses)}
          </p>
        </div>

        <button
          onClick={() => onOpenAddModal()}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 rounded-2xl text-sm font-bold shadow-lg transition-all cursor-pointer w-full md:w-auto"
        >
          <PlusCircle className="w-4 h-4 text-emerald-600" />
          <span>+ Add New Transaction</span>
        </button>
      </div>

      {/* Admin Quick Link */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200">
              ADMIN
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Enterprise Security Administration is enabled for your account.
            </span>
          </div>
          <button
            onClick={() => onNavigate('admin')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold transition-all cursor-pointer self-start sm:self-auto"
          >
            Open Admin Dashboard →
          </button>
        </div>
      )}

      {/* =========================================================================
          START KARTE HI 4 BADE BADE OPTION: Home, Room, Other, People
          ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Main Categories</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full">
                4 Sections
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select any section to manage expenses or view dedicated history
            </p>
          </div>
        </div>

        {/* 4 Big Mobile-First Section Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* 1. HOME SECTION (बड़ा ऑप्शन 1) */}
          <div className="group relative bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform">
                  <Home className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Section 1
                </span>
              </div>

              <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-4">
                Home Section
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Track money received from home and expenses spent for household
              </p>

              {/* Home Balance Stats */}
              <div className="mt-4 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Received From Home:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-sans">
                    {formatINR(summary.totalHomeReceived)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Home Spent:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-sans">
                    {formatINR(summary.totalHomeSpent)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60 font-extrabold text-slate-900 dark:text-slate-100">
                  <span>Remaining Balance:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-sans">
                    {formatINR(summary.remainingHomeBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => onNavigate('home')}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <span>Open Home Section</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAddModal('home', 'received_home')}
                className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                + Add Home Money
              </button>
            </div>
          </div>

          {/* 2. ROOM SECTION (बड़ा ऑप्शन 2) */}
          <div className="group relative bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/60 hover:border-blue-500 dark:hover:border-blue-500 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform">
                  <DoorOpen className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Section 2
                </span>
              </div>

              <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-4">
                Room Section
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Gas LPG cylinder, groceries, monthly room rent & electricity bills
              </p>

              {/* Room Breakdown Stats */}
              <div className="mt-4 p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-1.5 text-xs">
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <div>Rent: <span className="font-bold text-slate-900 dark:text-slate-200">{formatINR(summary.totalRent)}</span></div>
                  <div>Gas: <span className="font-bold text-slate-900 dark:text-slate-200">{formatINR(summary.totalGas)}</span></div>
                  <div>Grocery: <span className="font-bold text-slate-900 dark:text-slate-200">{formatINR(summary.totalGrocery)}</span></div>
                  <div>Power: <span className="font-bold text-slate-900 dark:text-slate-200">{formatINR(summary.totalElectricity)}</span></div>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-blue-200/60 dark:border-blue-800/60 font-extrabold text-slate-900 dark:text-slate-100">
                  <span>Grand Total Room:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-sans">
                    {formatINR(summary.totalRoomExpenses)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => onNavigate('room')}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <span>Open Room Section</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAddModal('room')}
                className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                + Add Room Expense
              </button>
            </div>
          </div>

          {/* 3. OTHER EXPENSES (बड़ा ऑप्शन 3) */}
          <div className="group relative bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-900/60 hover:border-purple-500 dark:hover:border-purple-500 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-md shadow-purple-500/10 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Section 3
                </span>
              </div>

              <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-4">
                Other Expenses
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Travelling, shopping, mobile recharge, food & personal spending
              </p>

              {/* Other Expenses Stats */}
              <div className="mt-4 p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-1.5 text-xs">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Includes: Travel, Recharges, Food, Online orders
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-purple-200/60 dark:border-purple-800/60 font-extrabold text-slate-900 dark:text-slate-100">
                  <span>Total Other Spent:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-sans">
                    {formatINR(summary.totalOtherExpenses)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => onNavigate('other')}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <span>Open Other Expenses</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAddModal('other')}
                className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                + Add Other Expense
              </button>
            </div>
          </div>

          {/* 4. PEOPLE SECTION (बड़ा ऑप्शन 4) */}
          <div className="group relative bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/60 hover:border-amber-500 dark:hover:border-amber-500 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/10 group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Section 4
                </span>
              </div>

              <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-4">
                People Section
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Udhar Diya (Money Given) & Udhar Liya (Money Received)
              </p>

              {/* People Stats */}
              <div className="mt-4 p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Given (उधार दिया):</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-sans">
                    {formatINR(summary.totalMoneyGiven)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Received (वापस मिला):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-sans">
                    {formatINR(summary.totalMoneyReceived)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/60 dark:border-amber-800/60 font-extrabold text-slate-900 dark:text-slate-100">
                  <span>Outstanding Net:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-sans">
                    {formatINR(summary.netPeopleBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => onNavigate('people')}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <span>Open People Section</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAddModal('people', 'money_given')}
                className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                + Record Udhar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 8 Complete Financial Summary Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Overall Financial Overview
          </h3>
          <span className="text-xs text-slate-400">Live Calculated Totals</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Income"
            amount={summary.totalIncome}
            subtitle="Money received"
            icon={ArrowDownLeft}
            variant="income"
            badge="Incoming Funds"
            onClick={() => onNavigate('home')}
          />
          <StatCard
            title="Home Expenses"
            amount={summary.totalHomeSpent}
            subtitle={`Rem: ${formatINR(summary.remainingHomeBalance)}`}
            icon={Home}
            variant="expense"
            badge="Household"
            onClick={() => onNavigate('home')}
          />
          <StatCard
            title="Room Expenses"
            amount={summary.totalRoomExpenses}
            subtitle="Gas, Groceries, Rent, Power"
            icon={DoorOpen}
            variant="expense"
            badge="Room & Flat"
            onClick={() => onNavigate('room')}
          />
          <StatCard
            title="Other Expenses"
            amount={summary.totalOtherExpenses}
            subtitle="Travel, Shopping & Personal"
            icon={ShoppingBag}
            variant="expense"
            badge="Personal"
            onClick={() => onNavigate('other')}
          />
          <StatCard
            title="Money Given"
            amount={summary.totalMoneyGiven}
            subtitle="Udhar to people"
            icon={ArrowUpRight}
            variant="amber"
            badge="Udhar Diya"
            onClick={() => onNavigate('people')}
          />
          <StatCard
            title="Money Received"
            amount={summary.totalMoneyReceived}
            subtitle="Udhar collected back"
            icon={ArrowDownLeft}
            variant="income"
            badge="Udhar Liya"
            onClick={() => onNavigate('people')}
          />
          <StatCard
            title="Available Balance"
            amount={summary.availableBalance}
            subtitle="Income minus Total Expenses"
            icon={Wallet}
            variant="balance"
            badge="Net Cash Balance"
          />
          <StatCard
            title="Total Transactions"
            amount={summary.totalTransactionsCount}
            subtitle="All stored records"
            icon={Receipt}
            variant="neutral"
            badge="Records Count"
            onClick={() => onNavigate('all_transactions')}
          />
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest financial records with exact date, time, and category
            </p>
          </div>
          <button
            onClick={() => onNavigate('all_transactions')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
          >
            <span>View All ({transactions.length})</span>
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-sm">No transactions recorded yet.</p>
            <p className="text-xs mt-1">Click "+ Add New Transaction" to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {recentTransactions.map((tx) => {
              const isIncome = tx.transaction_type === 'income';
              const categoryBadgeColors = {
                home: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                room: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                other: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
                people: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
              }[tx.category];

              return (
                <div
                  key={tx.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 rounded-xl px-2 sm:px-3 transition-colors group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isIncome
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {tx.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${categoryBadgeColors}`}>
                          {tx.category} · {tx.subcategory.replace('_', ' ')}
                        </span>
                      </div>

                      {tx.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {tx.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          {formatDisplayDate(tx.transaction_date)}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          {formatDisplayTime(tx.transaction_time)}
                        </span>
                        {tx.person_name && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            • {tx.person_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
                    <div className="text-right">
                      <div
                        className={`text-base font-extrabold font-sans ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatINR(tx.amount)}
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        {tx.transaction_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setTransactionToEdit(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
                        title="Edit Record"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTransactionToDelete(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditTransactionModal
        isOpen={!!transactionToEdit}
        transaction={transactionToEdit}
        onClose={() => setTransactionToEdit(null)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!transactionToDelete}
        title="Delete Transaction"
        message="Are you sure you want to permanently delete this transaction? Only this specific record will be removed."
        itemDetails={
          transactionToDelete
            ? {
                title: transactionToDelete.title,
                amount: `₹${transactionToDelete.amount.toLocaleString('en-IN')}`,
                date: `${formatDisplayDate(transactionToDelete.transaction_date)} at ${formatDisplayTime(transactionToDelete.transaction_time)}`,
              }
            : undefined
        }
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTransactionToDelete(null)}
      />
    </div>
  );
};
