import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, ShoppingCart, Package, Grid3X3, X, LogOut, Coffee, Building, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/AuthContext';
import db from '@/api/supabaseClient';

const getNavItems = (user) => {
  const base = [
    { path: "/", label: "لوحة التحكم", icon: LayoutDashboard },
    { path: "/cashier", label: "الكاشير", icon: ShoppingCart },
    { path: "/products", label: "المنتجات", icon: Package },
    { path: "/tables", label: "الطاولات", icon: Grid3X3 },
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

export default function Layout() {
  const { user, businessSettings } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navItems = getNavItems(user);

  const cafeName = businessSettings?.name || (user?.role === 'super_admin' ? 'ظبط شاي' : 'ظبط شاي');
  const cafeLogoUrl = businessSettings?.logo_url;

  const roleLabel = user?.role === 'super_admin' ? 'مدير عام' : user?.role === 'admin' ? 'مدير' : 'كاشير';

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== Sidebar (desktop always, mobile on open) ===== */}
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
