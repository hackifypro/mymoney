import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AdminUserListItem } from '../../types';
import { securityAudit, SecurityAuditEntry } from '../../lib/security';

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
  const toast = useToast();

  const [usersList, setUsersList] = useState<AdminUserListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Security Audit Log viewer
  const [showAuditLogs, setShowAuditLogs] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([]);

  // Suspension confirmation modal state
  const [pendingAction, setPendingAction] = useState<{
    userId: string;
    email: string;
    action: 'suspend' | 'activate';
  } | null>(null);

  // Set Password Modal state
  const [passwordModalUser, setPasswordModalUser] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [isSettingPassword, setIsSettingPassword] = useState<boolean>(false);

  // Delete User Confirmation Modal state
  const [deleteModalUser, setDeleteModalUser] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const list = await getAdminUsersList();
      setUsersList(list);
      setAuditLogs(securityAudit.getLogs());
    } catch (err: any) {
      toast.error('Admin Query Failed', err.message || 'Could not fetch user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Copy ID helper
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.info('Copied', 'User ID copied to clipboard.');
  };

  // Status toggle handler
  const handleConfirmStatusToggle = async () => {
    if (!pendingAction) return;
    try {
      const newStatus = pendingAction.action === 'suspend' ? 'suspended' : 'active';
      const res = await toggleUserStatus(pendingAction.userId, newStatus);
      if (res.success) {
        toast.success('Status Updated', res.message);
        await loadData();
      } else {
        toast.error('Action Restricted', res.message);
      }
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    } finally {
      setPendingAction(null);
    }
  };

  // Secure Password Reset Dispatch
  const handleTriggerPasswordReset = async (email: string) => {
    try {
      const res = await requestPasswordReset(email);
      if (res.success) {
        toast.success('Password Reset Dispatched', `A secure reset email has been initiated for ${email}.`);
      } else {
        toast.error('Reset Failed', res.message);
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  // Open Set Password Modal
  const handleOpenPasswordModal = (target: { id: string; email: string }) => {
    setPasswordModalUser({ userId: target.id, email: target.email });
    setNewPasswordInput('');
    setShowPasswordText(false);
  };

  // Generate secure random password
  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = 'Pass@';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordInput(pass);
    setShowPasswordText(true);
    toast.info('Generated', 'Temporary secure password generated.');
  };

  // Confirm Set Password
  const handleConfirmSetPassword = async () => {
    if (!passwordModalUser) return;
    if (!newPasswordInput || newPasswordInput.length < 8) {
      toast.error('Invalid Password', 'Password must be at least 8 characters long.');
      return;
    }

    setIsSettingPassword(true);
    try {
      const res = await adminSetUserPassword(passwordModalUser.userId, newPasswordInput);
      if (res.success) {
        toast.success('Password Changed!', `New password has been set for ${passwordModalUser.email}`);
        setPasswordModalUser(null);
        setNewPasswordInput('');
      } else {
        toast.error('Failed to Set Password', res.message);
      }
    } catch (err: any) {
      toast.error('Error', err.message);
    } finally {
      setIsSettingPassword(false);
    }
  };

  // Open Delete User Modal
  const handleOpenDeleteModal = (target: { id: string; email: string }) => {
    setDeleteModalUser({ userId: target.id, email: target.email });
  };

  // Confirm Delete User
  const handleConfirmDeleteUser = async () => {
    if (!deleteModalUser) return;
    setIsDeletingUser(true);
    try {
      const res = await adminDeleteUser(deleteModalUser.userId);
      if (res.success) {
        toast.success('User Deleted', res.message);
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

  // Filter users based on search and status
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Defense-in-Depth Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Security Admin Dashboard
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                  Role: Administrator
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Protected user administration · Zero password exposure architecture
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                showAuditLogs
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{showAuditLogs ? 'Hide Audit Logs' : 'Security Audit Trail'}</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Security Isolation Notice */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Zero Password Exposure</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Passwords & hashes are cryptographically concealed and never visible to administrators.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Private Financial Isolation</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Individual financial transaction records are strictly private and isolated by PostgreSQL RLS.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
            <Users className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Strict Scope Compliance</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Admin view strictly constrained to User ID, Email, Creation Date, and Account Status.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Audit Trail Panel (Toggleable) */}
      {showAuditLogs && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-indigo-200 dark:border-indigo-900/60 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Tamper-Resistant Security Audit Trail
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Showing last {auditLogs.length} events
            </span>
          </div>

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Actor Role</th>
                  <th className="py-2.5 px-3">User Email / ID</th>
                  <th className="py-2.5 px-3">Sanitized Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400 font-sans">
                      No security audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                        {log.timestamp.replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.event_type.includes('FAILURE') || log.event_type.includes('DENIED') || log.event_type.includes('TAMPER') || log.event_type.includes('LOCKED')
                              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                              : log.event_type.includes('ADMIN')
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{log.actor_role}</td>
                      <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                        {log.user_email || log.user_id || 'anonymous'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[10px]">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Users Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by User ID or Email..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Status:</span>
            <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
              {(['all', 'active', 'suspended'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mandated User Directory Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold">1. User ID (UUID)</th>
                <th className="py-3 px-4 font-bold">2. Real Login Email / ID</th>
                <th className="py-3 px-4 font-bold">3. Password Security</th>
                <th className="py-3 px-4 font-bold">4. Account Creation Date</th>
                <th className="py-3 px-4 font-bold">5. Account Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentAdmin = u.id === user?.uid;
                  const isSuspended = u.status === 'suspended';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Field 1: User ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{u.id}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(u.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                            title="Copy UUID"
                          >
                            {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Field 2: Real User Login Email / ID */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-mono text-[11px] border border-indigo-200/60 dark:border-indigo-800/40">
                          {u.email}
                        </span>
                      </td>

                      {/* Field 3: Password Security Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5" title="Passwords are mathematically hashed with bcrypt. Plaintext passwords are never stored in the database.">
                          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-mono text-[11px] text-slate-500 tracking-wider">••••••••••••</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                            Bcrypt Hashed
                          </span>
                        </div>
                      </td>

                      {/* Field 4: Account Creation Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {u.createdAt ? new Date(u.createdAt).toLocaleString('en-IN') : 'N/A'}
                      </td>

                      {/* Field 5: Account Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isSuspended
                              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-rose-600 animate-pulse' : 'bg-emerald-600'}`}
                          />
                          {u.status}
                        </span>
                      </td>

                      {/* Permitted Administrative Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Admin Set Password */}
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordModal(u)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all flex items-center gap-1 cursor-pointer"
                            title="Admin: Set or Change User Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Set Pass</span>
                          </button>

                          {/* Password Reset Email Trigger */}
                          <button
                            type="button"
                            onClick={() => handleTriggerPasswordReset(u.email)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                            title="Send Password Reset Email to User"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Reset Link</span>
                          </button>

                          {!isCurrentAdmin ? (
                            <>
                              {/* Suspend / Activate Toggle */}
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingAction({
                                    userId: u.id,
                                    email: u.email,
                                    action: isSuspended ? 'activate' : 'suspend',
                                  })
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                  isSuspended
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100'
                                }`}
                              >
                                {isSuspended ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Activate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Suspend</span>
                                  </>
                                )}
                              </button>

                              {/* Permanently Delete User */}
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(u)}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900 hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                                title="Admin: Permanently Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 italic px-2">Protected Root Admin</span>
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

      {/* Confirmation Dialog for Suspension / Activation */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  pendingAction.action === 'suspend'
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600'
                    : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {pendingAction.action === 'suspend' ? 'Suspend User Account?' : 'Re-Activate User Account?'}
                </h3>
                <p className="text-xs text-slate-500">{pendingAction.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
              {pendingAction.action === 'suspend'
                ? 'Suspending this user will immediately revoke their active sessions and prevent further login attempts. Their data remains securely preserved.'
                : 'Activating this account will restore access for the user.'}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusToggle}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer ${
                  pendingAction.action === 'suspend'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                Confirm {pendingAction.action === 'suspend' ? 'Suspension' : 'Activation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Set Password Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Set User Password
                  </h3>
                  <p className="text-xs font-mono text-slate-500">{passwordModalUser.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">User ID</span>
                <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 break-all">{passwordModalUser.userId}</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">New Password</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter at least 8 characters..."
                    className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Minimum 8 characters. Will be encrypted into Supabase Auth.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                disabled={isSettingPassword}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSetPassword}
                disabled={isSettingPassword || newPasswordInput.length < 8}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white shadow-lg shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                {isSettingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                <span>Save New Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete User Confirmation Modal */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-rose-200 dark:border-rose-900/60 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Permanently Delete User?
                </h3>
                <p className="text-xs font-mono text-slate-500">{deleteModalUser.email}</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
              <p className="font-bold mb-1">⚠️ Irreversible Security Action:</p>
              <p className="text-[11px] leading-relaxed">
                This will permanently delete this user account from Supabase Auth and remove all of their private financial records. This cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                disabled={isDeletingUser}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
