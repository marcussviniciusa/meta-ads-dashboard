import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

interface ProtectedRouteProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireSuperAdmin = false }: ProtectedRouteProps) => {
  const isAuthenticated = authService.isAuthenticated();
  const isSuperAdmin = authService.isSuperAdmin();
  
  // Verificar se o usuário está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Verificar se a rota requer superadmin e se o usuário é superadmin
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
