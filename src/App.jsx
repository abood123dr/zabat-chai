import React, { lazy, Suspense } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';

// تحميل الصفحات بشكل كسول لتسريع الفتح الأول
const Login             = lazy(() => import('./pages/Login'));
const ForgotPassword    = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword     = lazy(() => import('./pages/ResetPassword'));
const CustomerMenu      = lazy(() => import('./pages/CustomerMenu'));
const OrderTracking     = lazy(() => import('./pages/OrderTracking'));
const KitchenDisplay    = lazy(() => import('./pages/KitchenDisplay'));
const AdminDashboard    = lazy(() => import('./pages/AdminDashboard'));
const CashierDashboard  = lazy(() => import('./pages/CashierDashboard'));
const ProductManagement = lazy(() => import('./pages/ProductManagement'));
const TableManagement   = lazy(() => import('./pages/TableManagement'));
const BusinessManagement = lazy(() => import('./pages/BusinessManagement'));
const BusinessSettings  = lazy(() => import('./pages/BusinessSettings'));
const OrderHistory      = lazy(() => import('./pages/OrderHistory'));

function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/menu" element={<CustomerMenu />} />
      <Route path="/order-tracking" element={<OrderTracking />} />
      <Route path="/kitchen" element={<KitchenDisplay />} />
    </Routes>
  );
}

const DashboardApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageLoader />;
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
          <Route path="/orders" element={<OrderHistory />} />
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

  if (path.startsWith('/menu') || path.startsWith('/order-tracking') || path.startsWith('/kitchen')) {
    return (
      <Router>
        <Suspense fallback={<PageLoader />}>
          <PublicRoutes />
        </Suspense>
      </Router>
    );
  }

  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <DashboardApp />
        </Suspense>
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
