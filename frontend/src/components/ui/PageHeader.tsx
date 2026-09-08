import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
}) => {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-1.5">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-300">/</span>}
                <span className={idx === breadcrumbs.length - 1 ? 'font-semibold text-slate-800' : 'hover:text-slate-700'}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center space-x-3">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs md:text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center space-x-2.5 flex-shrink-0">{actions}</div>}
    </div>
  );
};

