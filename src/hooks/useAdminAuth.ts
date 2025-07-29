import { useState, useEffect } from 'react';

interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAdminAuth = () => {
  const [authState, setAuthState] = useState<AdminAuthState>({
    isAuthenticated: false,
    isLoading: true
  });

  // Session timeout (24 hours in milliseconds)
  const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

  const checkAuthentication = () => {
    const isAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
    const loginTime = sessionStorage.getItem('adminLoginTime');
    
    if (isAuthenticated && loginTime) {
      const elapsed = Date.now() - parseInt(loginTime);
      
      // Check if session has expired
      if (elapsed > SESSION_TIMEOUT) {
        // Session expired, clear authentication
        sessionStorage.removeItem('adminAuthenticated');
        sessionStorage.removeItem('adminLoginTime');
        return false;
      }
      
      return true;
    }
    
    return false;
  };

  const authenticate = () => {
    setAuthState({
      isAuthenticated: true,
      isLoading: false
    });
  };

  const logout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminLoginTime');
    setAuthState({
      isAuthenticated: false,
      isLoading: false
    });
  };

  const extendSession = () => {
    if (authState.isAuthenticated) {
      sessionStorage.setItem('adminLoginTime', Date.now().toString());
    }
  };

  useEffect(() => {
    // Check authentication on mount
    const isAuth = checkAuthentication();
    setAuthState({
      isAuthenticated: isAuth,
      isLoading: false
    });

    // Set up periodic authentication check (every minute)
    const interval = setInterval(() => {
      const isAuth = checkAuthentication();
      if (!isAuth && authState.isAuthenticated) {
        // Session expired
        logout();
      }
    }, 60000);

    // Extend session on user activity
    const handleUserActivity = () => {
      if (authState.isAuthenticated) {
        extendSession();
      }
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      clearInterval(interval);
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [authState.isAuthenticated]);

  return {
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    authenticate,
    logout,
    extendSession
  };
};