import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Home,
  DoorOpen,
  ShoppingBag,
  Users,
  Flame,
  Apple,
  Building,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useToast } from '../../context/ToastContext';
import {
  TransactionCategory,
  TransactionSubcategory,
  TransactionType,
  NewTransactionPayload,
} from '../../types';
import {
  getCurrentISTDate,
  getCurrentISTTime,
  getCurrentMonthName,
} from '../../lib/dateUtils';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: TransactionCategory;
  initialSubcategory?: TransactionSubcategory;
  initialPersonName?: string;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'home',
  initialSubcategory,
  initialPersonName,
}) => {
  const { addTransaction } = useExpense();
  const toast = useToast();

  const [category, setCategory] = useState<TransactionCategory>(initialCategory);
  const [subcategory, setSubcategory] = useState<TransactionSubcategory>(
    initialSubcategory || 'received_home'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Core fields
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(getCurrentISTDate());
  const [time, setTime] = useState<string>(getCurrentISTTime());
  const [notes, setNotes] = useState<string>('');

  // Subcategory specific fields
  // Home
  const [homePurpose, setHomePurpose] = useState<string>('');
  const [homeExpenseReason, setHomeExpenseReason] = useState<string>('');

  // Room - Grocery
  const [groceryItem, setGroceryItem] = useState<string>('');
  const [groceryQuantity, setGroceryQuantity] = useState<string>('');

  // Room - Gas
  const [gasPaidBy, setGasPaidBy] = useState<string>('Self');

  // Room - Rent
  const [rentMonth, setRentMonth] = useState<string>(getCurrentMonthName());
  const [rentPaidTo, setRentPaidTo] = useState<string>('');

  // Room - Electricity
  const [elecMonth, setElecMonth] = useState<string>(getCurrentMonthName());

  // Other Expense
  const [spentAt, setSpentAt] = useState<string>('');
  const [spentFor, setSpentFor] = useState<string>('');

  // People
  const [personName, setPersonName] = useState<string>(initialPersonName || '');
  const [peopleReason, setPeopleReason] = useState<string>('');

  // Reset or initialize state when opening
  useEffect(() => {
    if (isOpen) {
      setDate(getCurrentISTDate());
      setTime(getCurrentISTTime());
      if (initialCategory) setCategory(initialCategory);
      if (initialSubcategory) {
        setSubcategory(initialSubcategory);
      } else {
        if (initialCategory === 'home') setSubcategory('received_home');
        else if (initialCategory === 'room') setSubcategory('grocery');
        else if (initialCategory === 'other') setSubcategory('other_expense');
        else if (initialCategory === 'people') setSubcategory('money_given');
      }
      if (initialPersonName) setPersonName(initialPersonName);
      setRentMonth(getCurrentMonthName());
      setElecMonth(getCurrentMonthName());
    }
  }, [isOpen, initialCategory, initialSubcategory, initialPersonName]);

  // Adjust subcategory when category changes
  const handleCategoryChange = (cat: TransactionCategory) => {
    setCategory(cat);
    if (cat === 'home') setSubcategory('received_home');
    else if (cat === 'room') setSubcategory('grocery');
    else if (cat === 'other') setSubcategory('other_expense');
    else if (cat === 'people') setSubcategory('money_given');
  };

  const resetForm = () => {
    setAmount('');
    setTitle('');
    setNotes('');
    setHomePurpose('');
    setHomeExpenseReason('');
    setGroceryItem('');
    setGroceryQuantity('');
    setGasPaidBy('Self');
    setRentPaidTo('');
    setSpentAt('');
    setSpentFor('');
    setPersonName('');
    setPeopleReason('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    let finalTitle = title.trim();
    let finalDescription = '';
    let finalType: TransactionType = 'expense';
    let metadata: Record<string, any> = {};

    // Build payload according to category & subcategory requirements
    if (category === 'home') {
      if (subcategory === 'received_home') {
        finalType = 'income';
        if (!homePurpose.trim()) {
          toast.error('Purpose Required', 'Please enter purpose/reason for money received from home');
          return;
        }
        finalTitle = finalTitle || `Received: ${homePurpose.trim()}`;
        finalDescription = `From Home — ${homePurpose.trim()}`;
      } else {
        finalType = 'expense';
        if (!homeExpenseReason.trim()) {
          toast.error('Reason Required', 'Please enter what the money was requested or spent for');
          return;
        }
        finalTitle = finalTitle || `Home Expense: ${homeExpenseReason.trim()}`;
        finalDescription = homeExpenseReason.trim();
      }
    } else if (category === 'room') {
      finalType = 'expense';
      if (subcategory === 'gas') {
        finalTitle = finalTitle || 'Gas Expense (LPG Cylinder)';
        finalDescription = gasPaidBy ? `Paid by: ${gasPaidBy}` : 'Gas cylinder refilled';
        metadata.paid_by = gasPaidBy;
      } else if (subcategory === 'grocery') {
        if (!groceryItem.trim()) {
          toast.error('Item Name Required', 'Please enter the grocery item name');
          return;
        }
        finalTitle = groceryItem.trim();
        finalDescription = groceryQuantity ? `Qty: ${groceryQuantity.trim()}` : 'Room Grocery item';
        metadata.grocery_item = groceryItem.trim();
        metadata.quantity = groceryQuantity.trim();
      } else if (subcategory === 'rent') {
        if (!rentMonth.trim()) {
          toast.error('Month Required', 'Please specify the rent month');
          return;
        }
        finalTitle = finalTitle || `Room Rent (${rentMonth.trim()})`;
        finalDescription = rentPaidTo ? `Paid to: ${rentPaidTo.trim()}` : `Room Rent for ${rentMonth.trim()}`;
        metadata.month = rentMonth.trim();
        metadata.paid_to = rentPaidTo.trim();
      } else if (subcategory === 'electricity') {
        if (!elecMonth.trim()) {
          toast.error('Month Required', 'Please specify the billing month');
          return;
        }
        finalTitle = finalTitle || `Electricity Bill (${elecMonth.trim()})`;
        finalDescription = `Power bill for ${elecMonth.trim()}`;
        metadata.billing_month = elecMonth.trim();
      }
    } else if (category === 'other') {
      finalType = 'expense';
      if (!spentAt.trim()) {
        toast.error('Location/Platform Required', 'Please enter where the money was spent (e.g. Swiggy, Metro, Amazon)');
        return;
      }
      if (!spentFor.trim()) {
        toast.error('Reason Required', 'Please enter why it was spent (e.g. Travelling, Shopping, Food)');
        return;
      }
      finalTitle = finalTitle || spentFor.trim();
      finalDescription = `Spent at ${spentAt.trim()} for ${spentFor.trim()}`;
      metadata.spent_at = spentAt.trim();
      metadata.spent_for = spentFor.trim();
    } else if (category === 'people') {
      if (!personName.trim()) {
        toast.error("Person's Name Required", 'Please enter the person name');
        return;
      }
      if (!peopleReason.trim()) {
        toast.error('Reason Required', 'Please enter the purpose / reason');
        return;
      }

      if (subcategory === 'money_given') {
        finalType = 'expense';
        finalTitle = `Udhar Given to ${personName.trim()}`;
        finalDescription = peopleReason.trim();
      } else {
        finalType = 'income';
        finalTitle = `Money Received from ${personName.trim()}`;
        finalDescription = peopleReason.trim();
      }
    }

    const payload: NewTransactionPayload = {
      category,
      subcategory,
      transaction_type: finalType,
      amount: parsedAmount,
      title: finalTitle,
      description: finalDescription,
      person_name: category === 'people' ? personName.trim() : undefined,
      transaction_date: date,
      transaction_time: time,
      notes: notes.trim() || undefined,
      metadata,
    };

    try {
      setIsSubmitting(true);
      await addTransaction(payload);
      toast.success(
        'Transaction Added!',
        `${payload.title} (₹${parsedAmount.toLocaleString('en-IN')}) recorded successfully.`
      );
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error('Failed to add transaction', err.message || 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl my-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl text-emerald-600 dark:text-emerald-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Add New Transaction
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatic IST date & time captured
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Section Picker Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Select Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'home' as TransactionCategory, label: 'Home Money', icon: Home },
                { id: 'room' as TransactionCategory, label: 'Room Expense', icon: DoorOpen },
                { id: 'other' as TransactionCategory, label: 'Other Expense', icon: ShoppingBag },
                { id: 'people' as TransactionCategory, label: 'People (Udhar)', icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = category === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleCategoryChange(tab.id)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategory selectors based on category */}
          {category === 'home' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Home Operation Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSubcategory('received_home')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    subcategory === 'received_home'
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Money Received From Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubcategory('home_expense')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    subcategory === 'home_expense'
                      ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-400 text-rose-700 dark:text-rose-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                  <span>Money Spent for Home</span>
                </button>
              </div>
            </div>
          )}

          {category === 'room' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Room Expense Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'grocery' as TransactionSubcategory, label: 'Grocery', icon: Apple },
                  { id: 'gas' as TransactionSubcategory, label: 'Gas LPG', icon: Flame },
                  { id: 'rent' as TransactionSubcategory, label: 'Room Rent', icon: Building },
                  { id: 'electricity' as TransactionSubcategory, label: 'Electricity', icon: Zap },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = subcategory === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSubcategory(item.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                        isSel
                          ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-400 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {category === 'people' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                People Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSubcategory('money_given')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    subcategory === 'money_given'
                      ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-400 text-rose-700 dark:text-rose-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                  <span>Money Given (Udhar Diya)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubcategory('money_received')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    subcategory === 'money_received'
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Money Received (Udhar Liya / Wapas)</span>
                </button>
              </div>
            </div>
          )}

          {/* Amount Field (Universal Required) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹ INR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-lg">
                ₹
              </div>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Dynamic Category-Specific Fields */}

          {/* Home Section Fields */}
          {category === 'home' && subcategory === 'received_home' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purpose / Reason <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={homePurpose}
                onChange={(e) => setHomePurpose(e.target.value)}
                placeholder="e.g. Monthly Expenses, College Fees, Medical emergency"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {category === 'home' && subcategory === 'home_expense' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                What was the money requested or spent for? <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={homeExpenseReason}
                onChange={(e) => setHomeExpenseReason(e.target.value)}
                placeholder="e.g. Home medicines, Courier to parents, Grocery sent home"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Room - Grocery Fields */}
          {category === 'room' && subcategory === 'grocery' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Grocery Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={groceryItem}
                  onChange={(e) => setGroceryItem(e.target.value)}
                  placeholder="e.g. Rice, Oil, Vegetables, Milk"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity (Optional)
                </label>
                <input
                  type="text"
                  value={groceryQuantity}
                  onChange={(e) => setGroceryQuantity(e.target.value)}
                  placeholder="e.g. 5 kg, 2 Liters, 1 packet"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Room - Gas Fields */}
          {category === 'room' && subcategory === 'gas' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Who Paid? (Optional)
              </label>
              <input
                type="text"
                value={gasPaidBy}
                onChange={(e) => setGasPaidBy(e.target.value)}
                placeholder="e.g. Self, Flatmate Amit, Cash"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Room - Rent Fields */}
          {category === 'room' && subcategory === 'rent' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rent Month <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={rentMonth}
                  onChange={(e) => setRentMonth(e.target.value)}
                  placeholder="e.g. November 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Paid To (Optional)
                </label>
                <input
                  type="text"
                  value={rentPaidTo}
                  onChange={(e) => setRentPaidTo(e.target.value)}
                  placeholder="e.g. Landlord Sharma Ji"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Room - Electricity Fields */}
          {category === 'room' && subcategory === 'electricity' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Billing Month <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={elecMonth}
                onChange={(e) => setElecMonth(e.target.value)}
                placeholder="e.g. October - November 2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Other Expenses Fields */}
          {category === 'other' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Where was money spent? <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={spentAt}
                  onChange={(e) => setSpentAt(e.target.value)}
                  placeholder="e.g. Swiggy, Metro, Amazon, Market"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  placeholder="e.g. Travelling, Shopping, Recharge, Food"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* People Section Fields */}
          {category === 'people' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Person's Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Rahul Verma, Aman Gupta, Sister"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Purpose / Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={peopleReason}
                  onChange={(e) => setPeopleReason(e.target.value)}
                  placeholder="e.g. College fees emergency, Dinner bill split, Borrowed for books"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Automatic Date and Time System (IST) - Fully Editable */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Date & Time (IST — Indian Standard Time)</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                Auto-captured
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Transaction Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Transaction Time (IST)
                </label>
                <div className="relative">
                  <input
                    type="time"
                    step="1"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Optional Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via UPI, bill receipt kept in drawer, promised repayment date..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Save Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
