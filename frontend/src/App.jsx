import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import StaffManagement from './pages/StaffManagement';
import ManualOrder from './pages/ManualOrder';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { AuthProvider, useAuth } from './context/AuthContext';
import PageTransition from './components/application/PageTransition';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-3000">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="relative flex items-center justify-center">
            {/* Soft decorative glow background */}
            <div className="absolute w-24 h-24 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
            {/* The DaisyUI 5 Loading Dots indicator */}
            <span className="loading loading-dots loading-xl text-primary relative z-10"></span>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Staff Lunch Order
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide animate-pulse">
              Preparing your session...
            </p>
          </div>
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  const location = useLocation();

  useEffect(() => {
    // Small timeout to allow React DOM updates to flush before running autoInit
    const timer = setTimeout(() => {
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
      <Route path="/" element={
        <PrivateRoute>
          <DashboardLayout />
        </PrivateRoute>
      }>

        <Route index element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="staff" element={<PageTransition><StaffManagement /></PageTransition>} />
        <Route path="manual-order" element={<PageTransition><ManualOrder /></PageTransition>} />
        <Route path="reports" element={<PageTransition><Reports /></PageTransition>} />
        <Route path="settings" element={<PageTransition><Settings /></PageTransition>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
