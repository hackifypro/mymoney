import React, { useState } from 'react';
import {
  FolderKanban,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../common/StatCard';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { Transaction, DynamicSection } from '../../types';
import {
  formatINR,
  formatDisplayDate,
  formatDisplayTime,
  getCurrentISTDate,
  getCurrentISTTime,
} from '../../lib/dateUtils';

interface DynamicCustomSectionProps {
  section: DynamicSection;
  onOpenAddModal: (category?: any, subcategory?: any) => void;
}

export const DynamicCustomSection: React.FC<DynamicCustomSectionProps> = ({
  section,
  onOpenAddModal,
}) => {
  const { transactions, deleteTransaction, addTransaction } = useExpense();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getCurrentISTDate());
  const [time, setTime] = useState(getCurrentISTTime());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter transactions belonging to this custom section
  const sectionTransactions = transactions.filter(
    (t) => t.category.toLowerCase() === section.id.toLowerCase()
  );

  const totalSpent = sectionTransactions.reduce((acc, curr) => acc + curr.amount, 0);

  const filteredTransactions = sectionTransactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      tx.title.toLowerCase().includes(q) ||
      (tx.description && tx.description.toLowerCase().includes(q)) ||
      (tx.notes && tx.notes.toLowerCase().includes(q))
    );
  });

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!title.trim()) {
      toast.error('Title Required', 'Please enter a title for this entry.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addTransaction({
        category: section.id as any,
        subcategory: `${section.id}_expense`,
        transaction_type: 'expense',
        amount: numAmount,
        title: title.trim(),
        transaction_date: date,
        transaction_time: time,
        notes: notes.trim() || undefined,
      });

      toast.success('Entry Added', `Successfully recorded ₹${numAmount} under ${section.name}`);
      setTitle('');
      setAmount('');
      setNotes('');
    } catch (err: any) {
      toast.error('Failed to Add', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(transactionToDelete.id);
      toast.success('Moved to Recycle Bin', 'Record moved to Recycle Bin.');
      setTransactionToDelete(null);
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {section.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Dynamic Section
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {section.description || 'Custom expense category managed dynamically by Admin.'}
          </p>
        </div>

        <button
          onClick={() => onOpenAddModal(section.id)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-600/20 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Entry</span>
        </button>
      </div>

      {/* Stat Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Spent"
          amount={totalSpent}
          subtitle={`${sectionTransactions.length} recorded entries`}
          icon={TrendingDown}
          variant="expense"
        />
      </div>

      {/* Inline Quick Add Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-emerald-500" />
          <span>Quick Record in {section.name}</span>
        </h3>

        <form onSubmit={handleQuickAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Title / Item *
            </label>
            <input
              type="text"
              placeholder="e.g. Tuition fee, Books..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Date & Time
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-2 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>

      {/* Transaction List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search in ${section.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <span className="text-xs text-slate-400">
            Showing {filteredTransactions.length} of {sectionTransactions.length} records
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No entries found in this section.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                      {tx.title}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{formatDisplayDate(tx.transaction_date)}</span>
                      <span>•</span>
                      <span>{formatDisplayTime(tx.transaction_time)}</span>
                      {tx.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{tx.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-bold text-sm sm:text-base text-rose-600 dark:text-rose-400">
                    -{formatINR(tx.amount)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTransactionToEdit(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTransactionToDelete(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Move to Recycle Bin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {transactionToEdit && (
        <EditTransactionModal
          isOpen={true}
          onClose={() => setTransactionToEdit(null)}
          transaction={transactionToEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {transactionToDelete && (
        <ConfirmModal
          isOpen={true}
          onCancel={() => setTransactionToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Move Record to Recycle Bin?"
          message={`Are you sure you want to delete "${transactionToDelete.title}" of ₹${transactionToDelete.amount}? It can be restored anytime from the Recycle Bin.`}
          confirmLabel="Move to Recycle Bin"
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};
