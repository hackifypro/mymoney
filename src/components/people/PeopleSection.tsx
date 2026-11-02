import React, { useState } from 'react';
import {
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  User,
  CheckCircle2,
  AlertCircle,
  History,
  X,
  CreditCard,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../common/StatCard';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditTransactionModal } from '../modals/EditTransactionModal';
import { Transaction, PersonSummary, SortOrder } from '../../types';
import {
  formatINR,
  formatDisplayDate,
  formatDisplayTime,
  getCurrentISTDate,
  getCurrentISTTime,
} from '../../lib/dateUtils';

interface PeopleSectionProps {
  onOpenAddModal: (category?: any, subcategory?: any, personName?: string) => void;
}

export const PeopleSection: React.FC<PeopleSectionProps> = ({ onOpenAddModal }) => {
  const { transactions, summary, peopleSummaries, addTransaction, deleteTransaction } = useExpense();
  const toast = useToast();

  // Selected person for detailed ledger drill-down
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  // Form type: 'given' or 'received'
  const [formMode, setFormMode] = useState<'given' | 'received'>('given');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(getCurrentISTDate());
  const [time, setTime] = useState(getCurrentISTTime());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter
  const [searchPersonQuery, setSearchPersonQuery] = useState('');
  const [searchTxQuery, setSearchTxQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOrder>('newest');

  // Modals
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered people list
  const filteredPeople = peopleSummaries.filter((p) =>
    p.name.toLowerCase().includes(searchPersonQuery.toLowerCase().trim())
  );

  // Get active selected person's detailed summary if one is selected
  const activePersonData = selectedPerson
    ? peopleSummaries.find((p) => p.name.toLowerCase() === selectedPerson.toLowerCase()) || null
    : null;

  // Handle in-line form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return toast.error('Invalid Amount', 'Please enter a valid amount.');
    if (!personName.trim()) return toast.error("Person's Name Required", 'Please enter the name of the person.');
    if (!reason.trim()) return toast.error('Reason Required', 'Please enter purpose/reason for this transaction.');

    const isGiven = formMode === 'given';
    const subcategory = isGiven ? 'money_given' : 'money_received';
    const type = isGiven ? 'expense' : 'income';
    const title = isGiven ? `Udhar Given to ${personName.trim()}` : `Money Received from ${personName.trim()}`;

    try {
      setIsSubmitting(true);
      await addTransaction({
        category: 'people',
        subcategory,
        transaction_type: type,
        amount: amt,
        title,
        description: reason.trim(),
        person_name: personName.trim(),
        transaction_date: date,
        transaction_time: time,
        notes: notes.trim() || undefined,
      });

      toast.success(
        isGiven ? 'Money Given Recorded' : 'Money Received Recorded',
        `₹${amt.toLocaleString('en-IN')} with ${personName.trim()} saved.`
      );

      setAmount('');
      setReason('');
      setNotes('');
      setDate(getCurrentISTDate());
      setTime(getCurrentISTTime());
    } catch (err: any) {
      toast.error('Failed to record transaction', err.message);
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
      {/* 3 Summary Cards Required by Prompt */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Money Given (Udhar Diya)"
          amount={summary.totalMoneyGiven}
          subtitle="Money lent to people"
          icon={ArrowUpRight}
          variant="amber"
          badge="Given / Lent"
        />

        <StatCard
          title="Total Money Received"
          amount={summary.totalMoneyReceived}
          subtitle="Udhar returned or borrowed"
          icon={ArrowDownLeft}
          variant="income"
          badge="Received / Returned"
        />

        <StatCard
          title="Net Outstanding Balance"
          amount={summary.netPeopleBalance}
          subtitle="Total Given minus Total Received"
          icon={Users}
          variant={summary.netPeopleBalance >= 0 ? 'balance' : 'expense'}
          badge={summary.netPeopleBalance >= 0 ? 'You are owed' : 'You owe'}
        />
      </div>

      {/* Form & People Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column (Form): Record Money Given or Received */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>Record Person Transaction</span>
            </h3>
          </div>

          {/* Form Mode Toggle */}
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setFormMode('given')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                formMode === 'given'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>A. Money Given</span>
            </button>
            <button
              type="button"
              onClick={() => setFormMode('received')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                formMode === 'received'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>B. Money Received</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Person's Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="e.g. Rahul Verma, Rohit, Sister"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>

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
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-base focus:ring-2 focus:ring-amber-500"
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
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={formMode === 'given' ? 'e.g. Exam fee urgent help' : 'e.g. Returned first installment'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Date (Auto IST)</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Optional Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Promised to return by 15th"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
                formMode === 'given'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {isSubmitting
                ? 'Saving...'
                : formMode === 'given'
                ? '+ Record Udhar Given'
                : '+ Record Money Received'}
            </button>
          </form>
        </div>

        {/* Right column (People Directory & Ledger cards): */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  People Directory & Balance Ledger ({peopleSummaries.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Click on any person to inspect their complete transaction ledger
                </p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchPersonQuery}
                  onChange={(e) => setSearchPersonQuery(e.target.value)}
                  placeholder="Search person..."
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 w-44"
                />
              </div>
            </div>

            {/* People Cards Grid */}
            {filteredPeople.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No people transactions recorded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
                {filteredPeople.map((p) => {
                  const isOwed = p.outstandingBalance > 0;
                  const isOwing = p.outstandingBalance < 0;
                  const isSettled = p.outstandingBalance === 0;

                  return (
                    <div
                      key={p.name}
                      onClick={() => setSelectedPerson(p.name)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedPerson?.toLowerCase() === p.name.toLowerCase()
                          ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {p.name}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {p.transactionCount} transaction{p.transactionCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOwed
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : isOwing
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {isOwed ? 'They Owe' : isOwing ? 'You Owe' : 'Settled'}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Given:</span>
                          <span className="font-semibold text-rose-600">{formatINR(p.totalGiven)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Received:</span>
                          <span className="font-semibold text-emerald-600">{formatINR(p.totalReceived)}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="text-slate-700 dark:text-slate-300">Balance:</span>
                          <span
                            className={
                              isOwed
                                ? 'text-amber-600 dark:text-amber-400'
                                : isOwing
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-400'
                            }
                          >
                            {formatINR(Math.abs(p.outstandingBalance))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Individual Person Ledger Drawer / View (If a person is selected) */}
          {activePersonData && (
            <div className="bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-800/60 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-md">
                    {activePersonData.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                      {activePersonData.name}'s Ledger History
                    </h3>
                    <p className="text-xs text-slate-500">
                      Outstanding: <span className="font-bold text-amber-600">{formatINR(activePersonData.outstandingBalance)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPersonName(activePersonData.name);
                      setFormMode(activePersonData.outstandingBalance > 0 ? 'received' : 'given');
                    }}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    Quick Settle
                  </button>
                  <button
                    onClick={() => setSelectedPerson(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Transactions with this person */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {activePersonData.transactions.map((tx) => {
                  const isGiven = tx.subcategory === 'money_given';
                  return (
                    <div
                      key={tx.id}
                      className="py-3 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            isGiven
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                          }`}
                        >
                          {isGiven ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {tx.title}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{formatDisplayDate(tx.transaction_date)}</span>
                            <span>•</span>
                            <span>{formatDisplayTime(tx.transaction_time)}</span>
                            {tx.notes && <span>• {tx.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className={`text-sm font-bold font-sans ${isGiven ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isGiven ? '-' : '+'} {formatINR(tx.amount)}
                          </div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">
                            {isGiven ? 'Given' : 'Received'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setTransactionToEdit(tx)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTransactionToDelete(tx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
        title="Delete Person Record"
        message="Are you sure you want to permanently delete this record? Outstanding balance for this person will be recalculated automatically."
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
