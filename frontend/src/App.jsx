import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';

/**
 * Route protection wrapper ensuring token presence before loading pages.
 */
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner-primary"></div>
      </div>
    );
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  const triggerTour = () => {
    if (window.Supademo && typeof window.Supademo.open === 'function') {
      window.Supademo.open('cmsdh2tev000r0b0jt7mznvro');
    } else {
      console.warn('Supademo SDK not loaded yet.');
      alert('The interactive tour is initializing. Please wait a moment.');
    }
  };

  return (
    <AuthProvider>
      <Router>
        <div style={{ position: 'relative', minHeight: '100vh' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route 
              path="/*" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
          
          {/* Floating interactive tour button */}
          <button
            onClick={triggerTour}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 9999,
              transition: 'transform 0.2s ease, background-color 0.2s ease',
              fontFamily: 'var(--font-display)'
            }}
            title="Start Interactive Product Tour"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0d9488';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span>💡 Try the tour</span>
          </button>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
