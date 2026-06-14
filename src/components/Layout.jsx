import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, ShoppingCart, Package, Grid3X3, X, LogOut, Coffee, Building, Settings, ChevronDown, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import db from '@/api/supabaseClient';
import { BusinessProvider, useBusiness } from '@/lib/BusinessContext';

const getNavItems = (user) => {
  const base = [
    { path: "/",          label: "لوحة التحكم", icon: LayoutDashboard },
    { path: "/cashier",   label: "الكاشير",      icon: ShoppingCart },
    { path: "/products",  label: "المنتجات",     icon: Package },
    { path: "/tables",    label: "الطاولات",     icon: Grid3X3 },
  ];
  if (user?.role === 'super_admin') {
    base.push({ path: "/businesses", label: "الأعمال", icon: Building });
  } else if (user?.role === 'admin') {
    base.push({ path: "/settings", label: "الإعدادات", icon: Settings });
  }
  return base;
};

function NavLink({ item, active, onClick }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      <item.icon className="w-5 h-5 shrink-0" />
      {item.label}
    </Link>
  );
}

// مبدّل الكافيهات — يقرأ ويكتب عبر BusinessContext
function BusinessSwitcher() {
  const { activeBid, selectBusiness } = useBusiness();
  const [open, setOpen] = useState(false);

  const { data: businesses = [] } = useQuery({
    queryKey: ['all-businesses-switcher'],
    queryFn: async () => {
      const { data, error } = await supabase.from('businesses').select('id, name').order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const current = businesses.find(b => b.id === activeBid);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 transition-colors"
      >
        <Store className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="flex-1 text-right text-sm font-medium truncate">
          {current?.name || 'اختر كافيه...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-amber-600 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 left-0 top-full mt-1 z-20 bg-white rounded-xl border border-border shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {businesses.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">لا توجد كافيهات</p>
            )}
            {businesses.map(b => (
              <button
                key={b.id}
                onClick={() => { selectBusiness(b.id); setOpen(false); }}
                className={`w-full text-right px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                  activeBid === b.id ? 'bg-primary/10 text-primary font-semibold' : ''
                }`}
              >
                <Coffee className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                {b.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// المحتوى الداخلي للـ Layout (بعد تهيئة الـ context)
function LayoutInner() {
  const { user, businessSettings } = useAuth();
  const { activeBid, isSuperAdmin } = useBusiness();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navItems = getNavItems(user);

  const cafeName    = businessSettings?.name || 'المنيو الذكي';
  const cafeLogoUrl = businessSettings?.logo_url;
  const roleLabel   = isSuperAdmin ? 'مدير عام' : user?.role === 'admin' ? 'مدير' : 'كاشير';

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== Sidebar ===== */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-64 bg-card border-l border-border flex flex-col
        transition-transform duration-300
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            {cafeLogoUrl
              ? <img src={cafeLogoUrl} alt={cafeName} className="w-9 h-9 rounded-xl object-cover border border-border shrink-0" onError={(e) => e.target.style.display='none'} />
              : <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0"><Coffee className="w-4 h-4 text-primary-foreground" /></div>
            }
            <span className="font-heading font-bold text-base truncate">{cafeName}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Business Switcher للسوبر أدمن */}
        {isSuperAdmin && (
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] text-muted-foreground font-medium px-1 mb-1.5">عرض بيانات كافيه:</p>
            <BusinessSwitcher />
            {!activeBid && (
              <p className="text-[10px] text-amber-600 px-1 mt-1.5">⚠️ اختر كافيه لعرض بياناتها</p>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              item={item}
              active={location.pathname === item.path}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* User info + Logout */}
        <div className="p-3 border-t border-border space-y-2">
          {user && (
            <div className="px-3 py-2 rounded-xl bg-muted/50">
              <p className="text-xs font-medium">{user.full_name || user.email}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          )}
          <button
            onClick={() => db.auth.logout()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ===== Main content ===== */}
      <div className="lg:mr-64 flex flex-col min-h-screen pb-16 lg:pb-0">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-card border-b border-border">
          <div className="flex items-center gap-2.5">
            {cafeLogoUrl
              ? <img src={cafeLogoUrl} alt={cafeName} className="w-7 h-7 rounded-lg object-cover" onError={(e) => e.target.style.display='none'} />
              : <Coffee className="w-5 h-5 text-primary" />
            }
            <span className="font-heading font-bold text-sm">{cafeName}</span>
          </div>
          {isSuperAdmin && !activeBid && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">اختر كافيه</span>
          )}
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent"
            aria-label="القائمة"
          >
            <div className="space-y-1.5">
              <span className="block w-5 h-0.5 bg-foreground rounded" />
              <span className="block w-5 h-0.5 bg-foreground rounded" />
              <span className="block w-5 h-0.5 bg-foreground rounded" />
            </div>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* ===== Mobile Bottom Navigation ===== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border flex items-center" dir="rtl">
        {navItems.slice(0, 5).map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {active && <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-t-full" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// الـ wrapper الرئيسي: يهيّئ BusinessContext قبل رسم أي شيء
export default function Layout() {
  const { user } = useAuth();
  return (
    <BusinessProvider user={user}>
      <LayoutInner />
    </BusinessProvider>
  );
}
