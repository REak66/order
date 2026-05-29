import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import StaffManagement from './pages/StaffManagement';
import ManualOrder from './pages/ManualOrder';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import StaffPortal from './pages/StaffPortal';
import { AuthProvider, useAuth } from './context/AuthContext';
import PageTransition from './components/application/PageTransition';

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-350">
    <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
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

// Route guard: only for authenticated admins
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/staff-portal" />;
  return children;
};

// Route guard: only for authenticated staff
const StaffRoute = ({ children }) => {
  const { isAuthenticated, isStaff, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isStaff) return <Navigate to="/" />;
  return children;
};

function AppRoutes() {
  const location = useLocation();
  const { isAuthenticated, isAdmin, isStaff, loading } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <Routes>
      {/* Login — redirect if already authenticated */}
      <Route
        path="/login"
        element={
          loading ? <LoadingScreen /> :
          isAuthenticated
            ? (isAdmin ? <Navigate to="/" /> : <Navigate to="/staff-portal" />)
            : <PageTransition><Login isAdminMode={false} /></PageTransition>
        }
      />

      {/* Admin Login — hidden route for administrators */}
      <Route
        path="/admin-login"
        element={
          loading ? <LoadingScreen /> :
          isAuthenticated
            ? (isAdmin ? <Navigate to="/" /> : <Navigate to="/staff-portal" />)
            : <PageTransition><Login isAdminMode={true} /></PageTransition>
        }
      />

      {/* Staff Portal */}
      <Route
        path="/staff-portal"
        element={
          <StaffRoute>
            <PageTransition><StaffPortal /></PageTransition>
          </StaffRoute>
        }
      />

      {/* Admin Dashboard */}
      <Route path="/" element={<AdminRoute><DashboardLayout /></AdminRoute>}>
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
