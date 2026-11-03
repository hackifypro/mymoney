import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Transaction,
  NewTransactionPayload,
  FinancialSummary,
  PersonSummary,
  FilterOptions,
} from '../types';
import {
  getSupabaseClient,
  fetchTransactionsFromSupabase,
  saveTransactionToSupabase,
  updateTransactionInSupabase,
  deleteTransactionFromSupabase,
  subscribeToSupabaseTransactions,
} from '../lib/supabase';
import {
  saveTransactionToFirestore,
  updateTransactionInFirestore,
  deleteTransactionFromFirestore,
  fetchTransactionsFromFirestore,
} from '../lib/firebase';
import { getCurrentISTDate, getCurrentISTTime, getPresetDateRange } from '../lib/dateUtils';
import { useAuth } from './AuthContext';
import {
  validateTransactionPayload,
  validateAmount,
  sanitizeInput,
  assertResourceOwnership,
  SecurityAuthorizationError,
} from '../lib/security';

interface ExpenseContextType {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  summary: FinancialSummary;
  peopleSummaries: PersonSummary[];
  filterOptions: FilterOptions;
  setFilterOptions: React.Dispatch<React.SetStateAction<FilterOptions>>;
  filteredTransactions: Transaction[];
  addTransaction: (payload: NewTransactionPayload) => Promise<Transaction>;
  editTransaction: (id: string, updates: Partial<NewTransactionPayload>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<boolean>;
  clearAllTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  isSupabaseConnected: boolean;
  isFirebaseConnected: boolean;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'my_money_transactions_real';

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // All transactions loaded from persistent store / Supabase
  const [allTransactions, setAllTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    searchQuery: '',
    category: 'all',
    subcategory: 'all',
    type: 'all',
    dateFilter: { preset: 'all' },
    sortBy: 'newest',
  });

  // Local storage persistence helper
  const persistLocally = (newList: Transaction[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
    } catch (e) {
      console.error('Failed to persist locally:', e);
    }
  };

  // Primary database sync: SUPABASE with Postgres Realtime
  const syncWithDatabase = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // 1. Try Supabase Database first (Primary)
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const supaData = await fetchTransactionsFromSupabase(user?.uid);
        if (supaData) {
          setAllTransactions(supaData);
          persistLocally(supaData);
          setIsSupabaseConnected(true);
          setIsLoading(false);
          return;
        }
      } catch (supaErr: any) {
        console.warn('Supabase fetch notice, trying fallback:', supaErr.message);
      }
    }

    // 2. Try Firebase Firestore fallback if Supabase credentials are not connected yet
    try {
      const firestoreData = await fetchTransactionsFromFirestore();
      if (firestoreData && firestoreData.length > 0) {
        setAllTransactions(firestoreData);
        persistLocally(firestoreData);
        setIsFirebaseConnected(true);
      }
    } catch (fbErr: any) {
      // 3. Fallback to cached local storage
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          setAllTransactions(JSON.parse(saved));
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load and real-time subscription
  useEffect(() => {
    syncWithDatabase();

    // Subscribe to Supabase Postgres Realtime changes
    const unsubscribeSupabase = subscribeToSupabaseTransactions(() => {
      setIsSupabaseConnected(true);
      syncWithDatabase();
    });

    return () => {
      unsubscribeSupabase();
    };
  }, [syncWithDatabase]);

  const refreshTransactions = async () => {
    await syncWithDatabase();
  };

  // STRICT MULTI-USER DATA ISOLATION (DEFENSE-IN-DEPTH):
  // User Financial Privacy: Each user sees ONLY their own records.
  const userTransactions: Transaction[] = useMemo(() => {
    if (!user) return [];

    return allTransactions.filter(
      (t) =>
        t.user_id === user.uid ||
        (t.user_email && t.user_email.toLowerCase() === user.email.toLowerCase())
    );
  }, [allTransactions, user]);

  // Add transaction with strict input validation, sanitization, and ownership assertion
  const addTransaction = async (payload: NewTransactionPayload): Promise<Transaction> => {
    if (!user) {
      throw new SecurityAuthorizationError('Authentication required: You must be logged in to record transactions.');
    }

    // 1. Validate payload against injection, tampering, negative amounts, invalid categories
    const validation = validateTransactionPayload(payload, user.uid);
    if (!validation.isValid || !validation.sanitizedPayload) {
      throw new Error(`Validation Error: ${validation.errors.join(' ')}`);
    }

    const clean = validation.sanitizedPayload;
    const nowIso = new Date().toISOString();
    const newId = crypto.randomUUID
      ? crypto.randomUUID()
      : 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    const newTx: Transaction = {
      id: newId,
      user_id: user.uid,
      user_email: user.email,
      category: clean.category,
      subcategory: clean.subcategory,
      transaction_type: clean.transaction_type,
      amount: clean.amount,
      title: clean.title,
      description: clean.description,
      person_name: clean.person_name,
      transaction_date: clean.transaction_date || getCurrentISTDate(),
      transaction_time: clean.transaction_time || getCurrentISTTime(),
      notes: clean.notes,
      metadata: clean.metadata || {},
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Optimistically update local state & storage
    setAllTransactions((prev) => {
      const updated = [newTx, ...prev];
      persistLocally(updated);
      return updated;
    });

    // 1. Save to Supabase (Primary Database)
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await saveTransactionToSupabase(newTx);
        setIsSupabaseConnected(true);
      } catch (err: any) {
        console.warn('Supabase save notice, cached locally:', err.message);
      }
    }

    // 2. Secondary backup save to Firestore if configured
    try {
      await saveTransactionToFirestore(newTx);
    } catch {}

    return newTx;
  };

  // Edit transaction with IDOR check, immutability check, and sanitization
  const editTransaction = async (id: string, updates: Partial<NewTransactionPayload>): Promise<Transaction> => {
    if (!user) {
      throw new SecurityAuthorizationError('Authentication required.');
    }

    const existing = allTransactions.find((t) => t.id === id);
    if (!existing) {
      throw new Error(`Transaction with ID "${id}" not found.`);
    }

    // ANTI-IDOR SECURITY CHECK: Ensure requesting user owns this transaction!
    if (existing.user_id && existing.user_id !== user.uid) {
      assertResourceOwnership(user.uid, existing.user_id);
    }

    // Validate updated amount if provided
    let cleanAmount = existing.amount;
    if (updates.amount !== undefined) {
      const amtCheck = validateAmount(updates.amount);
      if (!amtCheck.isValid) {
        throw new Error(amtCheck.error || 'Invalid amount.');
      }
      cleanAmount = amtCheck.value;
    }

    const updatedTx: Transaction = {
      ...existing,
      ...updates,
      // Enforce immutability of ownership and creation timestamp
      id: existing.id,
      user_id: existing.user_id,
      user_email: existing.user_email,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
      amount: cleanAmount,
      title: updates.title !== undefined ? sanitizeInput(updates.title) : existing.title,
      description: updates.description !== undefined ? sanitizeInput(updates.description) : existing.description,
      person_name: updates.person_name !== undefined ? sanitizeInput(updates.person_name) : existing.person_name,
      notes: updates.notes !== undefined ? sanitizeInput(updates.notes) : existing.notes,
      metadata: updates.metadata ? { ...existing.metadata, ...updates.metadata } : existing.metadata,
    };

    setAllTransactions((prev) => {
      const updated = prev.map((t) => (t.id === id ? updatedTx : t));
      persistLocally(updated);
      return updated;
    });

    // 1. Update in Supabase (Primary)
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await updateTransactionInSupabase(id, updatedTx);
        setIsSupabaseConnected(true);
      } catch (err: any) {
        console.warn('Supabase update notice, cached locally:', err.message);
      }
    }

    // 2. Secondary update in Firestore
    try {
      await updateTransactionInFirestore(id, updatedTx);
    } catch {}

    return updatedTx;
  };

  // Delete transaction with IDOR check
  const deleteTransaction = async (id: string): Promise<boolean> => {
    if (!id || !user) return false;

    const existing = allTransactions.find((t) => t.id === id);
    if (!existing) return false;

    // ANTI-IDOR SECURITY CHECK: Ensure requesting user owns this transaction!
    if (existing.user_id && existing.user_id !== user.uid) {
      assertResourceOwnership(user.uid, existing.user_id);
    }

    setAllTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      persistLocally(updated);
      return updated;
    });

    // 1. Delete in Supabase (Primary)
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await deleteTransactionFromSupabase(id);
        setIsSupabaseConnected(true);
      } catch (err: any) {
        console.warn('Supabase delete notice, cached locally:', err.message);
      }
    }

    // 2. Secondary delete in Firestore
    try {
      await deleteTransactionFromFirestore(id);
    } catch {}

    return true;
  };

  const clearAllTransactions = async () => {
    for (const t of userTransactions) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await deleteTransactionFromSupabase(t.id);
        } catch {}
      }
      try {
        await deleteTransactionFromFirestore(t.id);
      } catch {}
    }
    setAllTransactions((prev) => prev.filter((t) => !userTransactions.some((ut) => ut.id === t.id)));
  };

  // Summary calculated exclusively from the current user's visible transactions
  const summary: FinancialSummary = useMemo(() => {
    let totalHomeReceived = 0;
    let totalHomeSpent = 0;
    let totalGas = 0;
    let totalGrocery = 0;
    let totalRent = 0;
    let totalElectricity = 0;
    let totalOtherExpenses = 0;
    let totalMoneyGiven = 0;
    let totalMoneyReceived = 0;

    for (const tx of userTransactions) {
      const amt = Number(tx.amount) || 0;

      // Home calculations
      if (tx.category === 'home') {
        if (tx.subcategory === 'received_home' || tx.transaction_type === 'income') {
          totalHomeReceived += amt;
        } else {
          totalHomeSpent += amt;
        }
      }

      // Room calculations
      if (tx.category === 'room') {
        if (tx.subcategory === 'gas') totalGas += amt;
        else if (tx.subcategory === 'grocery') totalGrocery += amt;
        else if (tx.subcategory === 'rent') totalRent += amt;
        else if (tx.subcategory === 'electricity') totalElectricity += amt;
      }

      // Other calculations
      if (tx.category === 'other') {
        totalOtherExpenses += amt;
      }

      // People calculations
      if (tx.category === 'people') {
        if (tx.subcategory === 'money_given') {
          totalMoneyGiven += amt;
        } else if (tx.subcategory === 'money_received') {
          totalMoneyReceived += amt;
        }
      }
    }

    const totalRoomExpenses = totalGas + totalGrocery + totalRent + totalElectricity;
    const remainingHomeBalance = totalHomeReceived - totalHomeSpent;
    const netPeopleBalance = totalMoneyGiven - totalMoneyReceived;

    const totalExpenses = totalHomeSpent + totalRoomExpenses + totalOtherExpenses;
    const totalIncome = totalHomeReceived;
    const availableBalance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      availableBalance,
      totalHomeReceived,
      totalHomeSpent,
      remainingHomeBalance,
      totalGas,
      totalGrocery,
      totalRent,
      totalElectricity,
      totalRoomExpenses,
      totalOtherExpenses,
      totalMoneyGiven,
      totalMoneyReceived,
      netPeopleBalance,
      totalTransactionsCount: userTransactions.length,
    };
  }, [userTransactions]);

  // People summaries for current user
  const peopleSummaries: PersonSummary[] = useMemo(() => {
    const map = new Map<string, { given: number; received: number; txs: Transaction[]; lastDate: string }>();

    for (const tx of userTransactions) {
      if (tx.category === 'people' && tx.person_name) {
        const nameKey = tx.person_name.trim();
        if (!map.has(nameKey)) {
          map.set(nameKey, { given: 0, received: 0, txs: [], lastDate: tx.transaction_date });
        }
        const data = map.get(nameKey)!;
        data.txs.push(tx);
        if (tx.transaction_date > data.lastDate) {
          data.lastDate = tx.transaction_date;
        }
        if (tx.subcategory === 'money_given') {
          data.given += Number(tx.amount) || 0;
        } else {
          data.received += Number(tx.amount) || 0;
        }
      }
    }

    const list: PersonSummary[] = [];
    map.forEach((val, name) => {
      list.push({
        name,
        totalGiven: val.given,
        totalReceived: val.received,
        outstandingBalance: val.given - val.received,
        transactionCount: val.txs.length,
        lastTransactionDate: val.lastDate,
        transactions: val.txs.sort((a, b) =>
          (b.transaction_date + b.transaction_time).localeCompare(a.transaction_date + a.transaction_time)
        ),
      });
    });

    return list.sort((a, b) => Math.abs(b.outstandingBalance) - Math.abs(a.outstandingBalance));
  }, [userTransactions]);

  // Filtered and sorted transactions for current user
  const filteredTransactions = useMemo(() => {
    let list = [...userTransactions];

    if (filterOptions.searchQuery.trim()) {
      const q = filterOptions.searchQuery.toLowerCase().trim();
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

    if (filterOptions.category && filterOptions.category !== 'all') {
      list = list.filter((t) => t.category === filterOptions.category);
    }

    if (filterOptions.subcategory && filterOptions.subcategory !== 'all') {
      list = list.filter((t) => t.subcategory === filterOptions.subcategory);
    }

    if (filterOptions.type && filterOptions.type !== 'all') {
      list = list.filter((t) => t.transaction_type === filterOptions.type);
    }

    if (filterOptions.personName) {
      list = list.filter((t) => t.person_name?.toLowerCase() === filterOptions.personName?.toLowerCase());
    }

    const { preset, startDate, endDate } = filterOptions.dateFilter;
    if (preset === 'custom' && startDate && endDate) {
      list = list.filter((t) => t.transaction_date >= startDate && t.transaction_date <= endDate);
    } else if (preset !== 'all') {
      const range = getPresetDateRange(preset);
      if (range.start && range.end) {
        list = list.filter((t) => t.transaction_date >= range.start && t.transaction_date <= range.end);
      }
    }

    if (filterOptions.minAmount !== undefined && !isNaN(filterOptions.minAmount)) {
      list = list.filter((t) => t.amount >= filterOptions.minAmount!);
    }
    if (filterOptions.maxAmount !== undefined && !isNaN(filterOptions.maxAmount)) {
      list = list.filter((t) => t.amount <= filterOptions.maxAmount!);
    }

    list.sort((a, b) => {
      switch (filterOptions.sortBy) {
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
  }, [userTransactions, filterOptions]);

  return (
    <ExpenseContext.Provider
      value={{
        transactions: userTransactions,
        isLoading,
        error,
        summary,
        peopleSummaries,
        filterOptions,
        setFilterOptions,
        filteredTransactions,
        addTransaction,
        editTransaction,
        deleteTransaction,
        clearAllTransactions,
        refreshTransactions,
        isSupabaseConnected,
        isFirebaseConnected,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
};
