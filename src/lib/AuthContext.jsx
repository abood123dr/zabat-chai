import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, setCurrentBusinessId } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState({ id: 'zabat-chai' });

  const SUPER_ADMIN_EMAIL = 'drdrbw20@gmail.com';

  const toUser = (u) => ({
    id: u.id,
    email: u.email,
    full_name: u.user_metadata?.full_name || u.email,
    role: u.email === SUPER_ADMIN_EMAIL ? 'super_admin' : (u.user_metadata?.role || 'admin'),
    business_id: u.email === SUPER_ADMIN_EMAIL ? null : (u.user_metadata?.business_id || null),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = toUser(session.user)
        setUser(user)
        setIsAuthenticated(true)
        setCurrentBusinessId(user.business_id)
      } else {
        setCurrentBusinessId(null)
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = toUser(session.user);
        setUser(user);
        setIsAuthenticated(true);
        setCurrentBusinessId(user.business_id);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setCurrentBusinessId(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null); setIsAuthenticated(false);
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => { window.location.href = '/login'; };
  const checkUserAuth = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      const user = toUser(u)
      setUser(user)
      setIsAuthenticated(true)
      setCurrentBusinessId(user.business_id)
    } else {
      setCurrentBusinessId(null)
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, appPublicSettings, authChecked, logout, navigateToLogin, checkUserAuth, checkAppState: checkUserAuth, isSuperAdmin: user?.role === 'super_admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
