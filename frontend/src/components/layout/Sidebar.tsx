import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Camera,
  FolderCheck,
  History,
  CheckSquare,
  AlertTriangle,
  FileText,
  FileDown,
  BookOpen,
  Download,
  Settings,
  LogOut,
  Users,
  BarChart3,
  Database,
  ScrollText,
  Package,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavEntry {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, activeRole, logout } = useAuth();

  const inspectorNavItems: NavEntry[] = [
    { name: 'Dashboard', path: '/inspector/dashboard', icon: LayoutDashboard },
    { name: 'New Inspection', path: '/inspector/new-inspection', icon: PlusCircle, highlight: true },
    { name: 'Scan / Capture Package', path: '/inspector/scan-capture', icon: Camera },
    { name: 'My Inspections', path: '/inspector/my-inspections', icon: FolderCheck },
    { name: 'Inspection History', path: '/inspector/history', icon: History },
    { name: 'Compliance Findings', path: '/inspector/findings', icon: CheckSquare },
    { name: 'Violations / Observations', path: '/inspector/violations', icon: AlertTriangle },
    { name: 'Reports', path: '/inspector/reports', icon: FileText },
    { name: 'Generate PDF', path: '/inspector/generate-pdf', icon: FileDown },
    { name: 'Rule Reference', path: '/inspector/rule-reference', icon: BookOpen },
    { name: 'Downloads', path: '/inspector/downloads', icon: Download },
    { name: 'Settings', path: '/inspector/settings', icon: Settings },
  ];

  const controllerNavItems: NavEntry[] = [
    { name: 'Dashboard', path: '/controller/dashboard', icon: LayoutDashboard },
    { name: 'Inspectors', path: '/controller/inspectors', icon: Users },
    { name: 'Inspections', path: '/controller/inspections', icon: FolderCheck },
    { name: 'Reports & Analytics', path: '/controller/reports-analytics', icon: BarChart3 },
    { name: 'Violations', path: '/controller/violations', icon: AlertTriangle },
    { name: 'Products / Commodities', path: '/controller/products-commodities', icon: Package },
    { name: 'Rule Database', path: '/controller/rule-database', icon: Database },
    { name: 'Downloads', path: '/controller/downloads', icon: Download },
    { name: 'System Logs', path: '/controller/system-logs', icon: ScrollText },
    { name: 'Settings', path: '/controller/settings', icon: Settings },
  ];

  const navItems = activeRole === 'inspector' ? inspectorNavItems : controllerNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800 shadow-xl md:shadow-none`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-wider uppercase leading-tight">
                SMART METROLOGY
              </div>
              <div className="text-[10px] font-semibold text-sky-400 tracking-wider uppercase">
                Scan. Verify. Comply.
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Designation Banner */}
        <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {activeRole === 'inspector' ? 'Inspector Workspace' : 'Supervisory Control'}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              activeRole === 'inspector'
                ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                : 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
            }`}
          >
            {activeRole === 'inspector' ? 'Inspector' : 'Controller'}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : item.highlight
                      ? 'text-sky-400 hover:bg-slate-800/80 hover:text-sky-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div className="truncate flex-1">
                <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{currentUser.roleTitle}</div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono text-[10px] text-sky-400">{currentUser.badgeNumber}</span>
              <button
                onClick={logout}
                className="hover:text-rose-400 inline-flex items-center space-x-1 text-slate-400 transition-colors"
                title="Sign out of enforcement session"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
