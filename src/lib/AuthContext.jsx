import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, setCurrentBusinessId } from '@/api/supabaseClient';

const AuthContext = createContext();

const SUPER_ADMIN_EMAIL = 'drdrbw20@gmail.com';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [businessSettings, setBusinessSettings] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError] = useState(null);
  const [appPublicSettings] = useState({ id: 'zabat-chai' });

  const toUser = (u) => ({
    id: u.id,
    email: u.email,
    full_name: u.user_metadata?.full_name || u.email,
    role: u.email === SUPER_ADMIN_EMAIL ? 'super_admin' : (u.user_metadata?.role || 'admin'),
    business_id: u.email === SUPER_ADMIN_EMAIL ? null : (u.user_metadata?.business_id || null),
  });

  const loadBusinessSettings = async (businessId) => {
    if (!businessId) { setBusinessSettings(null); return; }
    const { data } = await supabase.from('businesses').select('*').eq('id', businessId).single();
    if (data) setBusinessSettings(data);
  };

  const setupUser = (u) => {
    const mappedUser = toUser(u);
    setUser(mappedUser);
    setCurrentBusinessId(mappedUser.business_id);
    loadBusinessSettings(mappedUser.business_id);
    return mappedUser;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setupUser(session.user);
      else setCurrentBusinessId(null);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setupUser(session.user);
      else {
        setUser(null);
        setBusinessSettings(null);
        setCurrentBusinessId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBusinessSettings(null);
    setCurrentBusinessId(null);
    window.location.href = '/login';
  };

  const refreshBusinessSettings = () => {
    if (user?.business_id) loadBusinessSettings(user.business_id);
  };

  const navigateToLogin = () => { window.location.href = '/login'; };

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{
      user,
      businessSettings,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      isSuperAdmin,
      logout,
      navigateToLogin,
      refreshBusinessSettings,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
