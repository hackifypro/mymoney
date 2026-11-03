import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDisplayDate, formatDisplayTime } from '../../lib/dateUtils';
import { Transaction } from '../../types';

export const RecycleBinSection: React.FC = () => {
  const { recycleBinTransactions, restoreTransaction, permanentDeleteTransaction } = useExpense();
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTxForPermanentDelete, setSelectedTxForPermanentDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEmptyingBin, setIsEmptyingBin] = useState(false);
  const [showEmptyBinConfirm, setShowEmptyBinConfirm] = useState(false);

  const filteredItems = recycleBinTransactions.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.person_name && item.person_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.user_email && item.user_email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleRestore = async (id: string, title: string) => {
    try {
      const ok = await restoreTransaction(id);
      if (ok) {
        toast.success('Record Restored', `"${title}" has been restored to your active ledger.`);
      } else {
        toast.error('Restore Failed', 'Unable to restore record.');
      }
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedTxForPermanentDelete) return;
    setIsDeleting(true);
    try {
      const ok = await permanentDeleteTransaction(selectedTxForPermanentDelete.id);
      if (ok) {
        toast.success('Permanently Deleted', `"${selectedTxForPermanentDelete.title}" was irreversibly purged.`);
        setSelectedTxForPermanentDelete(null);
      } else {
        toast.error('Deletion Failed', 'Unable to delete record.');
      }
    } catch (e: any) {
      toast.error('Error', e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEmptyBin = async () => {
    setIsEmptyingBin(true);
    try {
      let count = 0;
      for (const item of recycleBinTransactions) {
        await permanentDeleteTransaction(item.id);
        count++;
      }
      toast.success('Recycle Bin Emptied', `Purged ${count} records permanently.`);
      setShowEmptyBinConfirm(false);
    } catch (e: any) {
      toast.error('Error Emptying Bin', e.message);
    } finally {
      setIsEmptyingBin(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-900 shadow-sm shrink-0">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  Recycle Bin & Recovery
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {recycleBinTransactions.length} Items
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Soft-deleted financial entries are kept safely here. You can restore them anytime or purge permanently.
              </p>
            </div>
          </div>

          {recycleBinTransactions.length > 0 && (
            <button
              onClick={() => setShowEmptyBinConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Empty Recycle Bin</span>
            </button>
          )}
        </div>

        {/* Protection Note */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Zero Accidental Data Loss Protection
            </p>
            <p>
              When a transaction is deleted, it is never destroyed immediately. It moves to the Recycle Bin with its timestamp and audit metadata intact. Restoring returns it to your active ledger instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deleted records by title, person, or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48 py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <option value="all">All Categories</option>
          <option value="home">Home Money</option>
          <option value="room">Room Expenses</option>
          <option value="other">Other Expenses</option>
          <option value="people">People (Udhar)</option>
        </select>
      </div>

      {/* Deleted Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-900 shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            Recycle Bin is Empty
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'No deleted transactions match your current search filters.'
              : 'All your financial records are safe and active. Deleted transactions will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.category}
                    </span>
                    {item.subcategory && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 truncate">
                        {item.subcategory}
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-base font-black ${
                        item.transaction_type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.transaction_type === 'income' ? '+' : '-'}
                      {formatINR(item.amount)}
                    </p>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {item.title}
                </h4>

                {item.person_name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Person: {item.person_name}</span>
                  </p>
                )}

                {item.user_email && isAdmin && (
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                    Owner: {item.user_email}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Tx Date: {formatDisplayDate(item.transaction_date)}
                  </span>
                  {item.deleted_at && (
                    <span className="flex items-center gap-1 text-rose-500/80">
                      <Clock className="w-3 h-3" />
                      Deleted: {new Date(item.deleted_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleRestore(item.id, item.title)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>

                <button
                  onClick={() => setSelectedTxForPermanentDelete(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Permanent Delete */}
      {selectedTxForPermanentDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Permanently Purge Record?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  "{selectedTxForPermanentDelete.title}"
                </span>{' '}
                ({formatINR(selectedTxForPermanentDelete.amount)})? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setSelectedTxForPermanentDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handlePermanentDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Purging...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Empty Bin */}
      {showEmptyBinConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Empty Recycle Bin Completely?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This will permanently delete all {recycleBinTransactions.length} items from the Recycle Bin. This action is irreversible.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={isEmptyingBin}
                onClick={() => setShowEmptyBinConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isEmptyingBin}
                onClick={handleEmptyBin}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isEmptyingBin ? 'Purging All...' : 'Yes, Empty Bin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
