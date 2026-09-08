import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: Array<'INSPECTOR' | 'ASSISTANT_CONTROLLER'>;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 1. Initial Authentication Check Loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-6 animate-pulse">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div className="flex items-center space-x-2 text-slate-300 font-medium text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          <span>Verifying enforcement officer credentials...</span>
        </div>
        <div className="text-xs text-slate-500 font-mono mt-2">
          Legal Metrology Packaged Commodities Portal
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Redirect to Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 3. Role Authorization -> Enforce RBAC
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's authorized home workspace
    const redirectPath = user.role === 'INSPECTOR' ? '/inspector/dashboard' : '/controller/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

