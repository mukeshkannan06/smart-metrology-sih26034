import React, { useEffect, useState } from 'react';
import { Menu, Activity, CheckCircle2, AlertCircle, UserCheck, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch('/api/health');
        setApiConnected(res.ok);
      } catch {
        setApiConnected(false);
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const isInspector = user?.role === 'INSPECTOR';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Context */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Legal Metrology Packaged Commodities
          </div>
          <div className="text-sm font-black text-slate-800 tracking-tight">
            Enforcement & Compliance Portal
          </div>
        </div>
      </div>

      {/* Right: Health Status, Role Badge, User Profile & Logout */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Backend Connection Status */}
        <div
          className={`hidden lg:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            apiConnected === true
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : apiConnected === false
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
          title="Backend API Health Endpoint (/api/health)"
        >
          {apiConnected === true ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Backend API Online</span>
            </>
          ) : apiConnected === false ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>API Offline</span>
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5 animate-spin text-slate-500" />
              <span>Checking API...</span>
            </>
          )}
        </div>

        {/* Authenticated Role Badge (No manual toggle: strictly database-enforced) */}
        <div
          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${
            isInspector
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-purple-50 text-purple-800 border-purple-200'
          }`}
        >
          <Shield className={`w-3.5 h-3.5 ${isInspector ? 'text-blue-600' : 'text-purple-600'}`} />
          <span className="hidden sm:inline font-normal text-slate-500">Role:</span>
          <span>{isInspector ? 'Inspector' : 'Assistant Controller of Legal Metrology'}</span>
        </div>

        {/* User Profile Info */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            <UserCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</div>
            <div className="text-[10px] text-slate-500 font-mono">{user?.badgeNumber}</div>
          </div>
        </div>

        {/* Header Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-xs ml-1 disabled:opacity-50"
          title="Sign out of enforcement session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
