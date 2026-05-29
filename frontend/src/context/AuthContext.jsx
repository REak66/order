import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [user, setUser] = useState(null); // staff user
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role')); // 'admin' | 'staff'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token && role === 'admin') {
      fetchAdmin();
    } else if (token && role === 'staff') {
      fetchStaff();
    } else {
      setLoading(false);
    }
  }, [token, role]);

  const fetchAdmin = async () => {
    try {
      const res = await api.get('/api/auth/me');
      setAdmin(res.data);
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/api/auth/staff-me');
      setUser(res.data);
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Admin login
  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    const { token, admin } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('role', 'admin');
    setToken(token);
    setRole('admin');
    setAdmin(admin);
    return res.data;
  };

  // Staff login
  const staffLogin = async (username, password) => {
    const res = await api.post('/api/auth/staff-login', { username, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('role', 'staff');
    setToken(token);
    setRole('staff');
    setUser(user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setRole(null);
    setAdmin(null);
    setUser(null);
  };

  const currentUser = role === 'admin' ? admin : user;

  return (
    <AuthContext.Provider value={{
      admin,
      user,
      setUser,
      currentUser,
      token,
      role,
      loading,
      login,
      staffLogin,
      logout,
      isAuthenticated: !!(admin || user),
      isAdmin: role === 'admin',
      isStaff: role === 'staff'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
