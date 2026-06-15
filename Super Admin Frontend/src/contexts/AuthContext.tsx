import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';

interface User {
  id: number;
  name: string;
  email: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('super_admin_user');
      const token = localStorage.getItem('super_admin_token');
      
      if (storedUser && token) {
        const parsedUser = JSON.parse(storedUser);
        
        // If user is stored but permissions are missing or empty, fetch them
        if (!parsedUser.permissions || parsedUser.permissions.length === 0) {
          try {
            const response = await api.get('/my-permissions');
            if (response.data.success) {
              parsedUser.permissions = response.data.permissions;
              localStorage.setItem('super_admin_user', JSON.stringify(parsedUser));
            }
          } catch (error) {
            console.error("Failed to fetch permissions:", error);
          }
        }
        
        setUser(parsedUser);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('super_admin_token', token);
    localStorage.setItem('super_admin_user', JSON.stringify(user));
    setUser(user);
    navigate('/');
  };

  const logout = () => {
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('super_admin_user');
    setUser(null);
    navigate('/login');
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    // Fallback: if permissions aren't loaded yet or were failed to load
    if (!user.permissions) return false;
    
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading, hasPermission }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
