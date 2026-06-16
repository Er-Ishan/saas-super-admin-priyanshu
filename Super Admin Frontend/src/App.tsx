import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DashboardLayout from './components/Layout/DashboardLayout';

// Pages
import Overview from './pages/Overview';
import Login from './pages/Login';
import Companies from './pages/Companies';
import CompanyDetails from './pages/CompanyDetails';
import BookingPage from './pages/BookingPage';
import Suppliers from './pages/Suppliers';
import FieldMappings from './pages/FieldMappings';
import SupplierEmailMapping from './pages/SupplierEmailMapping';
import AccessControl from './pages/AccessControl';
import Users from './pages/Users';
import SupportCenter from './pages/SupportCenter';
import Airports from './pages/Airports';
import OnboardCompany from './pages/OnboardCompany';
import CompanySettings from './pages/CompanySettings';
import RegisterSupplier from './pages/RegisterSupplier';
import EditSupplier from './pages/EditSupplier';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PermissionProtectedRoute = ({ 
  children, 
  permission 
}: { 
  children: React.ReactNode; 
  permission: string;
}) => {
  const { hasPermission, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasPermission(permission)) return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="field-mappings" element={<FieldMappings />} />
            <Route path="companies" element={<Companies />} />
            <Route path="companies/onboard" element={<OnboardCompany />} />
            <Route path="companies/:id" element={<CompanyDetails />} />
            <Route path="companies/:id/settings" element={<CompanySettings />} />
            <Route path="bookings" element={<BookingPage />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/register" element={<RegisterSupplier />} />
            <Route path="suppliers/:id/edit" element={<EditSupplier />} />
            <Route path="suppliers/mapping/:id" element={<SupplierEmailMapping />} />
            <Route 
              path="access-control" 
              element={
                <PermissionProtectedRoute permission="access_access_control">
                  <AccessControl />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="users" 
              element={
                <PermissionProtectedRoute permission="access_users">
                  <Users />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="support-center" 
              element={
                <PermissionProtectedRoute permission="resolve_admin_support">
                  <SupportCenter />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="airports" 
              element={
                <PermissionProtectedRoute permission="access_airports">
                  <Airports />
                </PermissionProtectedRoute>
              } 
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
