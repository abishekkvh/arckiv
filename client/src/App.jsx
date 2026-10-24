import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MyFiles = lazy(() => import('./pages/MyFiles'));
const Upload = lazy(() => import('./pages/Upload'));
const PublicSharedView = lazy(() => import('./pages/PublicSharedView'));
import NotFound from './pages/NotFound';
import DashboardLayout from './components/layout/DashboardLayout';
import ErrorBoundary from './components/ui/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center" role="status">Loading Arckiv…</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/shared/:token" element={<PublicSharedView />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="my-files" element={<MyFiles />} />
              <Route path="upload" element={<Upload />} />
            </Route>

            {/* 404 Catch-All Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
