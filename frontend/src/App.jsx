import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LandingPage from './pages/LandingPage.jsx';

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
  const triggerTourDemo = () => {
    window.open('https://app.storylane.io/demo/ie7jkrobzxwi', '_blank');
  };

  const triggerToolsPresentation = () => {
    window.open('https://drive.google.com/file/d/19FBFtZrOlUisdcwOggePp88zU4l_mfcc/view?usp=sharing', '_blank');
  };

  return (
    <AuthProvider>
      <Router>
        <div style={{ position: 'relative', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route 
              path="/app/*" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/*" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* Floating interactive Storylane tour button */}
          <button
            onClick={triggerTourDemo}
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

          {/* Floating interactive Storylane presentation button */}
          <button
            onClick={triggerToolsPresentation}
            style={{
              position: 'fixed',
              bottom: '76px',
              right: '24px',
              backgroundColor: 'var(--color-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 9999,
              transition: 'transform 0.2s ease, background-color 0.2s ease',
              fontFamily: 'var(--font-display)'
            }}
            title="View Tools Presentation"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0284c7';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span>🛠️ Tools Presentation</span>
          </button>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
