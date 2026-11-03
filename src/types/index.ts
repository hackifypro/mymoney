export type TransactionCategory = 'home' | 'room' | 'other' | 'people' | string;

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
  | 'money_received'
  | string;

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
 * Displays user identity and management status safely.
 */
export interface AdminUserListItem {
  id: string;
  email: string;
  createdAt: string;
  status: 'active' | 'suspended';
  role?: 'admin' | 'user';
  displayPassword?: string;
  display_password?: string;
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
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DynamicSection {
  id: string;
  name: string;
  icon: string;
  description?: string;
  display_order: number;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceSettings {
  isEnabled: boolean;
  title: string;
  message: string;
  expectedRestoration?: string;
  startDate?: string;
  endDate?: string;
}

export interface AppBrandingSettings {
  appName: string;
  subTitle: string;
  logoUrl: string;
  currencySymbol: string;
  currencyCode: string;
  timezone: string;
  allowRegistration: boolean;
  allowLogin: boolean;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'announcement' | 'maintenance';
  target_user_id: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
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
