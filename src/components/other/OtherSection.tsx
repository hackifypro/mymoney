import React, { useState } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  MapPin,
  Tag,
  ArrowUpRight,
  TrendingDown,
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

interface OtherSectionProps {
  onOpenAddModal: (category?: any, subcategory?: any) => void;
}

export const OtherSection: React.FC<OtherSectionProps> = ({ onOpenAddModal }) => {
  const { transactions, summary, addTransaction, deleteTransaction } = useExpense();
  const toast = useToast();

  // In-line Add Form state
  const [amount, setAmount] = useState('');
  const [spentAt, setSpentAt] = useState('');
  const [spentFor, setSpentFor] = useState('');
  const [date, setDate] = useState(getCurrentISTDate());
  const [time, setTime] = useState(getCurrentISTTime());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOrder>('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter only other transactions
  const otherTransactions = transactions.filter((t) => t.category === 'other');

  // Filtered and sorted list
  const filteredOtherTransactions = otherTransactions.filter((tx) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        tx.title.toLowerCase().includes(q) ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.notes && tx.notes.toLowerCase().includes(q)) ||
        (tx.metadata?.spent_at && tx.metadata.spent_at.toLowerCase().includes(q)) ||
        (tx.metadata?.spent_for && tx.metadata.spent_for.toLowerCase().includes(q)) ||
        String(tx.amount).includes(q);
      if (!match) return false;
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return toast.error('Invalid Amount', 'Please enter a valid amount.');
    if (!spentAt.trim()) return toast.error('Location Required', 'Where was the money spent? (e.g. Swiggy, Metro, Amazon)');
    if (!spentFor.trim()) return toast.error('Reason Required', 'Why was it spent? (e.g. Travelling, Shopping, Food)');

    try {
      setIsSubmitting(true);
      await addTransaction({
        category: 'other',
        subcategory: 'other_expense',
        transaction_type: 'expense',
        amount: amt,
        title: spentFor.trim(),
        description: `Spent at ${spentAt.trim()} for ${spentFor.trim()}`,
        transaction_date: date,
        transaction_time: time,
        notes: notes.trim() || undefined,
        metadata: {
          spent_at: spentAt.trim(),
          spent_for: spentFor.trim(),
        },
      });

      toast.success('Other Expense Added', `₹${amt.toLocaleString('en-IN')} recorded for ${spentFor.trim()}.`);
      setAmount('');
      setSpentAt('');
      setSpentFor('');
      setNotes('');
      setDate(getCurrentISTDate());
      setTime(getCurrentISTTime());
    } catch (err: any) {
      toast.error('Failed to add expense', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(transactionToDelete.id);
      toast.success('Deleted', `Record "${transactionToDelete.title}" removed.`);
      setTransactionToDelete(null);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Top Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Other Expenses"
          amount={summary.totalOtherExpenses}
          subtitle="Non-home, non-room personal spending"
          icon={ShoppingBag}
          variant="expense"
          badge="Personal Outflow"
        />

        <div className="sm:col-span-2 p-5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-blue-950/30 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Personal, Travel & Lifestyle Expense Log
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              Capture day-to-day spending: public transit, online shopping, mobile recharges, dining out, and personal care.
            </p>
          </div>
          <button
            onClick={() => onOpenAddModal('other')}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* In-line Add Expense Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-600 rounded-xl">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add an Other Expense
              </h3>
              <p className="text-xs text-slate-500">Record amount, where spent, and why it was spent</p>
            </div>
          </div>

          {/* Quick presets from prompt: Travelling, Shopping, Mobile Recharge, Personal */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Presets:</span>
            <button
              type="button"
              onClick={() => {
                setAmount('200');
                setSpentAt('Metro / Bus');
                setSpentFor('Travelling');
              }}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            >
              Travelling ₹200
            </button>
            <button
              type="button"
              onClick={() => {
                setAmount('500');
                setSpentAt('Market / Mall');
                setSpentFor('Shopping');
              }}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            >
              Shopping ₹500
            </button>
            <button
              type="button"
              onClick={() => {
                setAmount('299');
                setSpentAt('MyJio / Airtel App');
                setSpentFor('Mobile Recharge');
              }}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            >
              Recharge ₹299
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹ INR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Where was money spent? <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={spentAt}
                onChange={(e) => setSpentAt(e.target.value)}
                placeholder="e.g. Metro Station, Swiggy, Amazon"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Why was it spent? <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={spentFor}
                onChange={(e) => setSpentFor(e.target.value)}
                placeholder="e.g. Travelling, Shopping, Food"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Date (Auto IST)</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Time (Auto IST)</label>
              <input
                type="time"
                step="1"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Optional Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid via UPI"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Record Other Expense'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* History, Search, Filters & Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Other Expense History ({filteredOtherTransactions.length})
            </h3>
            <p className="text-xs text-slate-500">Search by location, reason, notes, or date range</p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 w-40 sm:w-52"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_amount">Highest Amount</option>
              <option value="lowest_amount">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* List */}
        {filteredOtherTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No other expense records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredOtherTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 sm:px-3 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 shrink-0 mt-0.5">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {tx.title}
                      </span>
                      {tx.metadata?.spent_at && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {tx.metadata.spent_at}
                        </span>
                      )}
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
                    <div className="text-base font-extrabold text-rose-600 font-sans">
                      - {formatINR(tx.amount)}
                    </div>
                  </div>

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
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditTransactionModal
        isOpen={!!transactionToEdit}
        transaction={transactionToEdit}
        onClose={() => setTransactionToEdit(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!transactionToDelete}
        title="Delete Other Expense"
        message="Are you sure you want to permanently delete this expense? Only this selected transaction will be removed."
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
