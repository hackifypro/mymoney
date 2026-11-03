import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthUser, AdminUserListItem } from '../types';
import { auth } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
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
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, pass: string) => Promise<{ success: boolean; message?: string; errors?: string[] }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  // Secure Admin Functions (Restricted & Audited)
  getAdminUsersList: () => Promise<AdminUserListItem[]>;
  toggleUserStatus: (targetUserId: string, newStatus: 'active' | 'suspended') => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'my_money_auth_session';
// NOTE: We NEVER store plaintext passwords. Stored users only contain hashed verifiers.
const SECURE_USER_DIRECTORY_KEY = 'my_money_sec_user_dir';

// Standard Enterprise Admin Credentials (conforms to 12+ char policy)
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

  // Restore authenticated session on startup
  useEffect(() => {
    // 1. Try Supabase Auth session first
    const supabase = getSupabaseClient();
    let supaSubscription: { unsubscribe: () => void } | undefined;

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && session.user.email) {
          const isAdminUser = session.user.email.toLowerCase() === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase();
          const activeUser: AuthUser = {
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || (isAdminUser ? 'Administrator' : session.user.email.split('@')[0]),
            role: isAdminUser ? 'admin' : 'user',
            status: 'active',
            createdAt: session.user.created_at,
          };
          setUser(activeUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser));
          setIsLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user && session.user.email) {
          const isAdminUser = session.user.email.toLowerCase() === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase();
          const activeUser: AuthUser = {
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || (isAdminUser ? 'Administrator' : session.user.email.split('@')[0]),
            role: isAdminUser ? 'admin' : 'user',
            status: 'active',
            createdAt: session.user.created_at,
          };
          setUser(activeUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser));
          setIsLoading(false);
        }
      });
      supaSubscription = subscription;
    }

    // 2. Try Firebase Auth state listener
    const unsubscribeFirebase = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email && !supabase) {
        const isAdminUser = firebaseUser.email.toLowerCase() === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase();
        const activeUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || (isAdminUser ? 'Administrator' : firebaseUser.email.split('@')[0]),
          role: isAdminUser ? 'admin' : 'user',
          status: 'active',
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
        };
        setUser(activeUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeUser));
        setIsLoading(false);
      } else if (!supabase) {
        // 3. Check local secure session storage
        const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            // Verify account is not suspended
            const users = getStoredSecureUsers();
            const matched = users.find((u) => u.uid === parsed.uid || u.email.toLowerCase() === parsed.email.toLowerCase());
            if (matched && matched.status === 'suspended') {
              // Forced logout for suspended user
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
    });

    return () => {
      if (supaSubscription) supaSubscription.unsubscribe();
      unsubscribeFirebase();
    };
  }, [getStoredSecureUsers]);

  // -------------------------------------------------------------
  // LOGIN IMPLEMENTATION (WITH RATE LIMITING & BRUTE FORCE DEFENSE)
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

    // 2. CHECK ROOT ADMIN CREDENTIALS
    if (
      email === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase() &&
      password === DEFAULT_ADMIN_CREDENTIALS.password
    ) {
      rateLimiter.reset(email);
      const adminUser: AuthUser = {
        uid: 'admin_root_master',
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
        details: { method: 'admin_credentials' },
      });
      return { success: true };
    }

    // 3. TRY SUPABASE AUTH FIRST IF CONFIGURED
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (supaData?.user && !supaErr) {
          // Check profile status
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
          const authUser: AuthUser = {
            uid: supaData.user.id,
            email: supaData.user.email || email,
            displayName: supaData.user.user_metadata?.full_name || email.split('@')[0],
            role: profile?.role === 'admin' ? 'admin' : 'user',
            status: profile?.status === 'suspended' ? 'suspended' : 'active',
            createdAt: supaData.user.created_at,
          };

          setUser(authUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
          securityAudit.recordEvent('LOGIN_SUCCESS', {
            userId: authUser.uid,
            userEmail: email,
            actorRole: authUser.role,
            details: { provider: 'supabase' },
          });
          return { success: true };
        }
      } catch (err: any) {
        console.warn('Supabase Auth attempt note:', err.message);
      }
    }

    // 4. TRY FIREBASE AUTH
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const isAdm = cred.user.email?.toLowerCase() === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase();
      const authUser: AuthUser = {
        uid: cred.user.uid,
        email: cred.user.email || email,
        displayName: cred.user.displayName || email.split('@')[0],
        role: isAdm ? 'admin' : 'user',
        status: 'active',
        createdAt: cred.user.metadata.creationTime || new Date().toISOString(),
      };

      rateLimiter.reset(email);
      setUser(authUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      securityAudit.recordEvent('LOGIN_SUCCESS', {
        userId: authUser.uid,
        userEmail: email,
        actorRole: authUser.role,
        details: { provider: 'firebase' },
      });
      return { success: true };
    } catch {
      // 5. CHECK SECURE LOCAL DIRECTORY (HASH VERIFICATION)
      const storedUsers = getStoredSecureUsers();
      const matched = storedUsers.find((u) => u.email.toLowerCase() === email);

      if (matched) {
        // Verify hashed password
        const computedHash = await hashCredential(password, matched.salt);
        if (computedHash === matched.passwordHash) {
          // Check if suspended
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
    }
  };

  // -------------------------------------------------------------
  // REGISTRATION IMPLEMENTATION (STRONG PASSWORD POLICY ENFORCED)
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

    // MANDATORY STRONG PASSWORD POLICY CHECK (12+ CHARACTERS, COMPLEXITY)
    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
      securityAudit.recordEvent('VALIDATION_FAILURE', {
        userEmail: email,
        details: { reason: 'WEAK_PASSWORD_REJECTED', missingRules: strength.errors },
      });
      return {
        success: false,
        message: 'Password does not meet enterprise security requirements.',
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

    // 1. Try Supabase Auth
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: supaReg, error: supaErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });

        if (supaReg.user && !supaErr) {
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
        }
      } catch (err) {
        console.warn('Supabase registration fallback:', err);
      }
    }

    // 2. Try Firebase Auth
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      const authUser: AuthUser = {
        uid: cred.user.uid,
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
        details: { action: 'ACCOUNT_REGISTERED_FIREBASE' },
      });
      return { success: true };
    } catch {
      // 3. Fallback: Save to Secure Vault (STORE ONLY SALT & HASH, NEVER PLAINTEXT!)
      const salt = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const hash = await hashCredential(password, salt);

      existingUsers.push({
        uid: newUid,
        email,
        name,
        salt,
        passwordHash: hash, // Salted SHA-256 hash
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
    }
  };

  // -------------------------------------------------------------
  // PASSWORD RESET (VERIFIED EMAIL PROTOCOL)
  // -------------------------------------------------------------
  const requestPasswordReset = async (emailInput: string): Promise<{ success: boolean; message: string }> => {
    const email = sanitizeInput(emailInput).toLowerCase();
    if (!email) {
      return { success: false, message: 'Email address is required.' };
    }

    securityAudit.recordEvent('PASSWORD_RESET_REQUESTED', {
      userEmail: email,
      actorRole: 'anonymous',
      details: { requestedAt: new Date().toISOString() },
    });

    // Try Supabase Auth
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        return {
          success: true,
          message: 'If an account exists for this email, password reset instructions have been sent.',
        };
      } catch {}
    }

    // Try Firebase Auth
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Password reset link sent to your registered email address.',
      };
    } catch {
      // Return neutral message to prevent user enumeration
      return {
        success: true,
        message: 'If an account exists for this email, password reset instructions have been dispatched.',
      };
    }
  };

  // -------------------------------------------------------------
  // LOGOUT
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
      await fbSignOut(auth);
    } catch {}
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // -------------------------------------------------------------
  // ADMIN DASHBOARD RESTRICTED FUNCTIONS (ROLE PROTECTED)
  // -------------------------------------------------------------
  // Mandated: Displays ONLY 1. User ID, 2. Email, 3. Created At, 4. Status
  // STUFF NEVER RETURNED: Passwords, password hashes, transactions, tokens.
  const getAdminUsersList = async (): Promise<AdminUserListItem[]> => {
    assertAdminRole(user?.role);

    // 1. If Supabase configured, query profiles
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, created_at, status')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((p) => ({
            id: p.id,
            email: p.email,
            createdAt: p.created_at,
            status: p.status as 'active' | 'suspended',
          }));
        }
      } catch (e) {
        console.warn('Supabase admin profiles query:', e);
      }
    }

    // 2. Query secure vault profiles
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

    // Update in Supabase if active
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('id', targetUserId);
      } catch {}
    }

    // Update in local directory
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

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        login,
        register,
        logout,
        requestPasswordReset,
        getAdminUsersList,
        toggleUserStatus,
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
