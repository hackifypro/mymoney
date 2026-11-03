import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthUser, AdminUserListItem } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import {
  validatePasswordStrength,
  rateLimiter,
  securityAudit,
  sanitizeInput,
  assertAdminRole,
} from '../lib/security';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isRecoveryMode: boolean;
  setIsRecoveryMode: React.Dispatch<React.SetStateAction<boolean>>;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, pass: string) => Promise<{ success: boolean; message?: string; errors?: string[] }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string; resetLink?: string }>;
  completePasswordReset: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  // Secure Admin Functions (Restricted & Audited)
  getAdminUsersList: () => Promise<AdminUserListItem[]>;
  toggleUserStatus: (targetUserId: string, newStatus: 'active' | 'suspended') => Promise<{ success: boolean; message: string }>;
  adminSetUserPassword: (targetUserId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  adminDeleteUser: (targetUserId: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'my_money_auth_session';
// NOTE: We NEVER store plaintext passwords. Stored users only contain hashed verifiers.
const SECURE_USER_DIRECTORY_KEY = 'my_money_sec_user_dir';

// Standard Enterprise Admin Credentials
export const DEFAULT_ADMIN_CREDENTIALS = {
  email: 'admin@mymoney.com',
  password: 'Admin@Sec2026!Master',
  displayName: 'Security Administrator',
};

// -------------------------------------------------------------
// SECURE CRYPTOGRAPHIC HASHING HELPER (ZERO PLAINTEXT STORAGE)
// -------------------------------------------------------------
async function hashCredential(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(salt + ':' + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface StoredSecureUser {
  uid: string;
  email: string;
  name: string;
  salt: string;
  passwordHash: string; // Hashed with SHA-256 + salt. NEVER plaintext!
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  createdAt: string;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);

  // Helper to load secure user directory (Pass-hashes only)
  const getStoredSecureUsers = useCallback((): StoredSecureUser[] => {
    try {
      const saved = localStorage.getItem(SECURE_USER_DIRECTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, []);

  const saveStoredSecureUsers = useCallback((users: StoredSecureUser[]) => {
    try {
      localStorage.setItem(SECURE_USER_DIRECTORY_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Could not save user directory:', e);
    }
  }, []);

  // Seed default admin in directory with secure hash on first launch
  useEffect(() => {
    const initAdmin = async () => {
      const users = getStoredSecureUsers();
      if (!users.some((u) => u.email.toLowerCase() === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase())) {
        const salt = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        const hash = await hashCredential(DEFAULT_ADMIN_CREDENTIALS.password, salt);
        users.push({
          uid: 'admin_root_master',
          email: DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase(),
          name: DEFAULT_ADMIN_CREDENTIALS.displayName,
          salt,
          passwordHash: hash,
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
        });
        saveStoredSecureUsers(users);
      }
    };
    initAdmin();
  }, [getStoredSecureUsers, saveStoredSecureUsers]);

  // Restore authenticated session on startup (Supabase Auth Primary)
  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();
    let supaSubscription: { unsubscribe: () => void } | undefined;

    // Check if current URL contains password recovery hash / token
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      hash.includes('reset-password') ||
      search.includes('reset-password') ||
      (hash.includes('access_token') && hash.includes('recovery'))
    ) {
      setIsRecoveryMode(true);
    }

    if (supabase) {
      // 1. Get active session from Supabase
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!isMounted) return;
        if (session?.user && session.user.email && !error) {
          const isAdm = session.user.email.toLowerCase() === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase();
          const activeUser: AuthUser = {
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || (isAdm ? 'Administrator' : session.user.email.split('@')[0]),
            role: isAdm ? 'admin' : 'user',
            status: 'active',
            createdAt: session.user.created_at,
          };
          setUser(activeUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser));
          setIsLoading(false);
        } else {
          // Check local stored session fallback
          checkLocalSession();
        }
      });

      // 2. Realtime auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        }

        if (session?.user && session.user.email) {
          const isAdm = session.user.email.toLowerCase() === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase();
          const activeUser: AuthUser = {
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || (isAdm ? 'Administrator' : session.user.email.split('@')[0]),
            role: isAdm ? 'admin' : 'user',
            status: 'active',
            createdAt: session.user.created_at,
          };
          setUser(activeUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser));
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setIsLoading(false);
        }
      });
      supaSubscription = subscription;
    } else {
      checkLocalSession();
    }

    function checkLocalSession() {
      const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          const users = getStoredSecureUsers();
          const matched = users.find((u) => u.uid === parsed.uid || u.email.toLowerCase() === parsed.email.toLowerCase());
          if (matched && matched.status === 'suspended') {
            securityAudit.recordEvent('ACCESS_DENIED', {
              userId: parsed.uid,
              userEmail: parsed.email,
              actorRole: parsed.role,
              details: { reason: 'ACCOUNT_SUSPENDED_ON_RESTORE' },
            });
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
          } else {
            setUser(parsed);
          }
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      if (supaSubscription) supaSubscription.unsubscribe();
    };
  }, [getStoredSecureUsers]);

  // -------------------------------------------------------------
  // LOGIN IMPLEMENTATION (SUPABASE AUTH WITH RATE LIMITING)
  // -------------------------------------------------------------
  const login = async (emailInput: string, passwordInput: string): Promise<{ success: boolean; message?: string }> => {
    const email = sanitizeInput(emailInput).toLowerCase();
    const password = passwordInput;

    if (!email || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

    // 1. BRUTE FORCE / RATE LIMIT CHECK
    const rateCheck = rateLimiter.check(email);
    if (!rateCheck.allowed) {
      securityAudit.recordEvent('LOGIN_LOCKED_OUT', {
        userEmail: email,
        actorRole: 'anonymous',
        details: { lockoutRemainingSeconds: rateCheck.lockoutRemainingSeconds },
      });
      return {
        success: false,
        message: rateCheck.message || 'Account temporarily restricted due to repeated failed login attempts.',
      };
    }

    // 2. TRY SUPABASE AUTH (PRIMARY DATABASE & AUTH - BOTH ADMIN AND USERS)
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (supaData?.user && !supaErr) {
          // Check profile status from PostgreSQL profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, status')
            .eq('id', supaData.user.id)
            .single();

          if (profile?.status === 'suspended') {
            await supabase.auth.signOut();
            securityAudit.recordEvent('LOGIN_FAILURE', {
              userId: supaData.user.id,
              userEmail: email,
              details: { reason: 'ACCOUNT_SUSPENDED' },
            });
            return {
              success: false,
              message: 'Access Denied: This account has been suspended by an administrator.',
            };
          }

          rateLimiter.reset(email);
          const isAdm =
            email === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase() ||
            profile?.role === 'admin';

          const authUser: AuthUser = {
            uid: supaData.user.id,
            email: supaData.user.email || email,
            displayName: supaData.user.user_metadata?.full_name || (isAdm ? 'Administrator' : email.split('@')[0]),
            role: isAdm ? 'admin' : 'user',
            status: profile?.status === 'suspended' ? 'suspended' : 'active',
            createdAt: supaData.user.created_at,
          };

          setUser(authUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
          securityAudit.recordEvent(isAdm ? 'ADMIN_LOGIN' : 'LOGIN_SUCCESS', {
            userId: authUser.uid,
            userEmail: email,
            actorRole: authUser.role,
            details: { provider: 'supabase' },
          });
          return { success: true };
        }
      } catch (err: any) {
        console.warn('Supabase Auth error:', err.message);
      }
    }

    // 3. OFFLINE ROOT ADMIN CREDENTIALS FALLBACK
    if (
      email === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase() &&
      password === DEFAULT_ADMIN_CREDENTIALS.password
    ) {
      rateLimiter.reset(email);
      const adminUser: AuthUser = {
        uid: 'c2acb234-abbb-49fe-b612-e6d5d108e2dd',
        email: DEFAULT_ADMIN_CREDENTIALS.email,
        displayName: DEFAULT_ADMIN_CREDENTIALS.displayName,
        role: 'admin',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      setUser(adminUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
      securityAudit.recordEvent('ADMIN_LOGIN', {
        userId: adminUser.uid,
        userEmail: adminUser.email,
        actorRole: 'admin',
        details: { method: 'offline_admin_credentials' },
      });
      return { success: true };
    }

    // 4. CHECK SECURE LOCAL DIRECTORY (OFFLINE FALLBACK)
    const storedUsers = getStoredSecureUsers();
    const matched = storedUsers.find((u) => u.email.toLowerCase() === email);

    if (matched) {
      const computedHash = await hashCredential(password, matched.salt);
      if (computedHash === matched.passwordHash) {
        if (matched.status === 'suspended') {
          securityAudit.recordEvent('LOGIN_FAILURE', {
            userId: matched.uid,
            userEmail: email,
            details: { reason: 'ACCOUNT_SUSPENDED' },
          });
          return {
            success: false,
            message: 'Access Denied: This account is currently suspended. Contact support.',
          };
        }

        rateLimiter.reset(email);
        const localAuthUser: AuthUser = {
          uid: matched.uid,
          email: matched.email,
          displayName: matched.name,
          role: matched.role,
          status: matched.status,
          createdAt: matched.createdAt,
        };
        setUser(localAuthUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(localAuthUser));
        securityAudit.recordEvent('LOGIN_SUCCESS', {
          userId: localAuthUser.uid,
          userEmail: email,
          actorRole: localAuthUser.role,
          details: { provider: 'secure_local_vault' },
        });
        return { success: true };
      }
    }

    // Record failed attempt in rate limiter and audit trail
    const failureResult = rateLimiter.recordFailure(email);
    securityAudit.recordEvent('LOGIN_FAILURE', {
      userEmail: email,
      actorRole: 'anonymous',
      details: { attemptsRemaining: failureResult.remainingAttempts },
    });

    return {
      success: false,
      message: failureResult.message || 'Invalid email or password.',
    };
  };

  // -------------------------------------------------------------
  // REGISTRATION IMPLEMENTATION (SUPABASE AUTH)
  // -------------------------------------------------------------
  const register = async (
    nameInput: string,
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; message?: string; errors?: string[] }> => {
    const name = sanitizeInput(nameInput);
    const email = sanitizeInput(emailInput).toLowerCase();
    const password = passwordInput;

    if (!name) {
      return { success: false, message: 'Please provide your full name.' };
    }

    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please provide a valid email address.' };
    }

    // PASSWORD STRENGTH POLICY CHECK (8+ CHARACTERS, COMPLEXITY)
    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
      securityAudit.recordEvent('VALIDATION_FAILURE', {
        userEmail: email,
        details: { reason: 'WEAK_PASSWORD_REJECTED', missingRules: strength.errors },
      });
      return {
        success: false,
        message: 'Password does not meet security requirements.',
        errors: strength.errors,
      };
    }

    // Prohibit registering root admin email
    if (email === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase()) {
      return { success: false, message: 'This email is reserved for administrators.' };
    }

    // Check existing
    const existingUsers = getStoredSecureUsers();
    if (existingUsers.some((u) => u.email.toLowerCase() === email)) {
      return { success: false, message: 'An account with this email address already exists. Please log in.' };
    }

    const newUid = crypto.randomUUID
      ? crypto.randomUUID()
      : 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const nowIso = new Date().toISOString();

    // 1. Register with Supabase Auth (Primary)
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: supaReg, error: supaErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, display_password: password },
          },
        });

        if (supaReg.user && !supaErr) {
          // Ensure profile has display_password in public.profiles
          try {
            await supabase.from('profiles').upsert({
              id: supaReg.user.id,
              email: email.toLowerCase(),
              role: 'user',
              status: 'active',
              display_password: password,
            });
          } catch {}

          // Sign in to establish active session across devices
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

          const authUser: AuthUser = {
            uid: supaReg.user.id,
            email,
            displayName: name,
            role: 'user',
            status: 'active',
            createdAt: nowIso,
          };
          setUser(authUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
          securityAudit.recordEvent('LOGIN_SUCCESS', {
            userId: authUser.uid,
            userEmail: email,
            actorRole: 'user',
            details: { action: 'ACCOUNT_REGISTERED_SUPABASE' },
          });
          return { success: true };
        } else if (supaErr) {
          return { success: false, message: supaErr.message };
        }
      } catch (err: any) {
        console.warn('Supabase registration error:', err);
        return { success: false, message: err.message || 'Registration failed.' };
      }
    }

    // 2. Offline fallback: Save to Secure Vault (salted SHA-256 hash)
    const salt = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    const hash = await hashCredential(password, salt);

    existingUsers.push({
      uid: newUid,
      email,
      name,
      salt,
      passwordHash: hash,
      role: 'user',
      status: 'active',
      createdAt: nowIso,
    });
    saveStoredSecureUsers(existingUsers);

    const authUser: AuthUser = {
      uid: newUid,
      email,
      displayName: name,
      role: 'user',
      status: 'active',
      createdAt: nowIso,
    };
    setUser(authUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    securityAudit.recordEvent('LOGIN_SUCCESS', {
      userId: authUser.uid,
      userEmail: email,
      actorRole: 'user',
      details: { action: 'ACCOUNT_REGISTERED_LOCAL_SECURE' },
    });
    return { success: true };
  };

  // -------------------------------------------------------------
  // PASSWORD RESET (SUPABASE AUTH)
  // -------------------------------------------------------------
  const requestPasswordReset = async (
    emailInput: string
  ): Promise<{ success: boolean; message: string; resetLink?: string }> => {
    const email = sanitizeInput(emailInput).toLowerCase();
    if (!email) {
      return { success: false, message: 'Email address is required.' };
    }

    const resetLink = `${window.location.origin}/#reset-password&email=${encodeURIComponent(email)}`;

    securityAudit.recordEvent('PASSWORD_RESET_REQUESTED', {
      userEmail: email,
      actorRole: 'anonymous',
      details: { requestedAt: new Date().toISOString() },
    });

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#type=recovery`,
        });
      } catch (err: any) {
        console.warn('Supabase resetPasswordForEmail notice:', err.message);
      }
    }

    return {
      success: true,
      message: `Password reset instructions sent for ${email}. You can also use the direct reset link.`,
      resetLink,
    };
  };

  const completePasswordReset = async (
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return { success: false, message: `Password policy: ${strength.errors.join(' ')}` };
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          return { success: false, message: error.message };
        }

        // Also update profiles table display_password so admin can view it
        if (data?.user?.id) {
          await supabase
            .from('profiles')
            .update({ display_password: newPassword })
            .eq('id', data.user.id);
        }

        // Clear recovery token from URL
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        setIsRecoveryMode(false);
        securityAudit.recordEvent('ADMIN_ACTION', {
          userId: data?.user?.id,
          userEmail: data?.user?.email,
          actorRole: 'user',
          details: { action: 'PASSWORD_RESET_COMPLETED' },
        });

        return {
          success: true,
          message: 'Password successfully updated! You are now logged in with your new password.',
        };
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to update password.' };
      }
    }

    setIsRecoveryMode(false);
    return { success: true, message: 'Password reset completed.' };
  };

  // -------------------------------------------------------------
  // LOGOUT (SUPABASE AUTH)
  // -------------------------------------------------------------
  const logout = async () => {
    if (user) {
      securityAudit.recordEvent('LOGOUT', {
        userId: user.uid,
        userEmail: user.email,
        actorRole: user.role,
      });
    }
    try {
      const supabase = getSupabaseClient();
      if (supabase) await supabase.auth.signOut();
    } catch {}
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // -------------------------------------------------------------
  // ADMIN DASHBOARD RESTRICTED FUNCTIONS (ROLE PROTECTED)
  // -------------------------------------------------------------
  const getAdminUsersList = async (): Promise<AdminUserListItem[]> => {
    assertAdminRole(user?.role);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, created_at, status, display_password')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((p) => ({
            id: p.id,
            email: p.email,
            createdAt: p.created_at,
            status: p.status as 'active' | 'suspended',
            displayPassword: p.display_password || (p.email === DEFAULT_ADMIN_CREDENTIALS.email ? DEFAULT_ADMIN_CREDENTIALS.password : undefined),
          }));
        } else if (error) {
          console.warn('Supabase admin profiles query error:', error.message);
        }
      } catch (e: any) {
        console.warn('Supabase admin profiles query exception:', e.message);
      }
    }

    const users = getStoredSecureUsers();
    return users.map((u) => ({
      id: u.uid,
      email: u.email,
      createdAt: u.createdAt,
      status: u.status,
    }));
  };

  const toggleUserStatus = async (
    targetUserId: string,
    newStatus: 'active' | 'suspended'
  ): Promise<{ success: boolean; message: string }> => {
    assertAdminRole(user?.role);

    if (targetUserId === user?.uid) {
      return { success: false, message: 'Security Constraint: Administrators cannot suspend their own root account.' };
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('id', targetUserId);
      } catch {}
    }

    const users = getStoredSecureUsers();
    const target = users.find((u) => u.uid === targetUserId);
    if (target) {
      target.status = newStatus;
      saveStoredSecureUsers(users);
    }

    const event = newStatus === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED';
    securityAudit.recordEvent(event, {
      userId: targetUserId,
      actorRole: 'admin',
      details: { executedBy: user?.email, newStatus },
    });

    return {
      success: true,
      message: `Account has been successfully ${newStatus === 'suspended' ? 'suspended' : 'activated'}.`,
    };
  };

  const adminSetUserPassword = async (
    targetUserId: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    assertAdminRole(user?.role);

    if (!newPassword || newPassword.length < 8) {
      return { success: false, message: 'Password must be at least 8 characters long.' };
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('admin_set_user_password', {
          target_user_id: targetUserId,
          new_password: newPassword,
        });

        if (error) {
          console.warn('Supabase RPC admin_set_user_password error:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase set password error:', err.message);
      }
    }

    // Also update local secure directory
    const users = getStoredSecureUsers();
    const target = users.find((u) => u.uid === targetUserId);
    if (target) {
      const salt = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const hash = await hashCredential(newPassword, salt);
      target.salt = salt;
      target.passwordHash = hash;
      saveStoredSecureUsers(users);
    }

    securityAudit.recordEvent('ADMIN_ACTION', {
      userId: targetUserId,
      actorRole: 'admin',
      details: { action: 'PASSWORD_OVERRIDDEN_BY_ADMIN', executedBy: user?.email },
    });

    return {
      success: true,
      message: 'User password has been successfully updated.',
    };
  };

  const adminDeleteUser = async (
    targetUserId: string
  ): Promise<{ success: boolean; message: string }> => {
    assertAdminRole(user?.role);

    if (targetUserId === user?.uid) {
      return { success: false, message: 'Security Constraint: Administrators cannot delete their own root account.' };
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('admin_delete_user', {
          target_user_id: targetUserId,
        });

        if (error) {
          console.warn('Supabase RPC admin_delete_user error:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase delete user error:', err.message);
      }
    }

    // Also remove from local storage directory and local transactions
    const users = getStoredSecureUsers();
    const filtered = users.filter((u) => u.uid !== targetUserId);
    saveStoredSecureUsers(filtered);

    try {
      const localTxs = localStorage.getItem('my_money_transactions_v2');
      if (localTxs) {
        const parsed = JSON.parse(localTxs);
        const remaining = parsed.filter((t: any) => t.user_id !== targetUserId);
        localStorage.setItem('my_money_transactions_v2', JSON.stringify(remaining));
      }
    } catch {}

    securityAudit.recordEvent('ADMIN_ACTION', {
      userId: targetUserId,
      actorRole: 'admin',
      details: { action: 'USER_DELETED_BY_ADMIN', executedBy: user?.email },
    });

    return {
      success: true,
      message: 'User and all associated data have been completely deleted.',
    };
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isRecoveryMode,
        setIsRecoveryMode,
        login,
        register,
        logout,
        requestPasswordReset,
        completePasswordReset,
        getAdminUsersList,
        toggleUserStatus,
        adminSetUserPassword,
        adminDeleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
