import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, Key, LogIn, UserPlus, Eye, EyeOff, Apple } from 'lucide-react';
import { BACKEND_URL } from '../config';

const STORAGE_KEY = 'ya_admin_token';

export default function AdminAuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem(STORAGE_KEY, data.token);
      localStorage.setItem('admin_name', data.name || 'Admin');
      localStorage.setItem('admin_email', data.email);
      localStorage.setItem('admin_role', data.role);
      
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => navigate('/admin/dashboard', { replace: true }), 1000);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      localStorage.setItem(STORAGE_KEY, data.token);
      localStorage.setItem('admin_name', data.admin.name);
      localStorage.setItem('admin_email', data.admin.email);
      localStorage.setItem('admin_role', data.admin.role);
      
      setSuccess('Account created! Redirecting...');
      setTimeout(() => navigate('/admin/dashboard', { replace: true }), 1000);
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-container">
      <div className="admin-auth-card">
        <div className="admin-auth-header">
          <div className="admin-logo">
            <Shield size={40} />
          </div>
          <h1><Apple size={32} fill="#fbbf24" color="#fbbf24" className="apple-logo" /> Yellow Apple</h1>
          <p>Admin Portal</p>
        </div>
        {error && <div className="auth-message error">{error}</div>}
        {success && <div className="auth-message success">{success}</div>}
        <form onSubmit={isLogin ? handleLogin : handleSignup} className="admin-auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>
                <User size={16} /> Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Admin Name"
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>
              <Mail size={16} /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>
              <Lock size={16} /> Password
            </label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="admin-submit-btn" disabled={loading}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : isLogin ? (
              <>
                <LogIn size={18} /> Sign In
              </>
            ) : (
              <>
                <UserPlus size={18} /> Create Account
              </>
            )}
          </button>
        </form>
        <div className="admin-auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
          <a href="/login" className="back-link">← Back to User Login</a>
        </div>
      </div>
    </div>
  );
}
