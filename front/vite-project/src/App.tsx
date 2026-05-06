import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { ReportPage } from './pages/ReportPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import type { ReactNode } from 'react';

function ProtectedRoute({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><div className="loading"><div className="spinner" /></div></div>;
  if (!user) return <Navigate to="/auth" />;
  if (adminOnly && user.rol !== 'ADMIN') return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/reportar" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
      <Route path="/mis-reportes" element={<ProtectedRoute><MyReportsPage /></ProtectedRoute>} />
      <Route path="/reporte/:id" element={<ProtectedRoute><ReportDetailPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute adminOnly><DashboardPage /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
