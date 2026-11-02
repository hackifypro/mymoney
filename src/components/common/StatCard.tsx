import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatINR } from '../../lib/dateUtils';

interface StatCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon: LucideIcon;
  variant: 'income' | 'expense' | 'balance' | 'neutral' | 'amber';
  badge?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  amount,
  subtitle,
  icon: Icon,
  variant,
  badge,
  onClick,
}) => {
  const styles = {
    income: {
      card: 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-700 shadow-emerald-500/5',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60',
      amount: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
    },
    expense: {
      card: 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-700 shadow-rose-500/5',
      iconBg: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60',
      amount: 'text-rose-600 dark:text-rose-400',
      badge: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
    },
    balance: {
      card: 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/40 hover:border-blue-400 dark:hover:border-blue-700 shadow-blue-500/5',
      iconBg: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60',
      amount: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
    },
    amber: {
      card: 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-700 shadow-amber-500/5',
      iconBg: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60',
      amount: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
    },
    neutral: {
      card: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-slate-500/5',
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      amount: 'text-slate-900 dark:text-slate-100',
      badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-2xl border transition-all duration-200 shadow-sm ${styles.card} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-sans ${styles.amount}`}>
              {formatINR(amount)}
            </h3>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{subtitle}</p>
          )}
        </div>

        <div className={`p-3 rounded-xl shrink-0 ${styles.iconBg}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      {badge && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${styles.badge}`}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
};
