import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Activity, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginUser(email, password);
      if (res.success) {
        navigate('/app');
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">
            <Activity size={40} className="upload-icon" style={{ color: 'var(--color-primary)' }} />
          </span>
          <h1 className="auth-title">MedAI Portal</h1>
          <p className="auth-subtitle">AI Medical Record Intelligence System</p>
        </div>

        {error && (
          <div className="disclaimer-banner" style={{ backgroundColor: 'var(--color-danger-bg)', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <div className="spinner"></div> : 'Sign In'}
          </button>
          
          <button
            type="button"
            onClick={() => window.open('https://app.storylane.io/demo/ie7jkrobzxwi', '_blank')}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-display)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(20, 184, 166, 0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            💡 Try the Tour Demo
          </button>

          <button
            type="button"
            onClick={() => window.open('https://drive.google.com/file/d/19FBFtZrOlUisdcwOggePp88zU4l_mfcc/view?usp=sharing', '_blank')}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              color: 'var(--color-secondary)',
              border: '1px solid var(--color-secondary)',
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-display)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            🛠️ Tools Presentation
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Create one here</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
