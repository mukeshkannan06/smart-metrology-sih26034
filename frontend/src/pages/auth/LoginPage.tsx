import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  User,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface DemoAccount {
  name: string;
  roleTitle: string;
  badge: string;
  username: string;
  pass: string;
  roleBadge: 'INSPECTOR' | 'CONTROLLER';
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: 'Rajesh Kumar',
    roleTitle: 'Inspector, Legal Metrology',
    badge: 'INS-DEL-01 (Delhi North)',
    username: 'inspector1',
    pass: 'Insp@2026!',
    roleBadge: 'INSPECTOR',
  },
  {
    name: 'Priya Sharma',
    roleTitle: 'Inspector, Legal Metrology',
    badge: 'INS-DEL-02 (Delhi Central)',
    username: 'inspector2',
    pass: 'Insp@2026!',
    roleBadge: 'INSPECTOR',
  },
  {
    name: 'Dr. Vikram Singh',
    roleTitle: 'Assistant Controller of Legal Metrology',
    badge: 'AC-HQ-01 (HQ Directorate)',
    username: 'controller',
    pass: 'Admin@2026!',
    roleBadge: 'CONTROLLER',
  },
];

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect to role workspace
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        navigate(user.role === 'INSPECTOR' ? '/inspector/dashboard' : '/controller/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await login(username.trim(), password);

    if (result.success) {
      // Navigation is triggered by the useEffect above
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please check credentials.');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demo: DemoAccount) => {
    setUsername(demo.username);
    setPassword(demo.pass);
    setErrorMessage(null);
    setIsLoading(true);
    login(demo.username, demo.pass).then((result) => {
      if (!result.success) {
        setErrorMessage(result.error || 'Demo sign-in failed.');
        setIsLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        {/* Emblem & Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-xl shadow-blue-500/20 mb-4 border border-sky-400/30">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider uppercase">
            SMART METROLOGY
          </h1>
          <p className="text-xs font-bold text-sky-400 tracking-widest uppercase mt-1">
            Scan. Verify. Comply.
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Legal Metrology Packaged Commodities Portal (SIH26034)
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-slate-900/90 backdrop-blur-md border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <div className="mb-6 pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Officer Authentication</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter official credentials to access your enforcement workspace
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Standard Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Officer Username / ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. inspector1 or controller"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Sign-In Cards */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                SIH Demonstration Accounts
              </span>
              <span className="text-[10px] text-sky-400 font-semibold bg-sky-950/50 px-2 py-0.5 rounded-full border border-sky-800/60">
                1-Click Sign-In
              </span>
            </div>

            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.username}
                  type="button"
                  onClick={() => handleQuickLogin(demo)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-white flex items-center space-x-1.5">
                      <span>{demo.name}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          demo.roleBadge === 'INSPECTOR'
                            ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                            : 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                        }`}
                      >
                        {demo.roleBadge}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {demo.username} • {demo.badge}
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-sky-400 group-hover:bg-slate-700 transition-colors shrink-0 ml-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legal Metrology Statutory Footer Notice */}
        <p className="text-center text-[10px] text-slate-500 mt-6 leading-relaxed px-4">
          Government of India • Ministry of Consumer Affairs, Food & Public Distribution
          <br />
          Authorised Legal Metrology Enforcement Officers only under LMPC Rules, 2011.
        </p>
      </div>
    </div>
  );
};

