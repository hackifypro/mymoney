import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Trash2,
  Download,
  Upload,
  User,
  Shield,
  LogOut,
  Sparkles,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
} from '../../lib/supabase';
import { SUPABASE_SQL_SCHEMA } from '../../lib/supabaseSchema';

export const SettingsSection: React.FC = () => {
  const {
    transactions,
    clearAllTransactions,
    refreshTransactions,
    isSupabaseConnected,
  } = useExpense();
  const { theme, setTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();

  // Supabase Configuration State
  const initialConfig = getSavedSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(initialConfig.key);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlEditor, setShowSqlEditor] = useState(false);

  // Clear data confirmation modal
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Logout confirmation modal
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false);

  // Save & Test Supabase Connection
  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = supabaseUrl.trim();
    const cleanKey = supabaseKey.trim();

    if (!cleanUrl || !cleanKey) {
      toast.error('Missing Credentials', 'Please enter both Supabase Project URL and Anon Key.');
      return;
    }

    try {
      setIsTestingSupabase(true);
      const testRes = await testSupabaseConnection(cleanUrl, cleanKey);
      if (testRes.success) {
        saveSupabaseConfig(cleanUrl, cleanKey);
        await refreshTransactions();
        toast.success('Connected to Supabase!', 'Transactions are now backed by your Supabase PostgreSQL database.');
      } else {
        toast.error('Connection Failed', testRes.message);
      }
    } catch (err: any) {
      toast.error('Connection Error', err.message || 'Could not verify Supabase connection.');
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleDisconnectSupabase = () => {
    saveSupabaseConfig('', '');
    setSupabaseUrl('');
    setSupabaseKey('');
    toast.info('Disconnected', 'Supabase credentials removed from local cache.');
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    toast.success('SQL Copied', 'Paste into your Supabase project -> SQL Editor.');
  };

  const handleExportBackup = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_money_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Backup Created', 'Full JSON data file downloaded.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          localStorage.setItem('my_money_transactions_real', JSON.stringify(parsed));
          await refreshTransactions();
          toast.success('Backup Restored', `${parsed.length} transactions restored.`);
        } else {
          toast.error('Invalid Format', 'JSON file must contain an array of transactions.');
        }
      } catch (err: any) {
        toast.error('Import Failed', err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmClear = async () => {
    try {
      setIsClearing(true);
      await clearAllTransactions();
      toast.success('Records Cleared', 'Your transactions have been emptied.');
      setIsConfirmClearOpen(false);
    } catch (err: any) {
      toast.error('Clear Failed', err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleConfirmLogout = async () => {
    await logout();
    toast.info('Logged Out', 'You have been logged out successfully.');
    setIsConfirmLogoutOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-8 max-w-4xl">
      {/* 1. User Profile & Account Settings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-lg shadow-md">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                  {user?.displayName || 'My Account'}
                </h3>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Admin</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>User</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => setIsConfirmLogoutOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out (Logout)</span>
          </button>
        </div>

        {/* Private Data Security Notice */}
        <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
            <span className="font-bold">Private Account Active:</span> Your financial transactions are
            isolated to your verified account. No other user can view or modify your financial ledger.
          </p>
        </div>

        {/* Admin Controls Notice */}
        {isAdmin && (
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
            <div>
              <p className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Security Administration Dashboard</span>
              </p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                Manage user account statuses (Active / Suspended) and review security audit logs from the left sidebar "Admin Security" tab.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Cloud Synchronization Status (Normal User View: No URL or Keys) */}
      {!isAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Cloud Synchronization & Backup
                </h4>
                <p className="text-[11px] text-slate-500">
                  Continuous encrypted cloud backup with multi-device synchronization
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold w-fit ${
                isSupabaseConnected
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cloud Sync Active</span>
            </span>
          </div>
        </div>
      )}

      {/* 2b. Supabase Cloud Database Configuration (Admin Only) */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Supabase Cloud Database (Admin Only)
                </h4>
                <p className="text-[11px] text-slate-500">
                  PostgreSQL database with Row Level Security & Realtime Sync
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isSupabaseConnected
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}
              >
                {isSupabaseConnected ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Supabase Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Local Mode / Not Connected</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSaveSupabase} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supabase Anon / Public API Key
              </label>
              <input
                type="password"
                required
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isTestingSupabase}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isTestingSupabase ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Test & Connect Supabase</span>
                    </>
                  )}
                </button>

                {(supabaseUrl || supabaseKey) && (
                  <button
                    type="button"
                    onClick={handleDisconnectSupabase}
                    className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Remove saved credentials"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowSqlEditor(!showSqlEditor)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {showSqlEditor ? 'Hide SQL Script' : 'View / Copy SQL Schema →'}
              </button>
            </div>
          </form>

          {/* Collapsible SQL Schema Viewer & 1-Click Copy */}
          {showSqlEditor && (
            <div className="mt-3 p-4 bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 font-mono">
                  PostgreSQL Schema with Row Level Security (RLS)
                </span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL Schema'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Open your Supabase dashboard → **SQL Editor** → Paste and click **Run**. This will create the `transactions`, `profiles`, and `security_audit_logs` tables with strict RLS policies!
              </p>
              <pre className="p-3 bg-slate-900 rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48 border border-slate-800">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 3. System Preferences */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
          Preferences & Locale
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Theme */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">Appearance Mode</p>
              <p className="text-[11px] text-slate-500">Dark / Light visual theme</p>
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  theme === 'light' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-400'
                }`}
                title="Light Mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400'
                }`}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Timezone */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">Timezone & Currency</p>
              <p className="text-[11px] text-slate-500">Indian Standard Time (IST) · INR (₹)</p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold font-mono">
              ₹ INR
            </div>
          </div>
        </div>
      </div>

      {/* 4. Backup, Restore & Data Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
          Data Backup & Management
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Download JSON Backup */}
          <button
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download My Records Backup</span>
          </button>

          {/* Import JSON Backup */}
          <label className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span>Restore Backup File</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>

        {/* Clear Data Danger Zone */}
        <div className="pt-3 border-t border-rose-100 dark:border-rose-950/60 flex items-center justify-between">
          <div>
            <p className="font-semibold text-xs text-rose-600 dark:text-rose-400">Clear My Transactions</p>
            <p className="text-[11px] text-slate-400">Permanently empty all my recorded transactions</p>
          </div>

          <button
            onClick={() => setIsConfirmClearOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear My Data</span>
          </button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmClearOpen}
        title="Clear My Transactions?"
        message="This will delete your recorded transactions from the cloud database. Download a backup first if you need your financial records."
        confirmLabel="Yes, Clear My Data"
        isLoading={isClearing}
        onConfirm={handleConfirmClear}
        onCancel={() => setIsConfirmClearOpen(false)}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmLogoutOpen}
        title="Log Out of Account?"
        message="Are you sure you want to log out? You will need your email and password to log back in."
        confirmLabel="Log Out"
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsConfirmLogoutOpen(false)}
      />
    </div>
  );
};
