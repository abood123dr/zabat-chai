import { createContext, useContext, useState, useEffect } from 'react';
import { setCurrentBusinessId } from '@/api/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

const SELECTED_BID_KEY = 'super_admin_selected_bid';

const BusinessContext = createContext({
  activeBid: null,
  selectBusiness: () => {},
  isSuperAdmin: false,
});

export function BusinessProvider({ user, children }) {
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'super_admin';

  // تهيئة الـ activeBid:
  // - سوبر أدمن: من localStorage (الاختيار السابق)
  // - مستخدم عادي: من ملفه الشخصي مباشرة
  const [activeBid, _setActiveBid] = useState(() => {
    if (isSuperAdmin) {
      const stored = localStorage.getItem(SELECTED_BID_KEY);
      if (stored) setCurrentBusinessId(stored); // مزامنة فورية قبل أي query
      return stored || null;
    }
    const bid = user?.business_id || null;
    if (bid) setCurrentBusinessId(bid);
    return bid;
  });

  // عند تسجيل الدخول: مزامنة مع module variable
  useEffect(() => {
    if (activeBid) setCurrentBusinessId(activeBid);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectBusiness = (bid) => {
    _setActiveBid(bid);
    setCurrentBusinessId(bid);
    if (isSuperAdmin) localStorage.setItem(SELECTED_BID_KEY, bid);
    // مسح الـ cache كاملاً لتحميل بيانات الكافيه الجديدة
    queryClient.invalidateQueries();
  };

  return (
    <BusinessContext.Provider value={{ activeBid, selectBusiness, isSuperAdmin }}>
      {children}
    </BusinessContext.Provider>
  );
}

export const useBusiness = () => useContext(BusinessContext);
