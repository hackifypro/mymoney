import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  KeyRound,
  FileText,
  AlertTriangle,
  Lock,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Send,
  LayoutDashboard,
  Sliders,
  Bell,
  Wrench,
  FolderKanban,
  Download,
  Plus,
  Edit3,
  RotateCcw,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  GraduationCap,
  Briefcase,
  Heart,
  Plane,
  Car,
  DoorOpen,
  ShoppingBag,
  Home as HomeIcon,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useExpense } from '../../context/ExpenseContext';
import { useToast } from '../../context/ToastContext';
import { AdminUserListItem, Transaction, DynamicSection, MaintenanceSettings, AppBrandingSettings, BroadcastNotification } from '../../types';
import { securityAudit, SecurityAuditEntry } from '../../lib/security';
import { formatINR, formatDisplayDate, formatDisplayTime, getCurrentISTDate, getCurrentISTTime } from '../../lib/dateUtils';
import { MaintenanceScreen } from '../maintenance/MaintenanceScreen';
import { EditTransactionModal } from '../modals/EditTransactionModal';

type AdminTab =
  | 'overview'
  | 'users'
  | 'transactions'
  | 'sections'
  | 'recycle_bin'
  | 'notifications'
  | 'maintenance'
  | 'security'
  | 'settings';

const availableIcons = [
  'Home',
  'DoorOpen',
  'ShoppingBag',
  'Users',
  'GraduationCap',
  'Briefcase',
  'Heart',
  'Plane',
  'Car',
  'Sparkles',
  'FolderKanban',
];

export const AdminDashboard: React.FC = () => {
  const {
    user,
    isAdmin,
    getAdminUsersList,
    toggleUserStatus,
    requestPasswordReset,
    adminSetUserPassword,
    adminDeleteUser,
  } = useAuth();

  const {
    allGlobalTransactions,
    recycleBinTransactions,
    restoreTransaction,
    permanentDeleteTransaction,
    deleteTransaction,
    dynamicSections,
    addSection,
    updateSection,
    deleteSection,
    maintenanceSettings,
    updateMaintenanceSettings,
    appBranding,
    updateAppBranding,
    notifications,
    createNotification,
    deactivateNotification,
    refreshTransactions,
  } = useExpense();

  const toast = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [usersList, setUsersList] = useState<AdminUserListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // User Management State
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedPassId, setCopiedPassId] = useState<string | null>(null);

  // User Drill-Down Modal State
  const [drillDownUser, setDrillDownUser] = useState<AdminUserListItem | null>(null);
  const [drillDownSearch, setDrillDownSearch] = useState<string>('');

  // Modals for User Management
  const [pendingStatusAction, setPendingStatusAction] = useState<{
    userId: string;
    email: string;
    action: 'suspend' | 'activate';
  } | null>(null);

  const [passwordModalUser, setPasswordModalUser] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [showConfirmPasswordText, setShowConfirmPasswordText] = useState<boolean>(false);
  const [isSettingPassword, setIsSettingPassword] = useState<boolean>(false);

  // Reset Link modal state
  const [resetLinkModalUser, setResetLinkModalUser] = useState<{
    email: string;
    link: string;
  } | null>(null);
  const [copiedResetLink, setCopiedResetLink] = useState<boolean>(false);

  const [deleteModalUser, setDeleteModalUser] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  // Transactions Tab State
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const [txUserFilter, setTxUserFilter] = useState<string>('all');
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>('all');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txDateFilter, setTxDateFilter] = useState<string>('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Dynamic Section Modal State
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionModalMode, setSectionModalMode] = useState<'create' | 'edit'>('create');
  const [sectionFormId, setSectionFormId] = useState('');
  const [sectionFormName, setSectionFormName] = useState('');
  const [sectionFormIcon, setSectionFormIcon] = useState('FolderKanban');
  const [sectionFormDesc, setSectionFormDesc] = useState('');
  const [sectionFormOrder, setSectionFormOrder] = useState<number>(1);
  const [sectionFormEnabled, setSectionFormEnabled] = useState(true);

  // Maintenance Settings State Form
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceSettings>(maintenanceSettings);
  const [showMaintenancePreview, setShowMaintenancePreview] = useState(false);
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);

  // App Branding Settings State Form
  const [brandingForm, setBrandingForm] = useState<AppBrandingSettings>(appBranding);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Broadcast Notification Form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'warning' | 'maintenance' | 'announcement'>('info');
  const [notifTarget, setNotifTarget] = useState<string>('all');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Load User Data & Audit Logs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await getAdminUsersList();
      setUsersList(list);
      setAuditLogs(securityAudit.getLogs());
    } catch (err: any) {
      toast.error('Admin Query Notice', err.message || 'Could not fetch user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Keep local forms synced with context changes
  useEffect(() => {
    setMaintenanceForm(maintenanceSettings);
  }, [maintenanceSettings]);

  useEffect(() => {
    setBrandingForm(appBranding);
  }, [appBranding]);

  // -------------------------------------------------------------
  // CALCULATED OVERVIEW METRICS (ACROSS ALL USERS)
  // -------------------------------------------------------------
  const overviewStats = useMemo(() => {
    const totalUsers = usersList.length;
    const activeUsers = usersList.filter((u) => u.status === 'active').length;
    const suspendedUsers = usersList.filter((u) => u.status === 'suspended').length;

    // Cross-user transaction aggregation
    let totalHome = 0;
    let totalRoom = 0;
    let totalOther = 0;
    let totalGiven = 0;
    let totalReceived = 0;
    let totalVolume = 0;

    allGlobalTransactions.forEach((t) => {
      totalVolume += t.amount;
      if (t.category === 'home') totalHome += t.amount;
      if (t.category === 'room') totalRoom += t.amount;
      if (t.category === 'other') totalOther += t.amount;
      if (t.category === 'people') {
        if (t.subcategory === 'money_given') totalGiven += t.amount;
        if (t.subcategory === 'money_received') totalReceived += t.amount;
      }
    });

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalTransactions: allGlobalTransactions.length,
      totalVolume,
      totalHome,
      totalRoom,
      totalOther,
      totalGiven,
      totalReceived,
      recycleBinCount: recycleBinTransactions.length,
    };
  }, [usersList, allGlobalTransactions, recycleBinTransactions]);

  // Copy ID helper
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.info('Copied', 'User ID copied to clipboard.');
  };

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPassword = (userId: string, pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedPassId(userId);
    setTimeout(() => setCopiedPassId(null), 2000);
    toast.info('Copied', 'User password copied to clipboard.');
  };

  // Status toggle handler
  const handleConfirmStatusToggle = async () => {
    if (!pendingStatusAction) return;
    try {
      const newStatus = pendingStatusAction.action === 'suspend' ? 'suspended' : 'active';
      const res = await toggleUserStatus(pendingStatusAction.userId, newStatus);
      if (res.success) {
        toast.success('Status Updated', res.message);
        await loadData();
      } else {
        toast.error('Action Restricted', res.message);
      }
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    } finally {
      setPendingStatusAction(null);
    }
  };

  // Trigger secure reset password link
  const handleTriggerPasswordReset = async (email: string) => {
    try {
      const res = await requestPasswordReset(email);
      const link = res.resetLink || `${window.location.origin}/#reset-password&email=${encodeURIComponent(email)}`;
      setResetLinkModalUser({ email, link });
      if (res.success) {
        toast.success('Reset Dispatched', `Password reset instructions prepared for ${email}`);
      } else {
        toast.error('Reset Failed', res.message);
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  // Set Password (Requires entering password 2 times)
  const handleOpenPasswordModal = (target: { id: string; email: string }) => {
    setPasswordModalUser({ userId: target.id, email: target.email });
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setShowPasswordText(false);
    setShowConfirmPasswordText(false);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = 'Pass@';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordInput(pass);
    setConfirmPasswordInput(pass);
    setShowPasswordText(true);
    setShowConfirmPasswordText(true);
    toast.info('Generated', 'Temporary secure password generated and filled in both fields.');
  };

  const handleConfirmSetPassword = async () => {
    if (!passwordModalUser) return;
    if (!newPasswordInput || newPasswordInput.length < 8) {
      toast.error('Invalid Password', 'Password must be at least 8 characters long.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      toast.error('Passwords Do Not Match', 'Please enter the same password in both fields (2 times).');
      return;
    }

    setIsSettingPassword(true);
    try {
      const res = await adminSetUserPassword(passwordModalUser.userId, newPasswordInput);
      if (res.success) {
        toast.success('Password Changed!', `New password has been set for ${passwordModalUser.email}`);
        setPasswordModalUser(null);
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        await loadData();
      } else {
        toast.error('Failed to Set Password', res.message);
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setIsSettingPassword(false);
    }
  };

  // Delete User
  const handleOpenDeleteModal = (target: { id: string; email: string }) => {
    setDeleteModalUser({ userId: target.id, email: target.email });
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteModalUser) return;
    setIsDeletingUser(true);
    try {
      const res = await adminDeleteUser(deleteModalUser.userId);
      if (res.success) {
        toast.success('User Purged', res.message);
        setDeleteModalUser(null);
        await loadData();
      } else {
        toast.error('Delete Failed', res.message);
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Save Maintenance Settings
  const handleSaveMaintenance = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingMaintenance(true);
    try {
      const ok = await updateMaintenanceSettings(maintenanceForm);
      if (ok) {
        toast.success('Maintenance Saved', `Maintenance Mode is now ${maintenanceForm.isEnabled ? 'ACTIVE' : 'DISABLED'}.`);
      } else {
        toast.error('Save Failed', 'Unable to persist maintenance configuration.');
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setIsSavingMaintenance(false);
    }
  };

  // Save Branding Settings
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    try {
      const ok = await updateAppBranding(brandingForm);
      if (ok) {
        toast.success('Branding Updated', 'Application branding and access settings updated.');
      } else {
        toast.error('Save Failed', 'Unable to persist branding settings.');
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Section Modal Helpers
  const handleOpenNewSectionModal = () => {
    setSectionModalMode('create');
    setSectionFormId('');
    setSectionFormName('');
    setSectionFormIcon('FolderKanban');
    setSectionFormDesc('');
    setSectionFormOrder(dynamicSections.length + 1);
    setSectionFormEnabled(true);
    setIsSectionModalOpen(true);
  };

  const handleOpenEditSectionModal = (sec: DynamicSection) => {
    setSectionModalMode('edit');
    setSectionFormId(sec.id);
    setSectionFormName(sec.name);
    setSectionFormIcon(sec.icon);
    setSectionFormDesc(sec.description || '');
    setSectionFormOrder(sec.display_order);
    setSectionFormEnabled(sec.is_enabled);
    setIsSectionModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionFormName.trim()) {
      toast.error('Name Required', 'Please enter a section name.');
      return;
    }

    const cleanId =
      sectionModalMode === 'edit'
        ? sectionFormId
        : sectionFormId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') ||
          sectionFormName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    try {
      if (sectionModalMode === 'create') {
        const ok = await addSection({
          id: cleanId,
          name: sectionFormName.trim(),
          icon: sectionFormIcon,
          description: sectionFormDesc.trim(),
          display_order: Number(sectionFormOrder) || dynamicSections.length + 1,
          is_enabled: sectionFormEnabled,
        });
        if (ok) {
          toast.success('Section Created', `"${sectionFormName}" section created successfully.`);
          setIsSectionModalOpen(false);
        } else {
          toast.error('Creation Failed', 'Could not create section.');
        }
      } else {
        const ok = await updateSection(cleanId, {
          name: sectionFormName.trim(),
          icon: sectionFormIcon,
          description: sectionFormDesc.trim(),
          display_order: Number(sectionFormOrder) || 1,
          is_enabled: sectionFormEnabled,
        });
        if (ok) {
          toast.success('Section Updated', `"${sectionFormName}" updated.`);
          setIsSectionModalOpen(false);
        } else {
          toast.error('Update Failed', 'Could not update section.');
        }
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  const handleToggleSectionEnabled = async (sec: DynamicSection) => {
    try {
      const ok = await updateSection(sec.id, { is_enabled: !sec.is_enabled });
      if (ok) {
        toast.info(
          sec.is_enabled ? 'Section Hidden' : 'Section Enabled',
          `"${sec.name}" is now ${sec.is_enabled ? 'disabled in dashboard' : 'visible in dashboard'}.`
        );
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  const handleDeleteSection = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete section "${name}"? Historical transactions will remain preserved.`)) {
      return;
    }
    try {
      const ok = await deleteSection(id);
      if (ok) {
        toast.success('Section Removed', `"${name}" section deleted. Historical records preserved.`);
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  // Broadcast Notification
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error('Missing Fields', 'Please provide both title and message.');
      return;
    }

    setIsSendingNotif(true);
    try {
      const ok = await createNotification({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType,
        target_user_id: notifTarget === 'all' ? undefined : notifTarget,
        is_active: true,
      });

      if (ok) {
        toast.success('Announcement Broadcast', 'Notification published to all targeted accounts.');
        setNotifTitle('');
        setNotifMessage('');
      } else {
        toast.error('Broadcast Failed', 'Could not save notification.');
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleDeactivateNotification = async (id: string) => {
    try {
      const ok = await deactivateNotification(id);
      if (ok) {
        toast.info('Deactivated', 'Announcement has been deactivated.');
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  // CSV Export for Transactions
  const handleExportTransactionsCSV = () => {
    try {
      const headers = ['ID', 'User Email', 'Category', 'Subcategory', 'Type', 'Title', 'Amount (INR)', 'Date', 'Time', 'Person', 'Notes'];
      const rows = allGlobalTransactions.map((t) => [
        t.id,
        t.user_email || 'N/A',
        t.category,
        t.subcategory || '',
        t.transaction_type,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.amount,
        t.transaction_date,
        t.transaction_time,
        t.person_name || '',
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `my_money_all_transactions_${getCurrentISTDate()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export Complete', 'Downloaded full master transaction ledger (CSV).');
    } catch (err: any) {
      toast.error('Export Failed', err.message);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase().trim()) ||
        u.id.toLowerCase().includes(userSearchQuery.toLowerCase().trim());
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [usersList, userSearchQuery, statusFilter]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return allGlobalTransactions.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(txSearchQuery.toLowerCase()) ||
        (t.user_email && t.user_email.toLowerCase().includes(txSearchQuery.toLowerCase())) ||
        (t.person_name && t.person_name.toLowerCase().includes(txSearchQuery.toLowerCase())) ||
        t.amount.toString().includes(txSearchQuery);
      const matchesUser = txUserFilter === 'all' || t.user_id === txUserFilter || t.user_email === txUserFilter;
      const matchesCategory = txCategoryFilter === 'all' || t.category === txCategoryFilter;
      const matchesType = txTypeFilter === 'all' || t.transaction_type === txTypeFilter;
      const matchesDate = !txDateFilter || t.transaction_date === txDateFilter;
      return matchesSearch && matchesUser && matchesCategory && matchesType && matchesDate;
    });
  }, [allGlobalTransactions, txSearchQuery, txUserFilter, txCategoryFilter, txTypeFilter, txDateFilter]);

  // Filtered Drill-down user transactions
  const drillDownUserTransactions = useMemo(() => {
    if (!drillDownUser) return [];
    return allGlobalTransactions.filter(
      (t) =>
        (t.user_id === drillDownUser.id || (t.user_email && t.user_email.toLowerCase() === drillDownUser.email.toLowerCase())) &&
        (t.title.toLowerCase().includes(drillDownSearch.toLowerCase()) ||
          t.category.toLowerCase().includes(drillDownSearch.toLowerCase()))
    );
  }, [allGlobalTransactions, drillDownUser, drillDownSearch]);

  const drillDownUserSummary = useMemo(() => {
    if (!drillDownUser) return { totalSpent: 0, totalIncome: 0, balance: 0 };
    let totalSpent = 0;
    let totalIncome = 0;
    drillDownUserTransactions.forEach((t) => {
      if (t.transaction_type === 'expense' || t.subcategory === 'money_given') {
        totalSpent += t.amount;
      } else {
        totalIncome += t.amount;
      }
    });
    return { totalSpent, totalIncome, balance: totalIncome - totalSpent };
  }, [drillDownUser, drillDownUserTransactions]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(
      (log) =>
        log.event_type.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.user_id?.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        JSON.stringify(log.details).toLowerCase().includes(auditSearchQuery.toLowerCase())
    );
  }, [auditLogs, auditSearchQuery]);

  // Strictly block unauthorized users from this view
  if (!isAdmin || user?.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-900 shadow-xl">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          403 Forbidden: Administrative Access Denied
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
          This endpoint requires verified server-side administrative authorization. All unauthorized attempts are logged
          to the security audit trail.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Admin Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                Admin Control Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Master Authority
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Multi-user isolation, platform governance, dynamic section builder & maintenance controls.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Maintenance Mode Status Pill */}
          <div
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
              maintenanceSettings.isEnabled
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md animate-pulse'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>
              {maintenanceSettings.isEnabled ? 'Maintenance ACTIVE' : 'System ONLINE'}
            </span>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        {[
          { id: 'overview' as AdminTab, label: 'Overview', icon: LayoutDashboard },
          { id: 'users' as AdminTab, label: 'User Directory', icon: Users, badge: usersList.length },
          { id: 'transactions' as AdminTab, label: 'All Transactions', icon: FileText, badge: allGlobalTransactions.length },
          { id: 'sections' as AdminTab, label: 'Dynamic Sections', icon: FolderKanban, badge: dynamicSections.length },
          { id: 'recycle_bin' as AdminTab, label: 'Recycle Bin', icon: Trash2, badge: recycleBinTransactions.length },
          { id: 'notifications' as AdminTab, label: 'Broadcasts', icon: Bell, badge: notifications.filter((n) => n.is_active).length },
          { id: 'maintenance' as AdminTab, label: 'Maintenance Mode', icon: Wrench, alert: maintenanceSettings.isEnabled },
          { id: 'security' as AdminTab, label: 'Security & Audit', icon: Shield, badge: auditLogs.length },
          { id: 'settings' as AdminTab, label: 'App Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.alert && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: OVERVIEW & SYSTEM METRICS                          */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* User Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{overviewStats.totalUsers}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Total active profiles</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Active Users</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{overviewStats.activeUsers}</h3>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-1">Full system access</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Suspended Users</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{overviewStats.suspendedUsers}</h3>
              <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70 mt-1">Access locked</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Recycle Bin Items</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{overviewStats.recycleBinCount}</h3>
              <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-1">Soft-deleted items</p>
            </div>
          </div>

          {/* Cross-User Financial Aggregation */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Global Financial Ledger Aggregation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aggregated cross-user transaction volume strictly partitioned at the database layer.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>View Master Ledger</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Transactions</span>
                <p className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">{overviewStats.totalTransactions}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Volume</span>
                <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatINR(overviewStats.totalVolume)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Home Entries</span>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(overviewStats.totalHome)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Room Expenses</span>
                <p className="text-base font-black text-rose-600 dark:text-rose-400 mt-1">{formatINR(overviewStats.totalRoom)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Udhar Given</span>
                <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-1">{formatINR(overviewStats.totalGiven)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Udhar Received</span>
                <p className="text-base font-black text-teal-600 dark:text-teal-400 mt-1">{formatINR(overviewStats.totalReceived)}</p>
              </div>
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('users')}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all cursor-pointer shadow-sm group"
            >
              <Users className="w-8 h-8 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">User Management</h4>
              <p className="text-xs text-slate-400 mt-1">Inspect passwords, toggle status, reset access, drill-down.</p>
            </div>

            <div
              onClick={() => setActiveTab('sections')}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition-all cursor-pointer shadow-sm group"
            >
              <FolderKanban className="w-8 h-8 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Dynamic Section Builder</h4>
              <p className="text-xs text-slate-400 mt-1">Add, rename, reorder or disable expense categories.</p>
            </div>

            <div
              onClick={() => setActiveTab('maintenance')}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-all cursor-pointer shadow-sm group"
            >
              <Wrench className="w-8 h-8 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Maintenance Mode</h4>
              <p className="text-xs text-slate-400 mt-1">Take application offline for repairs with custom splash screen.</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: USER MANAGEMENT & CREDENTIALS                      */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by email or UUID..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(['all', 'active', 'suspended'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">User ID (UUID)</th>
                    <th className="py-3.5 px-4">Login Email / ID</th>
                    <th className="py-3.5 px-4">Password Security</th>
                    <th className="py-3.5 px-4">Registration Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No registered users found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isRevealed = Boolean(revealedPasswords[u.id]);
                      const passValue = u.display_password || u.displayPassword || '********';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span>{u.id.slice(0, 10)}...</span>
                              <button
                                onClick={() => handleCopyId(u.id)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title="Copy full UUID"
                              >
                                {copiedId === u.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              <span>{u.email}</span>
                              {u.role === 'admin' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                  ADMIN
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Password Security Column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                {isRevealed ? passValue : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(u.id)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title={isRevealed ? 'Hide Password' : 'Show Password'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              {(u.display_password || u.displayPassword) && (
                                <button
                                  onClick={() => handleCopyPassword(u.id, (u.display_password || u.displayPassword)!)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                  title="Copy Password"
                                >
                                  {copiedPassId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                u.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Drill Down into User's Records */}
                              <button
                                onClick={() => setDrillDownUser(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                                title="View User Records & Reports"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>

                              {/* Set Password */}
                              <button
                                onClick={() => handleOpenPasswordModal(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors"
                                title="Set New Password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Send Reset Link */}
                              <button
                                onClick={() => handleTriggerPasswordReset(u.email)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
                                title="Send Password Reset Email"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>

                              {/* Suspend / Activate */}
                              {u.role !== 'admin' && (
                                <button
                                  onClick={() =>
                                    setPendingStatusAction({
                                      userId: u.id,
                                      email: u.email,
                                      action: u.status === 'active' ? 'suspend' : 'activate',
                                    })
                                  }
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    u.status === 'active'
                                      ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60'
                                      : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                                  }`}
                                  title={u.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                                >
                                  {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                </button>
                              )}

                              {/* Delete User */}
                              {u.role !== 'admin' && (
                                <button
                                  onClick={() => handleOpenDeleteModal(u)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                                  title="Delete User Permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: GLOBAL FINANCIAL & TRANSACTION MANAGEMENT          */}
      {/* ========================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Master Transaction Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, owner email, person or amount..."
                  value={txSearchQuery}
                  onChange={(e) => setTxSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              <button
                onClick={handleExportTransactionsCSV}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <select
                value={txUserFilter}
                onChange={(e) => setTxUserFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="all">All Users</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                  </option>
                ))}
              </select>

              <select
                value={txCategoryFilter}
                onChange={(e) => setTxCategoryFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="all">All Categories</option>
                {dynamicSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="given">Udhar Given</option>
                <option value="received">Udhar Received</option>
              </select>

              <input
                type="date"
                value={txDateFilter}
                onChange={(e) => setTxDateFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>
          </div>

          {/* Master Transactions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Owner</th>
                    <th className="py-3.5 px-4">Title & Details</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No transactions match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                          {tx.user_email || (tx.user_id ? tx.user_id.slice(0, 8) : 'N/A')}
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{tx.title}</p>
                          {tx.person_name && (
                            <p className="text-[10px] text-slate-400">Person: {tx.person_name}</p>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {tx.category}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {formatDisplayDate(tx.transaction_date)} • {formatDisplayTime(tx.transaction_time)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-black text-sm ${
                              tx.transaction_type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {tx.transaction_type === 'income' ? '+' : '-'}
                            {formatINR(tx.amount)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingTransaction(tx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              title="Edit Record"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Move "${tx.title}" to Recycle Bin?`)) {
                                  await deleteTransaction(tx.id);
                                  toast.success('Moved to Recycle Bin', 'Record moved safely.');
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                              title="Soft Delete to Recycle Bin"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: DYNAMIC CATEGORY & SECTION MANAGEMENT              */}
      {/* ========================================================= */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Dynamic Section Management System
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Create new expense categories, change icons, reorder, or disable sections. Deleting or disabling sections never deletes historical transactions.
              </p>
            </div>

            <button
              onClick={handleOpenNewSectionModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Section</span>
            </button>
          </div>

          {/* Section Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dynamicSections.map((sec) => (
              <div
                key={sec.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all shadow-sm flex flex-col justify-between ${
                  sec.is_enabled
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'border-slate-200/50 dark:border-slate-800/50 opacity-60 bg-slate-50/50 dark:bg-slate-950/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      #{sec.display_order} • ID: {sec.id}
                    </span>

                    <button
                      onClick={() => handleToggleSectionEnabled(sec)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                        sec.is_enabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {sec.is_enabled ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {sec.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {sec.description || 'No description set.'}
                  </p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono mt-2">
                    Icon: {sec.icon}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditSectionModal(sec)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                    title="Edit Section"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {!['home', 'room', 'other', 'people'].includes(sec.id) && (
                    <button
                      onClick={() => handleDeleteSection(sec.id, sec.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60"
                      title="Delete Section (Preserves Records)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MASTER RECYCLE BIN                                 */}
      {/* ========================================================= */}
      {activeTab === 'recycle_bin' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Admin Master Recycle Bin
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                All soft-deleted records across all users reside here. You can restore records to active status or purge them permanently.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              {recycleBinTransactions.length} Deleted Items
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Owner</th>
                    <th className="py-3.5 px-4">Title</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Deleted At</th>
                    <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recycleBinTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Recycle Bin is empty. No deleted transactions.
                      </td>
                    </tr>
                  ) : (
                    recycleBinTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                          {tx.user_email || (tx.user_id ? tx.user_id.slice(0, 8) : 'N/A')}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {tx.title}
                        </td>

                        <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                          {tx.category}
                        </td>

                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {tx.deleted_at ? new Date(tx.deleted_at).toLocaleString() : 'N/A'}
                        </td>

                        <td className="py-3 px-4 text-right font-black">
                          {formatINR(tx.amount)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={async () => {
                                await restoreTransaction(tx.id);
                                toast.success('Restored', `"${tx.title}" restored.`);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>

                            <button
                              onClick={async () => {
                                if (window.confirm(`Permanently delete "${tx.title}"? Irreversible.`)) {
                                  await permanentDeleteTransaction(tx.id);
                                  toast.success('Purged', 'Record permanently deleted.');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Purge</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: NOTIFICATIONS & BROADCASTS                         */}
      {/* ========================================================= */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Create Broadcast Form */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-500" />
              <span>Create System Broadcast / Announcement</span>
            </h3>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Notice Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Scheduled Database Maintenance Tonight"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Notice Type</label>
                  <select
                    value={notifType}
                    onChange={(e: any) => setNotifType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="info">Information (Blue)</option>
                    <option value="warning">Warning / Alert (Red)</option>
                    <option value="maintenance">Maintenance Notice (Amber)</option>
                    <option value="announcement">General Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Audience</label>
                  <select
                    value={notifTarget}
                    onChange={(e) => setNotifTarget(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="all">All Registered Users</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Message Body *</label>
                <textarea
                  rows={3}
                  placeholder="Type the message that will appear in user notification bells..."
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSendingNotif}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSendingNotif ? 'Broadcasting...' : 'Publish Broadcast'}
              </button>
            </form>
          </div>

          {/* Active Notifications List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Active Announcements ({notifications.length})
            </h4>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No announcements published.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{n.title}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                          {n.type}
                        </span>
                        {!n.is_active && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Target: {n.target_user_id || 'Global (All Users)'} • {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>

                    {n.is_active && (
                      <button
                        onClick={() => handleDeactivateNotification(n.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 cursor-pointer"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: MAINTENANCE MODE CONTROL PANEL                     */}
      {/* ========================================================= */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Application Maintenance Mode
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      maintenanceForm.isEnabled
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {maintenanceForm.isEnabled ? 'ACTIVE' : 'OFFLINE'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  When enabled, normal users are blocked with a dedicated maintenance screen. Admins retain full access.
                </p>
              </div>

              {/* Master Toggle */}
              <button
                type="button"
                onClick={() => setMaintenanceForm((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer ${
                  maintenanceForm.isEnabled
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {maintenanceForm.isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                <span>{maintenanceForm.isEnabled ? 'MAINTENANCE MODE IS ON' : 'MAINTENANCE MODE IS OFF'}</span>
              </button>
            </div>

            {/* Custom Content Form */}
            <form onSubmit={handleSaveMaintenance} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Maintenance Splash Title
                </label>
                <input
                  type="text"
                  value={maintenanceForm.title}
                  onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Maintenance Message for Users
                </label>
                <textarea
                  rows={3}
                  value={maintenanceForm.message}
                  onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expected Restoration Time
                </label>
                <input
                  type="text"
                  value={maintenanceForm.expectedRestoration}
                  onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, expectedRestoration: e.target.value }))}
                  placeholder="e.g. Within 2 hours, Today at 2:00 PM IST"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingMaintenance}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingMaintenance ? 'Saving Configuration...' : 'Save & Enforce Maintenance Mode'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowMaintenancePreview(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Preview Maintenance Splash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 8: SECURITY & AUDIT TRAIL                             */}
      {/* ========================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <span>Immutable Security Audit Log</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tamper-evident logs recording administrative modifications, logins, status changes, and access events.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter audit logs..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-3">Timestamp (IST)</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Subject / Actor</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        No security audit logs recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.event_type.includes('FAILED') || log.event_type.includes('FAILURE') || log.event_type.includes('SUSPICIOUS')
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            }`}
                          >
                            {log.event_type}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                          {log.user_email || log.user_id || 'System'}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 9: APPLICATION SETTINGS & BRANDING                    */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Application & Platform Configuration
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage global application branding, logo, currency standards, and user access registration rules.
              </p>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Application Name
                  </label>
                  <input
                    type="text"
                    value={brandingForm.appName}
                    onChange={(e) => setBrandingForm((prev) => ({ ...prev, appName: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subtitle / Organization
                  </label>
                  <input
                    type="text"
                    value={brandingForm.subTitle}
                    onChange={(e) => setBrandingForm((prev) => ({ ...prev, subTitle: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Currency Symbol & Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={brandingForm.currencySymbol}
                      onChange={(e) => setBrandingForm((prev) => ({ ...prev, currencySymbol: e.target.value }))}
                      className="w-16 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-bold"
                    />
                    <input
                      type="text"
                      value={brandingForm.currencyCode}
                      onChange={(e) => setBrandingForm((prev) => ({ ...prev, currencyCode: e.target.value }))}
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Timezone Standard
                  </label>
                  <input
                    type="text"
                    value={brandingForm.timezone}
                    onChange={(e) => setBrandingForm((prev) => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">Allow New Registrations</h5>
                    <p className="text-[11px] text-slate-400">Controls whether new users can sign up.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBrandingForm((prev) => ({ ...prev, allowRegistration: !prev.allowRegistration }))}
                    className="cursor-pointer"
                  >
                    {brandingForm.allowRegistration ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">User Login Allowed</h5>
                    <p className="text-[11px] text-slate-400">Controls normal user authentication access.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBrandingForm((prev) => ({ ...prev, allowLogin: !prev.allowLogin }))}
                    className="cursor-pointer"
                  >
                    {brandingForm.allowLogin ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingBranding}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSavingBranding ? 'Saving Settings...' : 'Save Application Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DRILL DOWN MODAL: USER FINANCIAL RECORDS                  */}
      {/* ========================================================= */}
      {drillDownUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  {drillDownUser.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{drillDownUser.email}</h3>
                  <p className="text-[10px] font-mono text-slate-400">UUID: {drillDownUser.id}</p>
                </div>
              </div>

              <button
                onClick={() => setDrillDownUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Financial Snapshot */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Inflow / Received</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  +{formatINR(drillDownUserSummary.totalIncome)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Outflow / Spent</p>
                <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  -{formatINR(drillDownUserSummary.totalSpent)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Net Computed Balance</p>
                <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {formatINR(drillDownUserSummary.balance)}
                </p>
              </div>
            </div>

            {/* Search Input for Drilldown */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter this user's records..."
                value={drillDownSearch}
                onChange={(e) => setDrillDownSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* User Transactions Table */}
            <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Title</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {drillDownUserTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        No transactions recorded by this user.
                      </td>
                    </tr>
                  ) : (
                    drillDownUserTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-400 font-mono text-[11px]">{formatDisplayDate(tx.transaction_date)}</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{tx.title}</td>
                        <td className="p-2.5 uppercase text-[10px] font-bold text-slate-500">{tx.category}</td>
                        <td className="p-2.5 text-right font-black">
                          {tx.transaction_type === 'income' ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION CREATE / EDIT MODAL                               */}
      {/* ========================================================= */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {sectionModalMode === 'create' ? 'Create Dynamic Section' : 'Edit Section'}
            </h3>

            <form onSubmit={handleSaveSection} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Section Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Education Expenses, Travel, Health"
                  value={sectionFormName}
                  onChange={(e) => setSectionFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Icon</label>
                <select
                  value={sectionFormIcon}
                  onChange={(e) => setSectionFormIcon(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {availableIcons.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Brief description of expenses for this section"
                  value={sectionFormDesc}
                  onChange={(e) => setSectionFormDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={sectionFormOrder}
                    onChange={(e) => setSectionFormOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={sectionFormEnabled}
                      onChange={(e) => setSectionFormEnabled(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enabled</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                >
                  {sectionModalMode === 'create' ? 'Create Section' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAINTENANCE PREVIEW MODAL                                 */}
      {/* ========================================================= */}
      {showMaintenancePreview && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
          <div className="p-3 bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-between">
            <span>PREVIEW MODE: This is what normal users will see when Maintenance Mode is ON.</span>
            <button
              onClick={() => setShowMaintenancePreview(false)}
              className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs"
            >
              Close Preview
            </button>
          </div>
          <div className="flex-1">
            <MaintenanceScreen settings={maintenanceForm} onRefresh={() => {}} />
          </div>
        </div>
      )}

      {/* Set Password Modal (Requires 2 times password entry) */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Set Account Password</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target: <span className="font-bold text-slate-900 dark:text-slate-100">{passwordModalUser.email}</span> (Enter password 2 times)
              </p>
            </div>

            <div className="space-y-3">
              {/* Field 1 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  1. New Password (min 8 chars) *
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    placeholder="Enter new password..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 2 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  2. Re-enter Password (2nd time) *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPasswordText ? 'text' : 'password'}
                    placeholder="Re-enter same password..."
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPasswordText(!showConfirmPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showConfirmPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Match indicator */}
              {newPasswordInput && confirmPasswordInput && (
                <div className="text-[11px] font-bold">
                  {newPasswordInput === confirmPasswordInput ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Passwords match</span>
                    </span>
                  ) : (
                    <span className="text-rose-500">❌ Passwords do not match</span>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateRandomPassword}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Generate Strong Password (Fills Both)</span>
              </button>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                disabled={isSettingPassword}
                onClick={() => setPasswordModalUser(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={isSettingPassword}
                onClick={handleConfirmSetPassword}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSettingPassword ? 'Setting...' : 'Confirm Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Link Modal (For Admin to view and copy) */}
      {resetLinkModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Password Reset Dispatched
                </h3>
                <p className="text-xs text-slate-500">
                  Target user: <span className="font-bold text-slate-900 dark:text-slate-100">{resetLinkModalUser.email}</span>
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Direct Password Reset Link:</p>
              <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 break-all select-all">
                {resetLinkModalUser.link}
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              An email was dispatched via Supabase Auth. You can also copy this direct link and send it to the user so they can set their new password (entering it 2 times).
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetLinkModalUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetLinkModalUser.link);
                  setCopiedResetLink(true);
                  setTimeout(() => setCopiedResetLink(false), 2000);
                  toast.success('Copied', 'Reset link copied to clipboard.');
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copiedResetLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedResetLink ? 'Copied Link!' : 'Copy Reset Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-rose-600">Delete User Account</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to permanently delete user <span className="font-bold text-slate-900 dark:text-slate-100">{deleteModalUser.email}</span>? This action cannot be undone.
            </p>

            <div className="flex items-center gap-3 pt-3">
              <button
                disabled={isDeletingUser}
                onClick={() => setDeleteModalUser(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {isDeletingUser ? 'Deleting...' : 'Delete User Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Action Confirmation Modal */}
      {pendingStatusAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Confirm Account {pendingStatusAction.action === 'suspend' ? 'Suspension' : 'Reactivation'}
            </h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to {pendingStatusAction.action} access for{' '}
              <span className="font-bold text-slate-900 dark:text-slate-100">{pendingStatusAction.email}</span>?
            </p>

            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={() => setPendingStatusAction(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusToggle}
                className={`flex-1 py-2 rounded-xl text-white text-xs font-bold ${
                  pendingStatusAction.action === 'suspend' ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                Confirm {pendingStatusAction.action === 'suspend' ? 'Suspension' : 'Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <EditTransactionModal
          isOpen={true}
          onClose={() => setEditingTransaction(null)}
          transaction={editingTransaction}
        />
      )}
    </div>
  );
};
