import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, ArrowRight, UserPlus, Apple } from 'lucide-react';
import { BACKEND_URL } from '../config';

export default function AuthPage() {
  const [tab, setTab] = useState('user');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // User login/signup states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Admin login states
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('ya_client_token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userMembership', data.user.membership || 'free');
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      setSuccess('Account created successfully! Please sign in.');
      setIsSignUp(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('ya_admin_token', data.token);
      localStorage.setItem('admin_name', data.name || 'Admin');
      localStorage.setItem('admin_email', data.email);
      localStorage.setItem('admin_role', data.role);
      navigate('/admin/dashboard');
    } catch (err) {
      setAdminError(err.message || 'Invalid admin credentials.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo"><Apple size={56} fill="#fbbf24" color="#fbbf24" className="apple-logo" /></div>
          <h1>Yellow Apple</h1>
          <p>Your AI-Powered Nutrition Assistant</p>
        </div>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'user' ? 'active' : ''}`} onClick={() => { setTab('user'); setError(''); setSuccess(''); }}>
            <User size={16} />
            User
          </button>
          <button className={`auth-tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => { setTab('admin'); setAdminError(''); }}>
            <Lock size={16} />
            Admin
          </button>
        </div>

        {tab === 'user' ? (
          <>
            {!isSignUp ? (
              /* User Login Form */
              <form onSubmit={handleLogin} className="auth-form">
                <h2>Welcome Back</h2>
                <p className="auth-subtitle">Sign in to continue your nutrition journey</p>
                
                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}
                
                <div className="form-group">
                  <label><Mail size={14} /> Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label><Lock size={14} /> Password</label>
                  <div className="password-input">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
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
                <button type="submit" className="auth-btn" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : (
                    <>Sign In <ArrowRight size={16} /></>
                  )}
                </button>
                
                <div className="auth-switch">
                  <p>Don't have an account?</p>
                  <button type="button" onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}>
                    <UserPlus size={14} /> Create Account
                  </button>
                </div>
              </form>
            ) : (
              /* User Sign Up Form */
              <form onSubmit={handleSignUp} className="auth-form">
                <h2>Create Account</h2>
                <p className="auth-subtitle">Join Yellow Apple for personalized nutrition</p>
                
                {error && <div className="auth-error">{error}</div>}
                
                <div className="form-group">
                  <label><User size={14} /> Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label><Mail size={14} /> Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label><Lock size={14} /> Password</label>
                  <div className="password-input">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password (min 6 chars)"
                      required
                      minLength={6}
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
                <div className="form-group">
                  <label><Lock size={14} /> Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                <button type="submit" className="auth-btn" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : (
                    <>Create Account <ArrowRight size={16} /></>
                  )}
                </button>
                
                <div className="auth-switch">
                  <p>Already have an account?</p>
                  <button type="button" onClick={() => { setIsSignUp(false); setError(''); }}>
                    Sign In Instead
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          /* Admin Login Form */
          <form onSubmit={handleAdminLogin} className="auth-form">
            <h2>Admin Login</h2>
            <p className="auth-subtitle">Access the admin dashboard</p>
            
            {adminError && <div className="auth-error">{adminError}</div>}
            
            <div className="form-group">
              <label><Mail size={14} /> Email Address</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Enter admin email"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label><Lock size={14} /> Password</label>
              <div className="password-input">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                >
                  {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="auth-btn" disabled={adminLoading}>
              {adminLoading ? 'Signing in...' : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
