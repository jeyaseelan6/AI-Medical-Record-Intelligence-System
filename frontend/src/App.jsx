import React, { useState, useEffect } from 'react';
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
  const [isTourOpen, setIsTourOpen] = useState(false);

  const triggerSupademo = () => {
    if (window.Supademo && typeof window.Supademo.open === 'function') {
      window.Supademo.open('cmsdh2tev000r0b0jt7mznvro');
    } else {
      console.warn('Supademo SDK not loaded yet.');
      alert('The interactive tour is initializing. Please wait a moment.');
    }
  };

  useEffect(() => {
    window.openStorylaneTour = () => setIsTourOpen(true);
    return () => {
      delete window.openStorylaneTour;
    };
  }, []);

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
          
          {/* Floating interactive Supademo tour button */}
          <button
            onClick={triggerSupademo}
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
            onClick={() => setIsTourOpen(true)}
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

          {/* Storylane Interactive Modal */}
          {isTourOpen && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                boxSizing: 'border-box'
              }}
              onClick={() => setIsTourOpen(false)}
            >
              <div 
                style={{
                  width: '100%',
                  maxWidth: '900px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                  position: 'relative',
                  padding: '24px 16px 16px 16px',
                  boxSizing: 'border-box'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsTourOpen(false)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Close Tour"
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                >
                  ✕
                </button>
                
                {/* Storylane Embed */}
                <div className="sl-embed" style={{ position: 'relative', paddingBottom: 'calc(55.83% + 25px)', width: '100%', height: 0, transform: 'scale(1)' }}>
                  <iframe 
                    loading="lazy" 
                    className="sl-demo" 
                    src="https://app.storylane.io/demo/0hgpiigtlhch?embed=inline" 
                    name="sl-embed" 
                    allow="fullscreen" 
                    allowFullScreen 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: '1px solid rgba(63,95,172,0.15)',
                      boxShadow: '0px 0px 18px rgba(26, 19, 72, 0.05)',
                      borderRadius: '8px',
                      boxSizing: 'border-box'
                    }}
                  ></iframe>
                </div>
              </div>
            </div>
          )}
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
