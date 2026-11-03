import React from 'react';
import { Wrench, Shield, LogOut, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MaintenanceSettings } from '../../types';

interface MaintenanceScreenProps {
  settings: MaintenanceSettings;
  onRefresh?: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ settings, onRefresh }) => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden select-none">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="flex items-center justify-between z-10 max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="My Money Manager by HackifyPro"
            className="w-12 h-12 rounded-2xl object-cover shadow-xl border border-emerald-500/40"
          />
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">My Money Manager</h1>
            <p className="text-xs font-semibold text-emerald-400">by HackifyPro</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Content Card */}
      <main className="z-10 max-w-xl w-full mx-auto my-12 text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/20 animate-pulse">
          <Wrench className="w-10 h-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-4 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          Scheduled Maintenance Mode Active
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 tracking-tight">
          {settings.title || 'My Money Manager is Under Scheduled Maintenance'}
        </h2>

        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          {settings.message ||
            'We are improving the application to provide a better, faster, and more secure financial management experience. All your personal data and transactions are completely secure and preserved.'}
        </p>

        {/* Expected Restoration Box */}
        {settings.expectedRestoration && (
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 max-w-sm mx-auto mb-8 flex items-center justify-center gap-3 text-xs text-slate-300">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Expected Return:{' '}
              <strong className="text-white font-mono">{settings.expectedRestoration}</strong>
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Status / Refresh</span>
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 text-center text-xs text-slate-500 max-w-md mx-auto">
        <p className="font-semibold text-slate-400 mb-1">
          Thank you for your patience and understanding.
        </p>
        <p className="text-[11px] flex items-center justify-center gap-1.5 text-slate-500">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>Enterprise Defense-in-Depth Architecture · HackifyPro</span>
        </p>
      </footer>
    </div>
  );
};
