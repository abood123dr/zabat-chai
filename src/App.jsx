import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Navigate } from 'react-router-dom';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      const path = window.location.pathname;
      if (!path.startsWith('/menu') && !path.startsWith('/order-tracking')) {
        navigateToLogin();
        return null;
      }
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/menu" element={<CustomerMenu />} />
      <Route path="/order-tracking" element={<OrderTracking />} />
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

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>

          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App