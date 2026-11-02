import React, { useState, useMemo } from 'react';
import {
  ListOrdered,
  Search,
  Filter,
  Calendar,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  Trash2,
  Download,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Home,
  DoorOpen,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import {
  Transaction,
  TransactionCategory,
  TransactionSubcategory,
  TransactionType,
  SortOrder,
} from '../../types';
import {
  formatINR,
  formatDisplayDate,
  formatDisplayTime,
  getPresetDateRange,
} from '../../lib/dateUtils';

interface AllTransactionsSectionProps {
  onOpenAddModal: (category?: any, subcategory?: any) => void;
}

export const AllTransactionsSection: React.FC<AllTransactionsSectionProps> = ({ onOpenAddModal }) => {
  const { transactions, deleteTransaction } = useExpense();
  const toast = useToast();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<SortOrder>('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and sort execution
  const filteredList = useMemo(() => {
    let list = [...transactions];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        return (
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.person_name && t.person_name.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (t.metadata?.grocery_item && t.metadata.grocery_item.toLowerCase().includes(q)) ||
          (t.metadata?.spent_at && t.metadata.spent_at.toLowerCase().includes(q)) ||
          (t.metadata?.spent_for && t.metadata.spent_for.toLowerCase().includes(q)) ||
          String(t.amount).includes(q)
        );
      });
    }

    // Category
    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }

    // Subcategory
    if (selectedSubcategory !== 'all') {
      list = list.filter((t) => t.subcategory === selectedSubcategory);
    }

    // Type
    if (selectedType !== 'all') {
      list = list.filter((t) => t.transaction_type === selectedType);
    }

    // Min Amount
    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) list = list.filter((t) => t.amount >= min);
    }

    // Max Amount
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) list = list.filter((t) => t.amount <= max);
    }

    // Date
    if (datePreset === 'custom' && startDate && endDate) {
      list = list.filter((t) => t.transaction_date >= startDate && t.transaction_date <= endDate);
    } else if (datePreset !== 'all') {
      const range = getPresetDateRange(datePreset);
      if (range.start && range.end) {
        list = list.filter((t) => t.transaction_date >= range.start && t.transaction_date <= range.end);
      }
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.transaction_date + ' ' + b.transaction_time).localeCompare(a.transaction_date + ' ' + a.transaction_time);
        case 'oldest':
          return (a.transaction_date + ' ' + a.transaction_time).localeCompare(b.transaction_date + ' ' + b.transaction_time);
        case 'highest_amount':
          return b.amount - a.amount;
        case 'lowest_amount':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return list;
  }, [
    transactions,
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectedType,
    minAmount,
    maxAmount,
    datePreset,
    startDate,
    endDate,
    sortBy,
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedType('all');
    setMinAmount('');
    setMaxAmount('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
    setCurrentPage(1);
  };

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
      toast.error('Delete Failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      toast.error('No Data', 'No transactions to export.');
      return;
    }

    const headers = [
      'Transaction ID',
      'Date (IST)',
      'Time (IST)',
      'Category',
      'Subcategory',
      'Type',
      'Title',
      'Amount (INR)',
      'Person Name',
      'Description',
      'Notes',
    ];

    const rows = filteredList.map((t) => [
      t.id,
      t.transaction_date,
      t.transaction_time,
      t.category,
      t.subcategory,
      t.transaction_type,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.person_name || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `All_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export Completed', 'Transactions downloaded successfully.');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-emerald-600" />
            <span>Master Financial Ledger</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete searchable database of all transactions with strict ID deletion and editing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export ({filteredList.length})</span>
          </button>
          <button
            onClick={() => onOpenAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <span>+ Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters & Search</span>
          </span>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs text-rose-500 hover:underline font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search title, description, person..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 2. Category Selector */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory('all');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Categories</option>
              <option value="home">Home Money</option>
              <option value="room">Room Expenses</option>
              <option value="other">Other Expenses</option>
              <option value="people">People (Udhar)</option>
            </select>
          </div>

          {/* 3. Transaction Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Types (Income & Expenses)</option>
              <option value="income">Income Only (+)</option>
              <option value="expense">Expenses Only (-)</option>
            </select>
          </div>

          {/* 4. Sort Order */}
          <div>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="newest">Sort: Newest to Oldest</option>
              <option value="oldest">Sort: Oldest to Newest</option>
              <option value="highest_amount">Sort: Highest Amount</option>
              <option value="lowest_amount">Sort: Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date and Amount Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          {/* Date Preset */}
          <div>
            <select
              value={datePreset}
              onChange={(e) => {
                setDatePreset(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Start Date & End Date if custom */}
          {datePreset === 'custom' ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          ) : (
            <div />
          )}

          {/* Min Amount */}
          <div>
            <input
              type="number"
              placeholder="Min Amount (₹)"
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Max Amount */}
          <div>
            <input
              type="number"
              placeholder="Max Amount (₹)"
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table & Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Showing {paginatedList.length} of {filteredList.length} Records
          </span>
          <span className="text-xs text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {paginatedList.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ListOrdered className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No transactions match your filters.</p>
            <button
              onClick={handleResetFilters}
              className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {paginatedList.map((tx) => {
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
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl px-2 sm:px-3 transition-colors group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isIncome
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {tx.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${categoryBadgeColors}`}>
                          {tx.category} · {tx.subcategory.replace('_', ' ')}
                        </span>
                      </div>

                      {tx.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {tx.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
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
                        {tx.notes && <span>• {tx.notes}</span>}
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

                    {/* Edit and Delete Buttons */}
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

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-semibold text-slate-500">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
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
        title="Delete Transaction"
        message="Are you sure you want to permanently delete this transaction? Only this specific record will be removed from the ledger."
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
