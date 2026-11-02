import React, { useState } from 'react';
import {
  Home as HomeIcon,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  SlidersHorizontal,
  History,
  FileText,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../common/StatCard';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { Transaction, SortOrder } from '../../types';
import {
  formatINR,
  formatDisplayDate,
  formatDisplayTime,
  getCurrentISTDate,
  getCurrentISTTime,
} from '../../lib/dateUtils';

interface HomeSectionProps {
  onOpenAddModal: (category?: any, subcategory?: any) => void;
}

export const HomeSection: React.FC<HomeSectionProps> = ({ onOpenAddModal }) => {
  const { transactions, summary, addTransaction, deleteTransaction } = useExpense();
  const toast = useToast();

  // Tab mode for Home: 'overview' or 'history'
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  // Form states for embedded "Add Money Received From Home"
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedPurpose, setReceivedPurpose] = useState('');
  const [receivedDate, setReceivedDate] = useState(getCurrentISTDate());
  const [receivedTime, setReceivedTime] = useState(getCurrentISTTime());
  const [receivedNotes, setReceivedNotes] = useState('');
  const [isSubmittingReceived, setIsSubmittingReceived] = useState(false);

  // Form states for embedded "Record Home Expense"
  const [spentAmount, setSpentAmount] = useState('');
  const [spentReason, setSpentReason] = useState('');
  const [spentDate, setSpentDate] = useState(getCurrentISTDate());
  const [spentTime, setSpentTime] = useState(getCurrentISTTime());
  const [spentNotes, setSpentNotes] = useState('');
  const [isSubmittingSpent, setIsSubmittingSpent] = useState(false);

  // Filters & Search for Home History
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'received' | 'spent'>('all');
  const [sortBy, setSortBy] = useState<SortOrder>('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Home transactions only
  const homeTransactions = transactions.filter((t) => t.category === 'home');

  // Filtered home transactions for history
  const filteredHomeTransactions = homeTransactions.filter((tx) => {
    // Type filter
    if (typeFilter === 'received' && tx.subcategory !== 'received_home') return false;
    if (typeFilter === 'spent' && tx.subcategory !== 'home_expense') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        tx.title.toLowerCase().includes(q) ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.notes && tx.notes.toLowerCase().includes(q)) ||
        String(tx.amount).includes(q);
      if (!match) return false;
    }

    // Date range
    if (startDate && tx.transaction_date < startDate) return false;
    if (endDate && tx.transaction_date > endDate) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') return (b.transaction_date + b.transaction_time).localeCompare(a.transaction_date + a.transaction_time);
    if (sortBy === 'oldest') return (a.transaction_date + a.transaction_time).localeCompare(b.transaction_date + b.transaction_time);
    if (sortBy === 'highest_amount') return b.amount - a.amount;
    if (sortBy === 'lowest_amount') return a.amount - b.amount;
    return 0;
  });

  // Handle Add Money Received From Home submit
  const handleAddReceived = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(receivedAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!receivedPurpose.trim()) {
      toast.error('Purpose Required', 'Please enter purpose/reason for money received from home.');
      return;
    }

    try {
      setIsSubmittingReceived(true);
      await addTransaction({
        category: 'home',
        subcategory: 'received_home',
        transaction_type: 'income',
        amount: amt,
        title: `Received: ${receivedPurpose.trim()}`,
        description: `From Home — ${receivedPurpose.trim()}`,
        transaction_date: receivedDate,
        transaction_time: receivedTime,
        notes: receivedNotes.trim() || undefined,
      });

      toast.success('Money Received Added', `₹${amt.toLocaleString('en-IN')} recorded from Home.`);
      setReceivedAmount('');
      setReceivedPurpose('');
      setReceivedNotes('');
      setReceivedDate(getCurrentISTDate());
      setReceivedTime(getCurrentISTTime());
    } catch (err: any) {
      toast.error('Failed to add transaction', err.message);
    } finally {
      setIsSubmittingReceived(false);
    }
  };

  // Handle Add Home Expense submit
  const handleAddSpent = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(spentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!spentReason.trim()) {
      toast.error('Reason Required', 'Please enter what the money was requested or spent for.');
      return;
    }

    try {
      setIsSubmittingSpent(true);
      await addTransaction({
        category: 'home',
        subcategory: 'home_expense',
        transaction_type: 'expense',
        amount: amt,
        title: `Home Expense: ${spentReason.trim()}`,
        description: spentReason.trim(),
        transaction_date: spentDate,
        transaction_time: spentTime,
        notes: spentNotes.trim() || undefined,
      });

      toast.success('Home Expense Recorded', `₹${amt.toLocaleString('en-IN')} recorded.`);
      setSpentAmount('');
      setSpentReason('');
      setSpentNotes('');
      setSpentDate(getCurrentISTDate());
      setSpentTime(getCurrentISTTime());
    } catch (err: any) {
      toast.error('Failed to record expense', err.message);
    } finally {
      setIsSubmittingSpent(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(transactionToDelete.id);
      toast.success('Deleted', `Record "${transactionToDelete.title}" deleted.`);
      setTransactionToDelete(null);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* 3 Summary Cards Required by Prompt */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Money Received From Home"
          amount={summary.totalHomeReceived}
          subtitle="All funds sent from home"
          icon={ArrowDownLeft}
          variant="income"
          badge="Total Inflow"
        />

        <StatCard
          title="Total Money Spent"
          amount={summary.totalHomeSpent}
          subtitle="Spent for household purposes"
          icon={ArrowUpRight}
          variant="expense"
          badge="Total Outflow"
        />

        <StatCard
          title="Remaining Home Balance"
          amount={summary.remainingHomeBalance}
          subtitle="Received minus Spent"
          icon={HomeIcon}
          variant={summary.remainingHomeBalance >= 0 ? 'balance' : 'expense'}
          badge={summary.remainingHomeBalance >= 0 ? 'Surplus' : 'Deficit'}
        />
      </div>

      {/* Navigation sub-tabs: Overview / Quick Add vs View History */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Overview & Quick Add
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>View History ({homeTransactions.length})</span>
          </button>
        </div>

        <button
          onClick={() => onOpenAddModal('home')}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Full Modal Form</span>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Two Responsive In-line Forms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form 1: Add Money Received From Home */}
            <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 border-b border-emerald-100 dark:border-emerald-900/30">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Add Money Received From Home
                  </h3>
                  <p className="text-xs text-slate-500">Record incoming allowance or money sent by parents</p>
                </div>
              </div>

              <form onSubmit={handleAddReceived} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purpose / Reason <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={receivedPurpose}
                    onChange={(e) => setReceivedPurpose(e.target.value)}
                    placeholder="e.g. Monthly Expenses, Semester Fee, Emergency"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Date (Automatic IST)</label>
                    <input
                      type="date"
                      required
                      value={receivedDate}
                      onChange={(e) => setReceivedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Time (Automatic IST)</label>
                    <input
                      type="time"
                      step="1"
                      required
                      value={receivedTime}
                      onChange={(e) => setReceivedTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Optional Notes
                  </label>
                  <input
                    type="text"
                    value={receivedNotes}
                    onChange={(e) => setReceivedNotes(e.target.value)}
                    placeholder="e.g. Received in SBI account via NetBanking"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReceived}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  {isSubmittingReceived ? 'Recording...' : '+ Record Money Received'}
                </button>
              </form>
            </div>

            {/* Form 2: Record Home Expense */}
            <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-4 border-b border-rose-100 dark:border-rose-900/30">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-950/80 rounded-xl text-rose-600 dark:text-rose-400">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Record Home Expense
                  </h3>
                  <p className="text-xs text-slate-500">Record money spent specifically for household needs</p>
                </div>
              </div>

              <form onSubmit={handleAddSpent} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={spentAmount}
                      onChange={(e) => setSpentAmount(e.target.value)}
                      placeholder="e.g. 1200"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    What was the money requested or spent for? <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={spentReason}
                    onChange={(e) => setSpentReason(e.target.value)}
                    placeholder="e.g. Sent medicines home, Paid parents electricity bill"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Date (Automatic IST)</label>
                    <input
                      type="date"
                      required
                      value={spentDate}
                      onChange={(e) => setSpentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Time (Automatic IST)</label>
                    <input
                      type="time"
                      step="1"
                      required
                      value={spentTime}
                      onChange={(e) => setSpentTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Optional Notes
                  </label>
                  <input
                    type="text"
                    value={spentNotes}
                    onChange={(e) => setSpentNotes(e.target.value)}
                    placeholder="e.g. Courier tracking #12345"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingSpent}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold text-sm shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  {isSubmittingSpent ? 'Recording...' : '+ Record Home Expense'}
                </button>
              </form>
            </div>
          </div>

          {/* Recent Home Transactions Snippet */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recent Home Records
              </h4>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View Full History & Filters →
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {homeTransactions.slice(0, 5).map((tx) => {
                const isInc = tx.subcategory === 'received_home';
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {tx.title}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{formatDisplayDate(tx.transaction_date)}</span>
                        <span>•</span>
                        <span>{formatDisplayTime(tx.transaction_time)}</span>
                        {tx.notes && <span>• {tx.notes}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-sm ${isInc ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isInc ? '+' : '-'} {formatINR(tx.amount)}
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        {isInc ? 'Received' : 'Spent'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* History View with Filters, Search, and Edit/Delete */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search home transactions..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={typeFilter}
                  onChange={(e: any) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Home Transactions</option>
                  <option value="received">Money Received Only</option>
                  <option value="spent">Home Expenses Only</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="From Date"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="highest_amount">Sort: Highest Amount</option>
                  <option value="lowest_amount">Sort: Lowest Amount</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Home Transaction Records ({filteredHomeTransactions.length})
              </h3>
              {(searchQuery || typeFilter !== 'all' || startDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {filteredHomeTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No matching home records found.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredHomeTransactions.map((tx) => {
                  const isInc = tx.subcategory === 'received_home';
                  return (
                    <div
                      key={tx.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 sm:px-3 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            isInc
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                          }`}
                        >
                          {isInc ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {tx.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isInc
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                              }`}
                            >
                              {isInc ? 'Received' : 'Spent'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {tx.description}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              {formatDisplayDate(tx.transaction_date)}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-emerald-500" />
                              {formatDisplayTime(tx.transaction_time)}
                            </span>
                            {tx.notes && <span>• {tx.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
                        <div className="text-right">
                          <div
                            className={`text-base font-extrabold font-sans ${
                              isInc ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isInc ? '+' : '-'} {formatINR(tx.amount)}
                          </div>
                        </div>

                        {/* Edit and Delete buttons */}
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setTransactionToEdit(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                            title="Edit Record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setTransactionToDelete(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
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
        </div>
      )}

      {/* Edit Modal */}
      <EditTransactionModal
        isOpen={!!transactionToEdit}
        transaction={transactionToEdit}
        onClose={() => setTransactionToEdit(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!transactionToDelete}
        title="Delete Home Record"
        message="Are you sure you want to permanently delete this home record? Only this selected transaction will be removed, and balances will update automatically."
        itemDetails={
          transactionToDelete
            ? {
                title: transactionToDelete.title,
                amount: `₹${transactionToDelete.amount.toLocaleString('en-IN')}`,
                date: `${formatDisplayDate(transactionToDelete.transaction_date)} ${formatDisplayTime(transactionToDelete.transaction_time)}`,
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
