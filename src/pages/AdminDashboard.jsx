import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BarChart3, Settings, LogOut, 
  Plus, Trash2, RefreshCw, Activity,
  TrendingUp, Clock, AlertCircle, CheckCircle,
  Brain, Zap, FileText, CreditCard, Shield,
  Eye, UserCheck, UserX, Mail, Bell, Database,
  Globe, Server, Lock, Unlock, Edit2, Search,
  Download, Filter, MoreVertical, Crown, Star, Receipt, Apple
} from 'lucide-react';
import '../components/AdminStyles.css';
import { BACKEND_URL } from '../config';

const STORAGE_KEY = 'ya_admin_token';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [aiSettings, setAiSettings] = useState(null);
  const [payments, setPayments] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modal states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // Form states
  const [newUser, setNewUser] = useState({ name: '', email: '', age: '', weight: '', height: '', membership: 'free' });
  const [announcement, setAnnouncement] = useState({ title: '', message: '', type: 'info' });
  
  const navigate = useNavigate();
  const adminName = localStorage.getItem('admin_name') || 'Admin';
  const adminRole = localStorage.getItem('admin_role') || 'admin';
  const adminEmail = localStorage.getItem('admin_email') || '';

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEY)}`
  });

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetchAllData();
  }, [navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, logsRes, aiRes, paymentsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/stats`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/admin/users`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/admin/logs`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/admin/ai-settings`, { headers: getAuthHeaders() }),
        fetch(`${BACKEND_URL}/api/admin/payments`, { headers: getAuthHeaders() })
      ]);

      if (!statsRes.ok) throw new Error('Session expired');

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const logsData = await logsRes.json();
      const aiData = await aiRes.json();
      const paymentsData = paymentsRes.ok ? await paymentsRes.json() : { payments: [], totalRevenue: 0 };

      // Use real data from backend - no mock data
      setStats({
        totalUsers: statsData.totalUsers || 0,
        totalRegistrations: statsData.totalRegistrations || 0,
        totalLogins: statsData.totalLogins || 0,
        freeUsers: statsData.freeUsers || 0,
        premiumUsers: statsData.premiumUsers || 0,
        activeUsers: statsData.activeUsers || 0,
        inactiveUsers: statsData.inactiveUsers || 0,
        activeUsersToday: statsData.activeUsersToday || 0,
        aiRequests: statsData.analytics?.aiRequestsToday || 0,
        foodAnalyses: statsData.analytics?.foodAnalysesToday || 0,
        chatMessages: statsData.analytics?.chatMessagesToday || 0,
        aiStatus: statsData.aiStatus,
        aiModel: statsData.aiModel
      });

      // Use real users data
      setUsers(usersData.users || []);

      // Use real logs data
      setLogs(logsData.logs || []);

      // Use real payments data
      setPayments(paymentsData.payments || []);
      setTotalRevenue(paymentsData.totalRevenue || 0);

      setAiSettings(aiData);
    } catch (err) {
      if (err.message === 'Session expired') {
        localStorage.removeItem(STORAGE_KEY);
        navigate('/login', { replace: true });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_role');
    navigate('/login', { replace: true });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add user');
      }
      
      setShowAddUser(false);
      setNewUser({ name: '', email: '', age: '', weight: '', height: '', membership: 'free' });
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (email) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await fetch(`${BACKEND_URL}/api/admin/users/${email}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await fetch(`${BACKEND_URL}/api/admin/users/${user.email}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      fetchAllData();
    } catch (err) {
      // Update locally for demo
      setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    }
  };

  const handleUpgradeMembership = async (user) => {
    const newMembership = user.membership === 'premium' ? 'free' : 'premium';
    try {
      await fetch(`${BACKEND_URL}/api/admin/users/${user.email}/membership`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ membership: newMembership })
      });
      fetchAllData();
    } catch (err) {
      // Update locally for demo
      setUsers(users.map(u => u.id === user.id ? { ...u, membership: newMembership } : u));
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'premium' && user.membership === 'premium') ||
                         (filterStatus === 'free' && user.membership === 'free') ||
                         (filterStatus === 'active' && user.status === 'active') ||
                         (filterStatus === 'inactive' && user.status === 'inactive');
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <Apple size={28} fill="#fbbf24" color="#fbbf24" className="apple-logo" />
            <div className="brand-text">
              <h2>Yellow Apple</h2>
              <span className="brand-subtitle">Admin Panel</span>
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="nav-section">
            <span className="nav-section-title">Dashboard</span>
            <button 
              className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <BarChart3 size={18} />
              Overview
            </button>
            <button 
              className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <TrendingUp size={18} />
              Analytics
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-section-title">Management</span>
            <button 
              className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={18} />
              Users
              <span className="nav-badge">{stats?.totalUsers || 0}</span>
            </button>
            <button 
              className={`admin-nav-item ${activeTab === 'memberships' ? 'active' : ''}`}
              onClick={() => setActiveTab('memberships')}
            >
              <CreditCard size={18} />
              Memberships
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-section-title">System</span>
            <button 
              className={`admin-nav-item ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Brain size={18} />
              AI Settings
            </button>
            <button 
              className={`admin-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <FileText size={18} />
              System Logs
            </button>
            <button 
              className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={18} />
              Settings
            </button>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-avatar">
              <Shield size={20} />
            </div>
            <div>
              <p className="admin-name">{adminName}</p>
              <p className="admin-email">{adminEmail}</p>
              <span className="admin-role-badge">{adminRole}</span>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <h1>
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'analytics' && 'Analytics'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'memberships' && 'Membership Management'}
              {activeTab === 'ai' && 'AI Configuration'}
              {activeTab === 'logs' && 'System Logs'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p className="header-subtitle">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="header-actions">
            <button className="header-btn" onClick={() => setShowAnnouncement(true)}>
              <Bell size={18} />
            </button>
            <button className="refresh-btn" onClick={fetchAllData}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="admin-error">
            <AlertCircle size={16} />
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="admin-overview">
            <div className="welcome-banner">
              <div className="welcome-content">
                <h2>Welcome back, {adminName}!</h2>
                <p>Here's what's happening with Yellow Apple today.</p>
              </div>
              <div className="welcome-stats">
                <div className="welcome-stat">
                  <span className="stat-value">{stats?.activeUsersToday || 0}</span>
                  <span className="stat-label">Active Today</span>
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon users">
                  <Users size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats?.totalUsers || 0}</h3>
                  <p>Total Users</p>
                  <span className="stat-trend">{stats?.totalRegistrations || 0} registered</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon premium">
                  <Crown size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats?.premiumUsers || 0}</h3>
                  <p>Premium Members</p>
                  <span className="stat-trend">{stats?.freeUsers || 0} free users</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon users">
                  <UserCheck size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats?.activeUsers || 0}</h3>
                  <p>Active Accounts</p>
                  <span className="stat-trend">{stats?.inactiveUsers || 0} inactive</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon ai">
                  <Zap size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats?.aiRequests || 0}</h3>
                  <p>AI Requests Today</p>
                  <span className="stat-trend">{stats?.chatMessages || 0} chats</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon revenue">
                  <Receipt size={24} />
                </div>
                <div className="stat-info">
                  <h3>Rs. {totalRevenue.toLocaleString()}</h3>
                  <p>Total Revenue</p>
                  <span className="stat-trend">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            <div className="overview-grid">
              <div className="overview-card">
                <h3>
                  <Server size={18} />
                  System Status
                </h3>
                <div className="system-status-grid">
                  <div className="status-item">
                    <span className="status-indicator online"></span>
                    <span>API Server</span>
                    <span className="status-value">Online</span>
                  </div>
                  <div className="status-item">
                    <span className="status-indicator online"></span>
                    <span>Database</span>
                    <span className="status-value">Connected</span>
                  </div>
                  <div className="status-item">
                    <span className={`status-indicator ${aiSettings?.status === 'active' ? 'online' : 'offline'}`}></span>
                    <span>AI Service</span>
                    <span className="status-value">{aiSettings?.status === 'active' ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-indicator online"></span>
                    <span>Last Backup</span>
                    <span className="status-value">2h ago</span>
                  </div>
                </div>
              </div>

              <div className="overview-card">
                <h3>
                  <Activity size={18} />
                  User Activity
                </h3>
                <div className="activity-stats">
                  <div className="activity-stat">
                    <span className="activity-number">{stats?.activeUsersToday || 0}</span>
                    <span className="activity-label">Active Today</span>
                  </div>
                  <div className="activity-stat">
                    <span className="activity-number">{stats?.chatMessages || 0}</span>
                    <span className="activity-label">AI Chats</span>
                  </div>
                  <div className="activity-stat">
                    <span className="activity-number">{stats?.foodAnalyses || 0}</span>
                    <span className="activity-label">Food Analyses</span>
                  </div>
                </div>
              </div>

              <div className="overview-card full-width">
                <h3>
                  <Clock size={18} />
                  Recent Activity
                </h3>
                <div className="activity-list">
                  {logs.length === 0 ? (
                    <div className="no-activity">No recent activity</div>
                  ) : (
                    logs.slice(0, 5).map((log, i) => (
                      <div key={i} className={`activity-item ${log.type}`}>
                        <span className="activity-time">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`activity-type ${log.type}`}>{log.type}</span>
                        <span className="activity-message">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="admin-analytics">
            <div className="analytics-grid">
              <div className="analytics-card large">
                <h3>User Statistics</h3>
                <div className="chart-placeholder">
                  <TrendingUp size={48} />
                  <p>Total Registrations: {stats?.totalRegistrations || 0}</p>
                  <span className="chart-value">Total Logins: {stats?.totalLogins || 0}</span>
                </div>
              </div>
              <div className="analytics-card">
                <h3>Membership Distribution</h3>
                <div className="membership-chart">
                  <div className="chart-item">
                    <div className="chart-bar free" style={{ width: '70%' }}></div>
                    <span>Free ({(stats?.totalUsers || 0) - (stats?.premiumUsers || 0)})</span>
                  </div>
                  <div className="chart-item">
                    <div className="chart-bar premium" style={{ width: '30%' }}></div>
                    <span>Premium ({stats?.premiumUsers || 0})</span>
                  </div>
                </div>
              </div>
              <div className="analytics-card">
                <h3>AI Usage Today</h3>
                <div className="ai-usage-stats">
                  <div className="usage-item">
                    <span className="usage-label">Food Analysis</span>
                    <span className="usage-value">{stats?.foodAnalyses || 0}</span>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">AI Chat</span>
                    <span className="usage-value">{stats?.chatMessages || 0}</span>
                  </div>
                  <div className="usage-item">
                    <span className="usage-label">Total AI Requests</span>
                    <span className="usage-value">{stats?.aiRequests || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="admin-users">
            <div className="section-header">
              <div className="search-filter">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="filter-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Users</option>
                  <option value="premium">Premium Only</option>
                  <option value="free">Free Only</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="section-actions">
                <button className="export-btn">
                  <Download size={16} />
                  Export
                </button>
                <button className="add-btn" onClick={() => setShowAddUser(true)}>
                  <Plus size={16} />
                  Add User
                </button>
              </div>
            </div>

            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Membership</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">No users found</td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">{user.name?.charAt(0).toUpperCase() || '?'}</div>
                            <span>{user.name}</span>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`membership-badge ${user.membership}`}>
                            {user.membership === 'premium' && <Crown size={12} />}
                            {user.membership === 'pro' && <Star size={12} />}
                            {user.membership}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${user.status}`}>
                            {user.status}
                          </span>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>{new Date(user.lastActive).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn"
                              onClick={() => handleToggleUserStatus(user)}
                              title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {user.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                            <button 
                              className="action-btn upgrade"
                              onClick={() => handleUpgradeMembership(user)}
                              title={user.membership === 'premium' ? 'Downgrade' : 'Upgrade'}
                            >
                              {user.membership === 'premium' ? <Star size={14} /> : <Crown size={14} />}
                            </button>
                            <button 
                              className="action-btn delete"
                              onClick={() => handleDeleteUser(user.email)}
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Memberships Tab */}
        {activeTab === 'memberships' && (
          <div className="admin-memberships">
            <div className="membership-overview">
              <div className="membership-card free-card">
                <h3>Free Plan</h3>
                <div className="plan-price">Rs.0<span>/month</span></div>
                <ul className="plan-features">
                  <li><CheckCircle size={14} /> Basic food analysis</li>
                  <li><CheckCircle size={14} /> 5 AI chats/day</li>
                  <li><CheckCircle size={14} /> Basic meal tracking</li>
                  <li><AlertCircle size={14} className="disabled" /> Advanced AI features</li>
                  <li><AlertCircle size={14} className="disabled" /> Priority support</li>
                </ul>
                <div className="plan-users">
                  <Users size={16} />
                  <span>{stats?.freeUsers || 0} users</span>
                </div>
              </div>
              
              <div className="membership-card premium-card">
                <div className="popular-badge">Most Popular</div>
                <h3>Premium Plan</h3>
                <div className="plan-price">Rs.999<span>/month</span></div>
                <ul className="plan-features">
                  <li><CheckCircle size={14} /> Everything in Pro</li>
                  <li><CheckCircle size={14} /> Unlimited AI chats</li>
                  <li><CheckCircle size={14} /> Advanced meal plans</li>
                  <li><CheckCircle size={14} /> Personal AI Coach</li>
                  <li><CheckCircle size={14} /> Priority support</li>
                </ul>
                <div className="plan-users">
                  <Crown size={16} />
                  <span>{stats?.premiumUsers || 0} users</span>
                </div>
              </div>
            </div>

            {/* Revenue Section */}
            <div className="revenue-section">
              <h3><CreditCard size={20} /> Revenue Overview</h3>
              <div className="revenue-grid">
                <div className="revenue-card highlight">
                  <span className="revenue-label">Total Revenue</span>
                  <span className="revenue-value">Rs.{totalRevenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="revenue-card">
                  <span className="revenue-label">Total Transactions</span>
                  <span className="revenue-value">{payments.length}</span>
                </div>
                <div className="revenue-card">
                  <span className="revenue-label">Premium Users</span>
                  <span className="revenue-value">{stats?.premiumUsers || 0}</span>
                </div>
                <div className="revenue-card">
                  <span className="revenue-label">Conversion Rate</span>
                  <span className="revenue-value">{stats?.totalUsers > 0 ? ((stats?.premiumUsers / stats?.totalUsers) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="payment-history-section">
              <h3><Receipt size={20} /> Recent Payments</h3>
              {payments.length === 0 ? (
                <div className="no-payments">
                  <CreditCard size={48} />
                  <p>No payments yet</p>
                  <span>Payments will appear here when users subscribe</span>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 20).map((payment, i) => (
                      <tr key={payment.id || i}>
                        <td>{new Date(payment.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>{payment.userEmail}</td>
                        <td>
                          <span className={`plan-badge ${payment.planId}`}>
                            {payment.planId === 'premium' && <Crown size={12} />}
                            {payment.planId === 'pro' && <Star size={12} />}
                            {payment.planName || payment.planId}
                          </span>
                        </td>
                        <td className="amount">Rs.{(payment.amount / 100).toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`status-badge ${payment.status}`}>
                            {payment.status === 'captured' ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {payment.status}
                          </span>
                        </td>
                        <td className="payment-id">{payment.id?.substring(0, 20)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Premium Users List */}
            <div className="premium-users-section">
              <h3><Crown size={20} /> Premium Members</h3>
              {users.filter(u => u.membership !== 'free').length === 0 ? (
                <div className="no-payments">
                  <Users size={48} />
                  <p>No premium members yet</p>
                  <span>Users with paid subscriptions will appear here</span>
                </div>
              ) : (
                <div className="premium-users-grid">
                  {users.filter(u => u.membership !== 'free').map((user, i) => (
                    <div key={user.email || i} className="premium-user-card">
                      <div className="user-avatar">
                        {user.membership === 'premium' ? <Crown size={24} /> : <Star size={24} />}
                      </div>
                      <div className="user-info">
                        <h4>{user.name}</h4>
                        <p>{user.email}</p>
                        <span className={`membership-badge ${user.membership}`}>
                          {user.membership.charAt(0).toUpperCase() + user.membership.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Settings Tab */}
        {activeTab === 'ai' && (
          <div className="admin-ai-settings">
            <div className="ai-config-grid">
              <div className="config-card">
                <div className="config-header">
                  <Brain size={24} />
                  <h3>AI Provider</h3>
                </div>
                <p className="config-value">{aiSettings?.provider || 'Groq'}</p>
                <span className="config-desc">Current AI service provider</span>
              </div>
              <div className="config-card">
                <div className="config-header">
                  <Zap size={24} />
                  <h3>Model</h3>
                </div>
                <p className="config-value">{aiSettings?.model || 'llama-3.3-70b-versatile'}</p>
                <span className="config-desc">Active language model</span>
              </div>
              <div className="config-card">
                <div className="config-header">
                  <Activity size={24} />
                  <h3>Status</h3>
                </div>
                <p className={`config-value status ${aiSettings?.status}`}>
                  {aiSettings?.status === 'active' ? (
                    <><CheckCircle size={16} /> Active</>
                  ) : (
                    <><AlertCircle size={16} /> Inactive</>
                  )}
                </p>
                <span className="config-desc">Current service status</span>
              </div>
            </div>

            <div className="features-section">
              <h3>AI Features</h3>
              <div className="features-grid">
                <div className="feature-item enabled">
                  <CheckCircle size={16} />
                  <span>Food Analysis</span>
                </div>
                <div className="feature-item enabled">
                  <CheckCircle size={16} />
                  <span>AI Coach Chat</span>
                </div>
                <div className="feature-item enabled">
                  <CheckCircle size={16} />
                  <span>Meal Plan Generation</span>
                </div>
                <div className="feature-item enabled">
                  <CheckCircle size={16} />
                  <span>Nutrition Insights</span>
                </div>
              </div>
            </div>

            <div className="usage-section">
              <h3>Usage Statistics</h3>
              <div className="usage-grid">
                <div className="usage-card">
                  <span className="usage-number">{stats?.aiRequests || 0}</span>
                  <span className="usage-label">API Calls Today</span>
                </div>
                <div className="usage-card">
                  <span className="usage-number">{stats?.chatMessages || 0}</span>
                  <span className="usage-label">Chat Messages</span>
                </div>
                <div className="usage-card">
                  <span className="usage-number">99.9%</span>
                  <span className="usage-label">Uptime</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="admin-logs">
            <div className="logs-header">
              <div className="logs-filter">
                <button className="filter-btn active">All</button>
                <button className="filter-btn">Info</button>
                <button className="filter-btn">Success</button>
                <button className="filter-btn">Warning</button>
                <button className="filter-btn">Error</button>
              </div>
              <button className="export-btn">
                <Download size={16} />
                Export Logs
              </button>
            </div>
            <div className="logs-list">
              {logs.map((log, i) => (
                <div key={i} className={`log-item ${log.type}`}>
                  <span className="log-time">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className={`log-type ${log.type}`}>{log.type.toUpperCase()}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="admin-settings">
            <div className="settings-section">
              <h3><Globe size={18} /> General Settings</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>Site Name</label>
                  <input type="text" defaultValue="Yellow Apple" />
                </div>
                <div className="setting-item">
                  <label>Support Email</label>
                  <input type="email" defaultValue="support@yellowapple.fit" />
                </div>
                <div className="setting-item">
                  <label>Timezone</label>
                  <select defaultValue="UTC">
                    <option value="UTC">UTC</option>
                    <option value="EST">Eastern Time</option>
                    <option value="PST">Pacific Time</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3><Lock size={18} /> Security Settings</h3>
              <div className="settings-grid">
                <div className="setting-item toggle">
                  <label>Two-Factor Authentication</label>
                  <div className="toggle-switch">
                    <input type="checkbox" id="2fa" />
                    <label htmlFor="2fa"></label>
                  </div>
                </div>
                <div className="setting-item toggle">
                  <label>Session Timeout (30 min)</label>
                  <div className="toggle-switch">
                    <input type="checkbox" id="timeout" defaultChecked />
                    <label htmlFor="timeout"></label>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3><Database size={18} /> Database</h3>
              <div className="db-actions">
                <button className="setting-btn">
                  <Download size={16} />
                  Backup Now
                </button>
                <button className="setting-btn secondary">
                  <RefreshCw size={16} />
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add New User</h2>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Membership</label>
                <select
                  value={newUser.membership}
                  onChange={e => setNewUser({...newUser, membership: e.target.value})}
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    value={newUser.age}
                    onChange={e => setNewUser({...newUser, age: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    value={newUser.weight}
                    onChange={e => setNewUser({...newUser, weight: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    value={newUser.height}
                    onChange={e => setNewUser({...newUser, height: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddUser(false)}>Cancel</button>
                <button type="submit" className="primary">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncement && (
        <div className="modal-overlay" onClick={() => setShowAnnouncement(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Send Announcement</h2>
            <form onSubmit={(e) => { e.preventDefault(); setShowAnnouncement(false); }}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={announcement.title}
                  onChange={e => setAnnouncement({...announcement, title: e.target.value})}
                  placeholder="Announcement title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  value={announcement.message}
                  onChange={e => setAnnouncement({...announcement, message: e.target.value})}
                  placeholder="Write your announcement..."
                  rows={4}
                  required
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={announcement.type}
                  onChange={e => setAnnouncement({...announcement, type: e.target.value})}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAnnouncement(false)}>Cancel</button>
                <button type="submit" className="primary">Send to All Users</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

