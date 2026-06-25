import { ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';

export default function KpiCard({ title, value, percentage, type }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-indigo-600 dark:text-indigo-400">
          <DollarSign size={20} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${type === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {type === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {percentage}
        </div>
      </div>
      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{value}</p>
    </div>
  );
}