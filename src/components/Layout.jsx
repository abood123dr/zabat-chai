import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, ShoppingCart, Package, Grid3X3, X, LogOut, Coffee, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/AuthContext';
import db from '@/api/supabaseClient';

const navItems = (user) => [
  { path: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/cashier", label: "الكاشير", icon: ShoppingCart },
  { path: "/products", label: "المنتجات", icon: Package },
  { path: "/tables", label: "الطاولات والغرف", icon: Grid3X3 },
  ...(user?.role === 'super_admin' ? [{ path: "/businesses", label: "إدارة الأعمال", icon: Building }] : []),
];

export default function Layout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const items = navItems(user);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-72 bg-card border-l border-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg leading-tight">ظبط شاي</h1>
              <p className="text-xs text-muted-foreground">لوحة الإدارة</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          {user && (
            <div className="px-4 py-2 mb-2 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <p className="text-xs font-medium capitalize">{user.role === 'super_admin' ? 'مدير عام' : user.role === 'admin' ? 'مدير' : 'كاشير'}</p>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => db.auth.logout()}
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:mr-72 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-base">ظبط شاي</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            aria-label="فتح القائمة"
          >
            <div className="space-y-1.5">
              <span className="block w-5 h-0.5 bg-foreground rounded" />
              <span className="block w-5 h-0.5 bg-foreground rounded" />
              <span className="block w-5 h-0.5 bg-foreground rounded" />
            </div>
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
