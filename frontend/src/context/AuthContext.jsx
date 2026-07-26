import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Centralized API Base URL configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = `${API_URL}/api`;

// Create a pre-configured Axios instance for database efficient & authenticated API requests
export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Configure Axios to automatically attach authorization header on every request if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('med_ai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('med_ai_token');
    const storedUser = localStorage.getItem('med_ai_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  /**
   * Triggers login request and saves auth state.
   */
  const loginUser = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const { token, user } = response.data.data;
      
      localStorage.setItem('med_ai_token', token);
      localStorage.setItem('med_ai_user', JSON.stringify(user));
      
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('[Auth Service] Login failed:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Authentication failed. Please check credentials.'
      };
    }
  };

  /**
   * Triggers signup registration.
   */
  const signupUser = async (name, email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, { name, email, password });
      const { token, user } = response.data.data;
      
      localStorage.setItem('med_ai_token', token);
      localStorage.setItem('med_ai_user', JSON.stringify(user));
      
      setToken(token);
      setUser(user);
      return { success: true };
    } catch (error) {
      console.error('[Auth Service] Signup failed:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Try a different email.'
      };
    }
  };

  /**
   * Destroys credentials and logging out user.
   */
  const logoutUser = () => {
    localStorage.removeItem('med_ai_token');
    localStorage.removeItem('med_ai_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginUser, signupUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be consumed inside AuthProvider tree.');
  }
  return context;
};

export default AuthContext;
