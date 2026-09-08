/**
 * DemoAuthContext (Phase 2 Legacy Wrapper)
 * Deprecated in Phase 5: Re-exports from real database-backed AuthContext.
 * Role switching is disabled in Phase 5 — roles are strictly bound to MongoDB Atlas credentials.
 */
export { useAuth as useDemoAuth, AuthProvider as DemoAuthProvider } from './AuthContext';

