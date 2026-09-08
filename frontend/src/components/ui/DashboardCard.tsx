import React from 'react';

export interface DashboardCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  change?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  theme?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  badge?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtext,
  change,
  icon,
  theme = 'blue',
  badge,
}) => {
  const themeClasses = {
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      accent: 'border-l-4 border-l-blue-600',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      accent: 'border-l-4 border-l-emerald-600',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      accent: 'border-l-4 border-l-amber-600',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      accent: 'border-l-4 border-l-rose-600',
    },
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      accent: 'border-l-4 border-l-indigo-600',
    },
    slate: {
      iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
      accent: 'border-l-4 border-l-slate-600',
    },
  };

  const selectedTheme = themeClasses[theme];

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative overflow-hidden ${selectedTheme.accent} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
            {badge && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {badge}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight font-sans">{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${selectedTheme.iconBg}`}>
          {icon}
        </div>
      </div>

      {(subtext || change) && (
        <div className="mt-3 flex items-center space-x-2 text-xs">
          {change && (
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                change.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {change.isPositive ? '↑' : '↓'} {change.value}
            </span>
          )}
          {subtext && <span className="text-slate-500">{subtext}</span>}
        </div>
      )}
    </div>
  );
};

