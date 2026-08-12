import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('vvc_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('vvc_token') || null);
  const [loading, setLoading] = useState(false);

  const loginUser = async (email, role) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, role });
      const { token: jwtToken, user: userProfile } = res.data;

      localStorage.setItem('vvc_token', jwtToken);
      localStorage.setItem('vvc_user', JSON.stringify(userProfile));

      setToken(jwtToken);
      setUser(userProfile);
      return userProfile;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('vvc_token');
    localStorage.removeItem('vvc_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
