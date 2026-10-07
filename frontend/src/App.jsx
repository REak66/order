import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PageTransition from './components/application/PageTransition';
import LoadingScreen from './components/LoadingScreen';

// Lazy load pages for code splitting & faster initial page load
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const StaffManagement = React.lazy(() => import('./pages/StaffManagement'));
const ManualOrder = React.lazy(() => import('./pages/ManualOrder'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Holidays = React.lazy(() => import('./pages/Holidays'));
const Settings = React.lazy(() => import('./pages/Settings'));
const StaffPortal = React.lazy(() => import('./pages/StaffPortal'));

// Route guard: only for authenticated admins
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen message="Verifying admin credentials..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/staff-portal" replace />;
  return children;
};

// Route guard: only for authenticated staff
const StaffRoute = ({ children }) => {
  const { isAuthenticated, isStaff, loading } = useAuth();
  if (loading) return <LoadingScreen message="Verifying staff session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isStaff) return <Navigate to="/admin" replace />;
  return children;
};

function AppRoutes() {
  const location = useLocation();
  const { isAuthenticated, isAdmin, loading } = useAuth();

  useEffect(() => {
    const titles = {
      '/': 'Staff Lunch Order System',
      '/login': 'Staff Sign In - Lunch Order',
      '/admin-login': 'Admin Sign In - Lunch Order',
      '/admin/login': 'Admin Sign In - Lunch Order',
      '/staff-portal': 'Staff Portal - Lunch Order',
      '/admin': 'Dashboard - Admin Workspace',
      '/admin/staff': 'Staff Management - Admin Workspace',
      '/admin/manual-order': 'Manual Order - Admin Workspace',
      '/admin/reports': 'Lunch Reports - Admin Workspace',
      '/admin/holidays': 'Public Holidays - Admin Workspace',
      '/admin/settings': 'Settings - Admin Workspace',
    };
    document.title = titles[location.pathname] || 'Staff Lunch Order System';

    const timer = setTimeout(() => {
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (loading) {
    return <LoadingScreen message="Initializing session..." />;
  }

  return (
    <Suspense fallback={<LoadingScreen message="Loading page..." />}>
      <Routes>
        {/* Smart Root Redirect */}
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : isAdmin ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/staff-portal" replace />
            )
          }
        />

        {/* Staff Login */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/staff-portal" replace />
            ) : (
              <PageTransition>
                <Login isAdminMode={false} />
              </PageTransition>
            )
          }
        />

        {/* Admin Login routes */}
        <Route
          path="/admin-login"
          element={
            isAuthenticated ? (
              isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/staff-portal" replace />
            ) : (
              <PageTransition>
                <Login isAdminMode={true} />
              </PageTransition>
            )
          }
        />
        <Route
          path="/admin/login"
          element={
            isAuthenticated ? (
              isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/staff-portal" replace />
            ) : (
              <PageTransition>
                <Login isAdminMode={true} />
              </PageTransition>
            )
          }
        />

        {/* Staff Portal */}
        <Route
          path="/staff-portal"
          element={
            <StaffRoute>
              <PageTransition>
                <StaffPortal />
              </PageTransition>
            </StaffRoute>
          }
        />

        {/* Admin Workspace */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <DashboardLayout />
            </AdminRoute>
          }
        >
          <Route
            index
            element={
              <PageTransition>
                <Dashboard />
              </PageTransition>
            }
          />
          <Route
            path="staff"
            element={
              <PageTransition>
                <StaffManagement />
              </PageTransition>
            }
          />
          <Route
            path="manual-order"
            element={
              <PageTransition>
                <ManualOrder />
              </PageTransition>
            }
          />
          <Route
            path="reports"
            element={
              <PageTransition>
                <Reports />
              </PageTransition>
            }
          />
          <Route
            path="holidays"
            element={
              <PageTransition>
                <Holidays />
              </PageTransition>
            }
          />
          <Route
            path="settings"
            element={
              <PageTransition>
                <Settings />
              </PageTransition>
            }
          />
        </Route>

        {/* Legacy route redirects */}
        <Route path="/staff" element={<Navigate to="/admin/staff" replace />} />
        <Route path="/manual-order" element={<Navigate to="/admin/manual-order" replace />} />
        <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
        <Route path="/holidays" element={<Navigate to="/admin/holidays" replace />} />
        <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
