import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface NotificationContextType {
  showNotification: (message: string, severity: AlertColor) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [state, setState] = useState({
    open: false,
    message: '',
    severity: 'info' as AlertColor
  });

  const showNotification = useCallback((message: string, severity: AlertColor) => {
    setState({
      open: true,
      message,
      severity
    });
  }, []);

  const showSuccess = useCallback((message: string) => {
    showNotification(message, 'success');
  }, [showNotification]);
  
  const showError = useCallback((message: string) => {
    showNotification(message, 'error');
  }, [showNotification]);
  
  const showWarning = useCallback((message: string) => {
    showNotification(message, 'warning');
  }, [showNotification]);
  
  const showInfo = useCallback((message: string) => {
    showNotification(message, 'info');
  }, [showNotification]);

  const handleClose = useCallback((event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setState(prev => ({
      ...prev,
      open: false
    }));
  }, []);

  const contextValue = useMemo(() => ({
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }), [showNotification, showSuccess, showError, showWarning, showInfo]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <Snackbar 
        open={state.open} 
        autoHideDuration={6000} 
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity={state.severity} variant="filled" sx={{ width: '100%' }}>
          {state.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
