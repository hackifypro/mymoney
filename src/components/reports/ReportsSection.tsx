import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { useExpense } from '../../context/ExpenseContext';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../common/StatCard';
import { formatINR, formatDisplayDate, getPresetDateRange } from '../../lib/dateUtils';
import { Transaction } from '../../types';

export const ReportsSection: React.FC = () => {
  const { transactions } = useExpense();
  const toast = useToast();

  // Date range filter
  const [preset, setPreset] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Aggregation granularity: 'daily' | 'weekly' | 'monthly' | 'yearly'
  const [granularity, setGranularity] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  // Filter transactions by selected range
  const filteredTxs = useMemo(() => {
    let list = [...transactions];
    if (preset === 'custom' && customStart && customEnd) {
      list = list.filter((t) => t.transaction_date >= customStart && t.transaction_date <= customEnd);
    } else if (preset !== 'all') {
      const range = getPresetDateRange(preset);
      if (range.start && range.end) {
        list = list.filter((t) => t.transaction_date >= range.start && t.transaction_date <= range.end);
      }
    }
    return list;
  }, [transactions, preset, customStart, customEnd]);

  // Aggregated totals for the selected period
  const metrics = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let homeExp = 0;
    let roomExp = 0;
    let otherExp = 0;
    let gasExp = 0;
    let groceryExp = 0;
    let rentExp = 0;
    let elecExp = 0;

    for (const tx of filteredTxs) {
      const amt = Number(tx.amount) || 0;
      if (tx.transaction_type === 'income' && tx.category !== 'people') {
        income += amt;
      }
      if (tx.transaction_type === 'expense' && tx.category !== 'people') {
        expenses += amt;
        if (tx.category === 'home') homeExp += amt;
        if (tx.category === 'room') {
          roomExp += amt;
          if (tx.subcategory === 'gas') gasExp += amt;
          else if (tx.subcategory === 'grocery') groceryExp += amt;
          else if (tx.subcategory === 'rent') rentExp += amt;
          else if (tx.subcategory === 'electricity') elecExp += amt;
        }
        if (tx.category === 'other') otherExp += amt;
      }
    }

    const netBalance = income - expenses;
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

    return {
      income,
      expenses,
      netBalance,
      savingsRate,
      homeExp,
      roomExp,
      otherExp,
      gasExp,
      groceryExp,
      rentExp,
      elecExp,
    };
  }, [filteredTxs]);

  // Category chart data
  const categoryPieData = useMemo(() => {
    const data = [
      { name: 'Home Expenses', value: metrics.homeExp, color: '#10b981' },
      { name: 'Room (Gas)', value: metrics.gasExp, color: '#f59e0b' },
      { name: 'Room (Grocery)', value: metrics.groceryExp, color: '#06b6d4' },
      { name: 'Room (Rent)', value: metrics.rentExp, color: '#3b82f6' },
      { name: 'Room (Electricity)', value: metrics.elecExp, color: '#eab308' },
      { name: 'Other Expenses', value: metrics.otherExp, color: '#a855f7' },
    ].filter((item) => item.value > 0);

    return data;
  }, [metrics]);

  // Time-series chart data (Daily or Monthly)
  const timeSeriesData = useMemo(() => {
    const map = new Map<string, { label: string; income: number; expenses: number }>();

    for (const tx of filteredTxs) {
      if (tx.category === 'people') continue;
      const amt = Number(tx.amount) || 0;

      let key = tx.transaction_date;
      let label = formatDisplayDate(tx.transaction_date);

      if (granularity === 'monthly') {
        key = tx.transaction_date.slice(0, 7); // YYYY-MM
        const parts = key.split('-');
        if (parts.length === 2) {
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
          label = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
        }
      } else if (granularity === 'yearly') {
        key = tx.transaction_date.slice(0, 4); // YYYY
        label = key;
      }

      if (!map.has(key)) {
        map.set(key, { label, income: 0, expenses: 0 });
      }
      const entry = map.get(key)!;
      if (tx.transaction_type === 'income') entry.income += amt;
      else entry.expenses += amt;
    }

    const sortedKeys = Array.from(map.keys()).sort();
    return sortedKeys.map((k) => map.get(k)!);
  }, [filteredTxs, granularity]);

  // Export to CSV functionality
  const handleExportCSV = () => {
    if (filteredTxs.length === 0) {
      toast.error('No Data', 'No transactions found in this period to export.');
      return;
    }

    const headers = [
      'ID',
      'Date',
      'Time',
      'Category',
      'Subcategory',
      'Type',
      'Title',
      'Amount (INR)',
      'Person Name',
      'Description',
      'Notes',
    ];

    const rows = filteredTxs.map((t) => [
      t.id,
      t.transaction_date,
      t.transaction_time,
      t.category,
      t.subcategory,
      t.transaction_type,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.person_name || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `My_Money_Report_${preset}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Report Exported', 'CSV spreadsheet file downloaded.');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Date Range & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>Financial Reports & Analytics</span>
            </h3>
            <p className="text-xs text-slate-500">
              Interactive expense charts, savings trends, and category distribution
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'this_year', label: 'This Year' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom Range' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                preset === item.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}

          {preset === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4 Financial Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          amount={metrics.income}
          subtitle="Money received in period"
          icon={ArrowDownLeft}
          variant="income"
          badge="Incoming Cash"
        />

        <StatCard
          title="Total Expenses"
          amount={metrics.expenses}
          subtitle="All spending in period"
          icon={ArrowUpRight}
          variant="expense"
          badge="Outgoing Cash"
        />

        <StatCard
          title="Remaining Balance"
          amount={metrics.netBalance}
          subtitle="Net savings in period"
          icon={DollarSign}
          variant={metrics.netBalance >= 0 ? 'balance' : 'expense'}
          badge={metrics.netBalance >= 0 ? 'Positive Savings' : 'Deficit'}
        />

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Savings Rate
            </span>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-xl">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-sans">
              {metrics.savingsRate}%
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Percentage of income retained
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Income vs Expenses Cashflow Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Income vs Expenses Trend
              </h4>
              <p className="text-xs text-slate-500">Comparison across time period</p>
            </div>

            {/* Granularity Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(['daily', 'monthly', 'yearly'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    granularity === g
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {timeSeriesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No data points for selected date range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`]}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category-wise Expenses Donut Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Category-wise Expense Breakdown
            </h4>
            <p className="text-xs text-slate-500">Distribution across categories & room utilities</p>
          </div>

          <div className="h-56 w-full">
            {categoryPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No expense entries in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`]}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Color Breakdown Legend List */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {categoryPieData.map((item) => {
              const percent = metrics.expenses > 0 ? Math.round((item.value / metrics.expenses) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <div className="font-semibold font-mono">
                    {formatINR(item.value)} <span className="text-slate-400 font-normal">({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
