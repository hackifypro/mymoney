import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { validatePasswordStrength } from '../../lib/security';

export const AuthPage: React.FC = () => {
  const { login, register, requestPasswordReset } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Live password strength feedback
  const passwordStrength = useMemo(() => {
    if (!password) return null;
    return validatePasswordStrength(password);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setValidationErrors([]);
    setResetSuccessMessage(null);

    // Handle Forgot Password
    if (mode === 'forgot_password') {
      if (!email.trim()) {
        setErrorMessage('Please enter your account email.');
        return;
      }
      try {
        setIsSubmitting(true);
        const res = await requestPasswordReset(email);
        setResetSuccessMessage(res.message);
        toast.success('Dispatched', res.message);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to dispatch reset request.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Handle Registration Validation
    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
      const strength = validatePasswordStrength(password);
      if (!strength.isValid) {
        setErrorMessage('Password does not meet enterprise security requirements:');
        setValidationErrors(strength.errors);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (mode === 'login') {
        const res = await login(email, password);
        if (res.success) {
          toast.success('Welcome back!', 'Authenticated securely.');
        } else {
          setErrorMessage(res.message || 'Login failed. Please check your credentials.');
        }
      } else {
        const res = await register(name, email, password);
        if (res.success) {
          toast.success('Account Created!', 'Welcome to My Money Manager.');
        } else {
          setErrorMessage(res.message || 'Registration failed.');
          if (res.errors) setValidationErrors(res.errors);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center gap-2 mb-3">
          <img
            src="/logo.jpg"
            alt="My Money Manager by HackifyPro"
            className="w-16 h-16 rounded-2xl object-cover shadow-xl shadow-emerald-600/30 border-2 border-emerald-500/40"
          />
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              My Money Manager
            </h1>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              by HackifyPro
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
          Enterprise Security Architecture · Strict Multi-Tenant Data Isolation
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-800">
          {/* Tab Switcher */}
          {mode !== 'forgot_password' ? (
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setValidationErrors([]);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setValidationErrors([]);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Sign Up (Register)
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-emerald-600" />
                <span>Password Recovery</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setResetSuccessMessage(null);
                }}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Success Banner */}
          {resetSuccessMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {validationErrors.length > 0 && (
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Your Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {mode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMessage(null);
                      }}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Policy Guidelines (for Register Mode) */}
                {mode === 'register' && password && (
                  <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Password Strength:</span>
                      <span
                        className={`font-bold ${
                          passwordStrength?.isValid
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {passwordStrength?.feedback || 'Weak'}
                      </span>
                    </div>

                    {/* Strength Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          (passwordStrength?.score || 0) <= 2
                            ? 'bg-rose-500 w-1/4'
                            : (passwordStrength?.score || 0) <= 4
                            ? 'bg-amber-500 w-3/4'
                            : 'bg-emerald-500 w-full'
                        }`}
                      />
                    </div>

                    {/* Criteria checklist */}
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 dark:text-slate-400 pt-1">
                      <span className={`flex items-center gap-1 ${password.length >= 8 ? 'text-emerald-600 font-bold' : ''}`}>
                        {password.length >= 8 ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-300" />}
                        8+ characters
                      </span>
                      <span className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-emerald-600 font-bold' : ''}`}>
                        {/[A-Z]/.test(password) ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-300" />}
                        Uppercase letter
                      </span>
                      <span className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-emerald-600 font-bold' : ''}`}>
                        {/[0-9]/.test(password) ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-300" />}
                        Numeric digit
                      </span>
                      <span className={`flex items-center gap-1 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-emerald-600 font-bold' : ''}`}>
                        {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 text-slate-300" />}
                        Special symbol
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login'
                      ? 'Log In to My Money'
                      : mode === 'register'
                      ? 'Create Protected Account'
                      : 'Send Reset Instructions'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
