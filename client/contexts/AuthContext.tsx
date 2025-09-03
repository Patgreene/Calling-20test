import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const ADMIN_PASSWORD = "Tim&Pat95";
  const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds

  // Check for existing session on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_auth');
    const savedActivity = localStorage.getItem('admin_last_activity');
    
    if (savedAuth === 'true' && savedActivity) {
      const timeSinceActivity = Date.now() - parseInt(savedActivity);
      if (timeSinceActivity < SESSION_TIMEOUT) {
        setIsAuthenticated(true);
        setLastActivity(parseInt(savedActivity));
      } else {
        // Session expired
        localStorage.removeItem('admin_auth');
        localStorage.removeItem('admin_last_activity');
      }
    }
  }, []);

  // Update activity timestamp on user interaction
  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now();
      setLastActivity(now);
      if (isAuthenticated) {
        localStorage.setItem('admin_last_activity', now.toString());
      }
    };

    // Track various user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [isAuthenticated]);

  // Check session timeout periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTimeout = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity;
      if (timeSinceActivity >= SESSION_TIMEOUT) {
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkTimeout);
  }, [isAuthenticated, lastActivity]);

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      const now = Date.now();
      setIsAuthenticated(true);
      setLastActivity(now);
      localStorage.setItem('admin_auth', 'true');
      localStorage.setItem('admin_last_activity', now.toString());
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_last_activity');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
