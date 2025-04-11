import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { NotificationProvider } from './contexts/NotificationContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import CompaniesPage from './pages/CompaniesPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Styles
import './App.css';

// Services
import authService from './services/authService';

// Criar tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1877F2', // Cor principal do Meta/Facebook
      light: '#4293fb',
      dark: '#0e5db9',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#42b72a', // Verde do Meta/Facebook
      light: '#6aca57',
      dark: '#2e801d',
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
        },
      },
    },
  },
});

// Componente para lidar com redirecionamento na rota inicial
const IndexRedirect = () => {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  
  useEffect(() => {
    // Determina o redirecionamento apenas uma vez no useEffect
    const destination = authService.isAuthenticated() ? '/dashboard' : '/login';
    setRedirectTo(destination);
  }, []);
  
  // Aguarda até que o estado seja definido antes de redirecionar
  if (redirectTo === null) {
    return <div>Carregando...</div>;
  }
  
  return <Navigate to={redirectTo} replace />;
};

function App() {
  useEffect(() => {
    // Caso de implementação real: verificar token expirado
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Aqui faria uma chamada para verificar se o token é válido
          // await authService.getCurrentUser();
        }
      } catch (error) {
        // Se houver erro, fazer logout
        authService.logout();
      }
    };
    
    checkAuth();
  }, []);

  // Hack para evitar loops infinitos de renderizau00e7u00e3o em desenvolvimento
  const renderCount = React.useRef(0);
  renderCount.current += 1;
  
  // Se estiver em mais de 10 renderizau00e7u00f5es, vamos evitar loops infinitos
  if (renderCount.current > 20) {
    console.error('Muitas renderizau00e7u00f5es detectadas, recarregue a pu00e1gina manualmente');
    return <div>Erro de renderizau00e7u00e3o detectado. Por favor, recarregue a pu00e1gina.</div>;
  }
  
  return (
    <ThemeProvider theme={theme}>
      {/* Removemos o StrictMode para evitar renderizau00e7u00f5es duplas em desenvolvimento */}
      <LocalizationProvider dateAdapter={AdapterMoment}>
        <CssBaseline />
        <NotificationProvider>
          <Router>
          <Routes>
            {/* Rota pública */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Rotas protegidas */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            {/* Rotas apenas para superadmins */}
            <Route path="/users" element={
              <ProtectedRoute requireSuperAdmin={true}>
                <UsersPage />
              </ProtectedRoute>
            } />
            
            <Route path="/companies" element={
              <ProtectedRoute requireSuperAdmin={true}>
                <CompaniesPage />
              </ProtectedRoute>
            } />
            
            {/* Redirecionar para dashboard se estiver autenticado */}
            <Route path="/" element={<IndexRedirect />} />
            
            {/* Página não encontrada */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Router>
        </NotificationProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
