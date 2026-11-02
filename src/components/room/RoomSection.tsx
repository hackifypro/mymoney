import React, { useState } from 'react';
import {
  DoorOpen,
  Apple,
  Flame,
  Building,
  Zap,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  History,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../common/StatCard';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { Transaction, TransactionSubcategory, SortOrder } from '../../types';
import {
  formatINR,
  formatDisplayDate,
  formatDisplayTime,
  getCurrentISTDate,
  getCurrentISTTime,
  getCurrentMonthName,
} from '../../lib/dateUtils';

interface RoomSectionProps {
  onOpenAddModal: (category?: any, subcategory?: any) => void;
}

export const RoomSection: React.FC<RoomSectionProps> = ({ onOpenAddModal }) => {
  const { transactions, summary, addTransaction, deleteTransaction } = useExpense();
  const toast = useToast();

  // Active sub-tab filter: 'all' | 'grocery' | 'gas' | 'rent' | 'electricity'
  const [activeCategory, setActiveCategory] = useState<'all' | 'grocery' | 'gas' | 'rent' | 'electricity'>('all');
  const [activeView, setActiveView] = useState<'overview' | 'history'>('overview');

  // Quick form states
  // 1. Gas
  const [gasAmount, setGasAmount] = useState('');
  const [gasPaidBy, setGasPaidBy] = useState('Self');
  const [gasNotes, setGasNotes] = useState('');
  const [gasDate, setGasDate] = useState(getCurrentISTDate());
  const [gasTime, setGasTime] = useState(getCurrentISTTime());
  const [isSubmittingGas, setIsSubmittingGas] = useState(false);

  // 2. Grocery
  const [groceryItem, setGroceryItem] = useState('');
  const [groceryAmount, setGroceryAmount] = useState('');
  const [groceryQuantity, setGroceryQuantity] = useState('');
  const [groceryNotes, setGroceryNotes] = useState('');
  const [groceryDate, setGroceryDate] = useState(getCurrentISTDate());
  const [groceryTime, setGroceryTime] = useState(getCurrentISTTime());
  const [isSubmittingGrocery, setIsSubmittingGrocery] = useState(false);

  // 3. Rent
  const [rentAmount, setRentAmount] = useState('');
  const [rentMonth, setRentMonth] = useState(getCurrentMonthName());
  const [rentPaidTo, setRentPaidTo] = useState('');
  const [rentNotes, setRentNotes] = useState('');
  const [rentDate, setRentDate] = useState(getCurrentISTDate());
  const [rentTime, setRentTime] = useState(getCurrentISTTime());
  const [isSubmittingRent, setIsSubmittingRent] = useState(false);

  // 4. Electricity
  const [elecAmount, setElecAmount] = useState('');
  const [elecMonth, setElecMonth] = useState(getCurrentMonthName());
  const [elecNotes, setElecNotes] = useState('');
  const [elecDate, setElecDate] = useState(getCurrentISTDate());
  const [elecTime, setElecTime] = useState(getCurrentISTTime());
  const [isSubmittingElec, setIsSubmittingElec] = useState(false);

  // Filter & Search states for Room history
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOrder>('newest');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Modals
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter all room transactions
  const roomTransactions = transactions.filter((t) => t.category === 'room');

  // Filtered room transactions according to activeCategory & search
  const filteredRoomTransactions = roomTransactions.filter((tx) => {
    if (activeCategory !== 'all' && tx.subcategory !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        tx.title.toLowerCase().includes(q) ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.notes && tx.notes.toLowerCase().includes(q)) ||
        (tx.metadata?.grocery_item && tx.metadata.grocery_item.toLowerCase().includes(q)) ||
        (tx.metadata?.month && tx.metadata.month.toLowerCase().includes(q)) ||
        (tx.metadata?.billing_month && tx.metadata.billing_month.toLowerCase().includes(q)) ||
        String(tx.amount).includes(q);
      if (!match) return false;
    }
    if (filterStartDate && tx.transaction_date < filterStartDate) return false;
    if (filterEndDate && tx.transaction_date > filterEndDate) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') return (b.transaction_date + b.transaction_time).localeCompare(a.transaction_date + a.transaction_time);
    if (sortBy === 'oldest') return (a.transaction_date + a.transaction_time).localeCompare(b.transaction_date + b.transaction_time);
    if (sortBy === 'highest_amount') return b.amount - a.amount;
    if (sortBy === 'lowest_amount') return a.amount - b.amount;
    return 0;
  });

  // Handlers for individual quick submissions
  const handleAddGas = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(gasAmount);
    if (isNaN(amt) || amt <= 0) return toast.error('Invalid Amount', 'Please enter a valid amount.');

    try {
      setIsSubmittingGas(true);
      await addTransaction({
        category: 'room',
        subcategory: 'gas',
        transaction_type: 'expense',
        amount: amt,
        title: 'Gas Cylinder Refill',
        description: gasPaidBy ? `Paid by: ${gasPaidBy.trim()}` : 'Gas cylinder',
        transaction_date: gasDate,
        transaction_time: gasTime,
        notes: gasNotes.trim() || undefined,
        metadata: { paid_by: gasPaidBy.trim() },
      });
      toast.success('Gas Expense Added', `₹${amt.toLocaleString('en-IN')} recorded for Gas.`);
      setGasAmount('');
      setGasNotes('');
      setGasDate(getCurrentISTDate());
      setGasTime(getCurrentISTTime());
    } catch (err: any) {
      toast.error('Failed to add gas expense', err.message);
    } finally {
      setIsSubmittingGas(false);
    }
  };

  const handleAddGrocery = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(groceryAmount);
    if (isNaN(amt) || amt <= 0) return toast.error('Invalid Amount', 'Please enter a valid amount.');
    if (!groceryItem.trim()) return toast.error('Item Name Required', 'Please enter grocery item name.');

    try {
      setIsSubmittingGrocery(true);
      await addTransaction({
        category: 'room',
        subcategory: 'grocery',
        transaction_type: 'expense',
        amount: amt,
        title: groceryItem.trim(),
        description: groceryQuantity.trim() ? `Qty: ${groceryQuantity.trim()}` : 'Grocery Item',
        transaction_date: groceryDate,
        transaction_time: groceryTime,
        notes: groceryNotes.trim() || undefined,
        metadata: {
          grocery_item: groceryItem.trim(),
          quantity: groceryQuantity.trim() || undefined,
        },
      });
      toast.success('Grocery Recorded', `${groceryItem.trim()} (₹${amt.toLocaleString('en-IN')}) saved.`);
      setGroceryItem('');
      setGroceryAmount('');
      setGroceryQuantity('');
      setGroceryNotes('');
      setGroceryDate(getCurrentISTDate());
      setGroceryTime(getCurrentISTTime());
    } catch (err: any) {
      toast.error('Failed to add grocery item', err.message);
    } finally {
      setIsSubmittingGrocery(false);
    }
  };

  const handleAddRent = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(rentAmount);
    if (isNaN(amt) || amt <= 0) return toast.error('Invalid Amount', 'Please enter a valid amount.');
    if (!rentMonth.trim()) return toast.error('Month Required', 'Please specify the rent month.');

    try {
      setIsSubmittingRent(true);
      await addTransaction({
        category: 'room',
        subcategory: 'rent',
        transaction_type: 'expense',
        amount: amt,
        title: `Room Rent (${rentMonth.trim()})`,
        description: rentPaidTo.trim() ? `Paid to: ${rentPaidTo.trim()}` : `Room Rent for ${rentMonth.trim()}`,
        transaction_date: rentDate,
        transaction_time: rentTime,
        notes: rentNotes.trim() || undefined,
        metadata: {
          month: rentMonth.trim(),
          paid_to: rentPaidTo.trim() || undefined,
        },
      });
      toast.success('Rent Recorded', `₹${amt.toLocaleString('en-IN')} for ${rentMonth.trim()} saved.`);
      setRentAmount('');
      setRentPaidTo('');
      setRentNotes('');
      setRentDate(getCurrentISTDate());
      setRentTime(getCurrentISTTime());
    } catch (err: any) {
      toast.error('Failed to add rent', err.message);
    } finally {
      setIsSubmittingRent(false);
    }
  };

  const handleAddElectricity = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(elecAmount);
    if (isNaN(amt) || amt <= 0) return toast.error('Invalid Amount', 'Please enter a valid amount.');
    if (!elecMonth.trim()) return toast.error('Billing Month Required', 'Please specify the billing month.');

    try {
      setIsSubmittingElec(true);
      await addTransaction({
        category: 'room',
        subcategory: 'electricity',
        transaction_type: 'expense',
        amount: amt,
        title: `Electricity Bill (${elecMonth.trim()})`,
        description: `Power consumption bill for ${elecMonth.trim()}`,
        transaction_date: elecDate,
        transaction_time: elecTime,
        notes: elecNotes.trim() || undefined,
        metadata: {
          billing_month: elecMonth.trim(),
        },
      });
      toast.success('Electricity Bill Saved', `₹${amt.toLocaleString('en-IN')} recorded.`);
      setElecAmount('');
      setElecNotes('');
      setElecDate(getCurrentISTDate());
      setElecTime(getCurrentISTTime());
    } catch (err: any) {
      toast.error('Failed to add electricity bill', err.message);
    } finally {
      setIsSubmittingElec(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(transactionToDelete.id);
      toast.success('Deleted', `Room record "${transactionToDelete.title}" removed.`);
      setTransactionToDelete(null);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Room Summary - 5 Cards Required by Prompt */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Room Expense Summary
          </h3>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            4 Core Subcategories
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Gas */}
          <StatCard
            title="Gas Expenses"
            amount={summary.totalGas}
            subtitle="LPG Cylinder & Refills"
            icon={Flame}
            variant="expense"
            badge="Gas Fuel"
            onClick={() => setActiveCategory('gas')}
          />

          {/* 2. Groceries */}
          <StatCard
            title="Grocery Expenses"
            amount={summary.totalGrocery}
            subtitle="Rice, Oil, Veggies & Ration"
            icon={Apple}
            variant="expense"
            badge="Food & Ration"
            onClick={() => setActiveCategory('grocery')}
          />

          {/* 3. Rent */}
          <StatCard
            title="Room Rent"
            amount={summary.totalRent}
            subtitle="Monthly flat / room share"
            icon={Building}
            variant="expense"
            badge="Accommodation"
            onClick={() => setActiveCategory('rent')}
          />

          {/* 4. Electricity */}
          <StatCard
            title="Electricity Bills"
            amount={summary.totalElectricity}
            subtitle="Power consumption charges"
            icon={Zap}
            variant="expense"
            badge="Power Utility"
            onClick={() => setActiveCategory('electricity')}
          />

          {/* 5. Grand Total Room Expenses */}
          <StatCard
            title="Grand Total Room"
            amount={summary.totalRoomExpenses}
            subtitle="Gas + Grocery + Rent + Power"
            icon={DoorOpen}
            variant="expense"
            badge="Combined Room"
            onClick={() => setActiveCategory('all')}
          />
        </div>
      </div>

      {/* Category Tabs & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Room', icon: DoorOpen },
            { id: 'grocery', label: 'Groceries', icon: Apple },
            { id: 'gas', label: 'Gas LPG', icon: Flame },
            { id: 'rent', label: 'Room Rent', icon: Building },
            { id: 'electricity', label: 'Electricity', icon: Zap },
          ].map((tab) => {
            const isSel = activeCategory === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSel
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeView === 'overview'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Quick Add Panels
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeView === 'history'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>View History ({filteredRoomTransactions.length})</span>
          </button>
        </div>
      </div>

      {activeView === 'overview' ? (
        /* 4 Dedicated Room Entry Panels */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Grocery Expenses Form */}
            {(activeCategory === 'all' || activeCategory === 'grocery') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                      <Apple className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        B. Grocery Expenses
                      </h4>
                      <p className="text-[11px] text-slate-400">Each item saved as an individual record</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">
                    Total: {formatINR(summary.totalGrocery)}
                  </span>
                </div>

                {/* Quick Add Presets (Rice, Oil, Veggies from prompt example) */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Quick Fill:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setGroceryItem('Rice');
                      setGroceryAmount('250');
                      setGroceryQuantity('5 kg');
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  >
                    Rice ₹250
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroceryItem('Cooking Oil');
                      setGroceryAmount('150');
                      setGroceryQuantity('1 Liter');
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  >
                    Oil ₹150
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroceryItem('Fresh Vegetables');
                      setGroceryAmount('100');
                      setGroceryQuantity('Mixed');
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  >
                    Veggies ₹100
                  </button>
                </div>

                <form onSubmit={handleAddGrocery} className="mt-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Item Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={groceryItem}
                        onChange={(e) => setGroceryItem(e.target.value)}
                        placeholder="e.g. Rice, Spices, Eggs"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={groceryAmount}
                        onChange={(e) => setGroceryAmount(e.target.value)}
                        placeholder="e.g. 250"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Quantity</label>
                      <input
                        type="text"
                        value={groceryQuantity}
                        onChange={(e) => setGroceryQuantity(e.target.value)}
                        placeholder="5 kg, 1L"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Date (Auto IST)</label>
                      <input
                        type="date"
                        required
                        value={groceryDate}
                        onChange={(e) => setGroceryDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Time (Auto IST)</label>
                      <input
                        type="time"
                        step="1"
                        required
                        value={groceryTime}
                        onChange={(e) => setGroceryTime(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Notes</label>
                    <input
                      type="text"
                      value={groceryNotes}
                      onChange={(e) => setGroceryNotes(e.target.value)}
                      placeholder="e.g. Paid cash at local store"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingGrocery}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isSubmittingGrocery ? 'Saving...' : '+ Add Grocery Record'}
                  </button>
                </form>
              </div>
            )}

            {/* 2. Gas Expenses Form */}
            {(activeCategory === 'all' || activeCategory === 'gas') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-xl">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        A. Gas Expenses
                      </h4>
                      <p className="text-[11px] text-slate-400">LPG cylinder bookings & refills</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600">
                    Total: {formatINR(summary.totalGas)}
                  </span>
                </div>

                <form onSubmit={handleAddGas} className="mt-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Gas Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={gasAmount}
                        onChange={(e) => setGasAmount(e.target.value)}
                        placeholder="e.g. 1050"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Who Paid? (Optional)
                      </label>
                      <input
                        type="text"
                        value={gasPaidBy}
                        onChange={(e) => setGasPaidBy(e.target.value)}
                        placeholder="e.g. Self, Flatmate"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Date (Auto IST)</label>
                      <input
                        type="date"
                        required
                        value={gasDate}
                        onChange={(e) => setGasDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Time (Auto IST)</label>
                      <input
                        type="time"
                        step="1"
                        required
                        value={gasTime}
                        onChange={(e) => setGasTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Notes</label>
                    <input
                      type="text"
                      value={gasNotes}
                      onChange={(e) => setGasNotes(e.target.value)}
                      placeholder="e.g. Indane cylinder booked online"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingGas}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isSubmittingGas ? 'Saving...' : '+ Add Gas Expense'}
                  </button>
                </form>
              </div>
            )}

            {/* 3. Room Rent Form */}
            {(activeCategory === 'all' || activeCategory === 'rent') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-xl">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        C. Room Rent
                      </h4>
                      <p className="text-[11px] text-slate-400">Monthly accommodation share</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600">
                    Total: {formatINR(summary.totalRent)}
                  </span>
                </div>

                <form onSubmit={handleAddRent} className="mt-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Rent Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={rentAmount}
                        onChange={(e) => setRentAmount(e.target.value)}
                        placeholder="e.g. 6500"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Month <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={rentMonth}
                        onChange={(e) => setRentMonth(e.target.value)}
                        placeholder="e.g. November 2026"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Paid To</label>
                      <input
                        type="text"
                        value={rentPaidTo}
                        onChange={(e) => setRentPaidTo(e.target.value)}
                        placeholder="Owner name"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Payment Date</label>
                      <input
                        type="date"
                        required
                        value={rentDate}
                        onChange={(e) => setRentDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Time (IST)</label>
                      <input
                        type="time"
                        step="1"
                        required
                        value={rentTime}
                        onChange={(e) => setRentTime(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Notes</label>
                    <input
                      type="text"
                      value={rentNotes}
                      onChange={(e) => setRentNotes(e.target.value)}
                      placeholder="e.g. Paid via Google Pay to landlord"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingRent}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isSubmittingRent ? 'Saving...' : '+ Add Room Rent Record'}
                  </button>
                </form>
              </div>
            )}

            {/* 4. Electricity Bill Form */}
            {(activeCategory === 'all' || activeCategory === 'electricity') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-950 text-yellow-600 rounded-xl">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        D. Electricity Bill
                      </h4>
                      <p className="text-[11px] text-slate-400">Flat power billing & meter readings</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-yellow-600">
                    Total: {formatINR(summary.totalElectricity)}
                  </span>
                </div>

                <form onSubmit={handleAddElectricity} className="mt-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Bill Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={elecAmount}
                        onChange={(e) => setElecAmount(e.target.value)}
                        placeholder="e.g. 820"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Billing Month <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={elecMonth}
                        onChange={(e) => setElecMonth(e.target.value)}
                        placeholder="e.g. October 2026"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Payment Date</label>
                      <input
                        type="date"
                        required
                        value={elecDate}
                        onChange={(e) => setElecDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Payment Time</label>
                      <input
                        type="time"
                        step="1"
                        required
                        value={elecTime}
                        onChange={(e) => setElecTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Notes</label>
                    <input
                      type="text"
                      value={elecNotes}
                      onChange={(e) => setElecNotes(e.target.value)}
                      placeholder="e.g. Submeter units 75 kWh"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingElec}
                    className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isSubmittingElec ? 'Saving...' : '+ Add Electricity Bill'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Room View History */
        <div className="space-y-4">
          {/* History Filters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item, month, notes..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  placeholder="From Date"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="highest_amount">Sort: Highest Amount</option>
                  <option value="lowest_amount">Sort: Lowest Amount</option>
                </select>
              </div>
            </div>
          </div>

          {/* History List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Room Transaction Records ({filteredRoomTransactions.length})
              </h3>
              {(searchQuery || filterStartDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {filteredRoomTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <DoorOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No matching room records found.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredRoomTransactions.map((tx) => {
                  const badgeMap = {
                    grocery: { bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', icon: Apple },
                    gas: { bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: Flame },
                    rent: { bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: Building },
                    electricity: { bg: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300', icon: Zap },
                  }[tx.subcategory as 'grocery' | 'gas' | 'rent' | 'electricity'] || { bg: 'bg-slate-100 text-slate-700', icon: DoorOpen };

                  const Icon = badgeMap.icon;

                  return (
                    <div
                      key={tx.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 sm:px-3 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {tx.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeMap.bg}`}>
                              {tx.subcategory}
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
                            {tx.metadata?.quantity && (
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                • {tx.metadata.quantity}
                              </span>
                            )}
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
        title="Delete Room Record"
        message="Are you sure you want to permanently delete this room expense record? Only this selected transaction will be removed."
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
