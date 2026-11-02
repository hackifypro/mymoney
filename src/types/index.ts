export type TransactionCategory = 'home' | 'room' | 'other' | 'people';

export type TransactionSubcategory =
  // Home subcategories
  | 'received_home'
  | 'home_expense'
  // Room subcategories
  | 'gas'
  | 'grocery'
  | 'rent'
  | 'electricity'
  // Other subcategory
  | 'other_expense'
  // People subcategories
  | 'money_given'
  | 'money_received';

export type TransactionType = 'income' | 'expense';

export interface TransactionMetadata {
  // Grocery specific
  grocery_item?: string;
  quantity?: string;
  // Rent & Electricity specific
  month?: string;
  paid_to?: string;
  billing_month?: string;
  // Gas specific
  paid_by?: string;
  // Other expense specific
  spent_at?: string;
  spent_for?: string;
  // General custom fields
  [key: string]: any;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  createdAt?: string;
}

/**
 * STRICT ADMIN DASHBOARD VIEW MODEL
 * Mandated: The admin dashboard must display ONLY:
 * 1. User ID
 * 2. User Login Email / Login ID
 * 3. Account Creation Date
 * 4. Account Status (Active / Suspended)
 *
 * PROHIBITED: Passwords, password hashes, transaction details, personal info, tokens.
 */
export interface AdminUserListItem {
  id: string;
  email: string;
  createdAt: string;
  status: 'active' | 'suspended';
}

export interface Transaction {
  id: string;
  user_id?: string;
  user_email?: string;
  category: TransactionCategory;
  subcategory: TransactionSubcategory;
  transaction_type: TransactionType;
  amount: number;
  title: string;
  description?: string;
  person_name?: string;
  transaction_date: string; // YYYY-MM-DD
  transaction_time: string; // HH:mm:ss or HH:mm
  notes?: string;
  metadata?: TransactionMetadata;
  created_at: string;
  updated_at: string;
}

export interface NewTransactionPayload {
  category: TransactionCategory;
  subcategory: TransactionSubcategory;
  transaction_type: TransactionType;
  amount: number;
  title: string;
  description?: string;
  person_name?: string;
  transaction_date?: string;
  transaction_time?: string;
  notes?: string;
  metadata?: TransactionMetadata;
  user_id?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  totalHomeReceived: number;
  totalHomeSpent: number;
  remainingHomeBalance: number;
  totalGas: number;
  totalGrocery: number;
  totalRent: number;
  totalElectricity: number;
  totalRoomExpenses: number;
  totalOtherExpenses: number;
  totalMoneyGiven: number;
  totalMoneyReceived: number;
  netPeopleBalance: number;
  totalTransactionsCount: number;
}

export interface PersonSummary {
  name: string;
  totalGiven: number;
  totalReceived: number;
  outstandingBalance: number; // Given - Received
  transactionCount: number;
  lastTransactionDate: string;
  transactions: Transaction[];
}

export interface DateFilterRange {
  preset: 'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';
  startDate?: string;
  endDate?: string;
}

export type SortOrder = 'newest' | 'oldest' | 'highest_amount' | 'lowest_amount';

export interface FilterOptions {
  searchQuery: string;
  category?: TransactionCategory | 'all';
  subcategory?: TransactionSubcategory | 'all';
  type?: TransactionType | 'all';
  dateFilter: DateFilterRange;
  minAmount?: number;
  maxAmount?: number;
  sortBy: SortOrder;
  personName?: string;
}
