import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CustomerMenu from './pages/CustomerMenu';
import OrderTracking from './pages/OrderTracking';
import AdminDashboard from './pages/AdminDashboard';
import CashierDashboard from './pages/CashierDashboard';
import ProductManagement from './pages/ProductManagement';
import TableManagement from './pages/TableManagement';
import BusinessManagement from './pages/BusinessManagement';
import BusinessSettings from './pages/BusinessSettings';

// الصفحات العامة (بدون تسجيل دخول)
function PublicRoutes() {
  return (
    <Routes>
      <Route path="/menu" element={<CustomerMenu />} />
      <Route path="/order-tracking" element={<OrderTracking />} />
    </Routes>
  );
}

// صفحات لوحة التحكم (تحتاج تسجيل دخول)
const DashboardApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/cashier" element={<CashierDashboard />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/tables" element={<TableManagement />} />
          <Route path="/businesses" element={<BusinessManagement />} />
          <Route path="/settings" element={<BusinessSettings />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function AppRoutes() {
  const path = window.location.pathname;

  // روابط عامة تُعرض فوراً بدون أي فحص auth
  if (path.startsWith('/menu') || path.startsWith('/order-tracking')) {
    return (
      <Router>
        <PublicRoutes />
      </Router>
    );
  }

  return (
    <Router>
      <AuthProvider>
        <DashboardApp />
      </AuthProvider>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AppRoutes />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App
