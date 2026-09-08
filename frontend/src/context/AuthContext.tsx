import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/navigation';

interface AuthContextType {
  user: UserProfile | null;
  currentUser: UserProfile; // Backwards-compatible alias for existing components
  activeRole: 'inspector' | 'assistant_controller'; // Backwards-compatible role alias
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const FALLBACK_PROFILE: UserProfile = {
  id: '',
  username: '',
  name: 'Authenticating...',
  role: 'INSPECTOR',
  roleTitle: 'Inspector, Legal Metrology',
  designation: 'Enforcement Officer',
  badgeNumber: 'PENDING',
  department: 'Department of Consumer Affairs, Legal Metrology',
};

const formatUserProfile = (rawUser: {
  id: string;
  username: string;
  name: string;
  role: 'INSPECTOR' | 'ASSISTANT_CONTROLLER';
  inspectorId?: string;
  isDemo?: boolean;
}): UserProfile => {
  const isInspector = rawUser.role === 'INSPECTOR';
  return {
    id: rawUser.id,
    username: rawUser.username,
    name: rawUser.name,
    role: rawUser.role,
    inspectorId: rawUser.inspectorId,
    roleTitle: isInspector ? 'Inspector, Legal Metrology' : 'Assistant Controller of Legal Metrology',
    designation: isInspector ? 'Enforcement Officer (Field Inspection)' : 'Supervisory Controller (Zonal HQ)',
    badgeNumber: rawUser.inspectorId || (isInspector ? 'INS-DEL-01' : 'AC-HQ-01'),
    department: isInspector ? 'Department of Consumer Affairs, Delhi' : 'Directorate of Legal Metrology, HQ',
    isDemo: rawUser.isDemo,
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check current session on mount via /api/auth/me
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(formatUserProfile(data.user));
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('[AUTH_CONTEXT] Error checking auth status:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        const profile = formatUserProfile(data.user);
        setUser(profile);
        return { success: true };
      } else {
        return {
          success: false,
          error: data.message || 'Invalid username or password.',
        };
      }
    } catch (err) {
      console.error('[AUTH_CONTEXT] Login error:', err);
      return {
        success: false,
        error: 'Unable to connect to authentication server. Please verify backend is running.',
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('[AUTH_CONTEXT] Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const activeRole: 'inspector' | 'assistant_controller' =
    user?.role === 'ASSISTANT_CONTROLLER' ? 'assistant_controller' : 'inspector';

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user || FALLBACK_PROFILE,
        activeRole,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Backwards-compatible alias so existing components seamlessly migrate
export const useDemoAuth = useAuth;

