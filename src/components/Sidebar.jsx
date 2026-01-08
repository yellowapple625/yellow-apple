import { Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { 
  Home, Utensils, UtensilsCrossed, Sparkles, 
  Calculator, Footprints, Apple, User, ChevronDown, ChevronLeft, ChevronRight, X, Save,
  Crown, StickyNote, BarChart3, LogOut, Menu
} from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { profile, updateProfile, isProfileComplete } = useUserProfile();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tempProfile, setTempProfile] = useState(profile);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('ya_sidebar_collapsed');
    return saved === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
        setEditMode(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync temp profile when profile changes
  useEffect(() => {
    setTempProfile(profile);
  }, [profile]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('ya_client_token');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  const handleSaveProfile = () => {
    updateProfile(tempProfile);
    setEditMode(false);
  };

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('ya_sidebar_collapsed', newState.toString());
  };

  const navItems = [
    { path: '/home', label: 'Dashboard', icon: Home, exact: true },
    { path: '/home/bmr', label: 'Calorie Calculator', icon: Calculator },
    { path: '/home/meal-plans', label: 'Meal Plans', icon: UtensilsCrossed },
    { path: '/home/food-analyzer', label: 'Food Analyzer', icon: Utensils },
    { path: '/home/daily-tracker', label: 'Daily Tracker', icon: Apple },
    { path: '/home/activity', label: 'Fitness & Workouts', icon: Footprints },
    { path: '/home/reports', label: 'Reports & Analysis', icon: BarChart3 },
    { path: '/home/ai-coach', label: 'AI Coach', icon: Sparkles },
    { path: '/home/notes', label: 'My Notes', icon: StickyNote },
    { path: '/home/subscription', label: 'Subscription', icon: Crown },
  ];

  const isActive = (item) => {
    if (item.exact) {
      return currentPath === item.path;
    }
    return currentPath.startsWith(item.path);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={24} />
        </button>
        <h1 className="mobile-logo">
          <Apple size={24} fill="#fbbf24" color="#fbbf24" />
          Yellow Apple
        </h1>
        <div className="mobile-profile-btn" onClick={() => setMobileMenuOpen(true)}>
          <User size={20} />
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <nav className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>
          <X size={24} />
        </button>
        
        <button className="sidebar-toggle" onClick={toggleSidebar} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div className="sidebar-header">
          <h1><Apple size={collapsed ? 28 : 36} fill="#fbbf24" color="#fbbf24" className="apple-logo" /> {!collapsed && 'Yellow Apple'}</h1>
        </div>

        {/* Profile Section */}
        {!collapsed && (
        <div className="profile-section" ref={menuRef}>
          <button 
            className={`profile-trigger ${showProfileMenu ? 'open' : ''} ${!isProfileComplete ? 'incomplete' : ''}`}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="profile-avatar">
              <User size={18} />
            </div>
            <div className="profile-info">
              <span className="profile-name">{profile.name || 'Set up profile'}</span>
              {isProfileComplete && (
                <span className="profile-stats">{profile.weight}kg • {profile.height}cm</span>
            )}
          </div>
          <ChevronDown size={16} className={`chevron ${showProfileMenu ? 'rotated' : ''}`} />
        </button>

        {showProfileMenu && (
          <div className="profile-menu">
            <div className="profile-menu-header">
              <h4>My Profile</h4>
              {!editMode ? (
                <button className="edit-profile-btn" onClick={() => setEditMode(true)}>
                  Edit
                </button>
              ) : (
                <button className="close-profile-btn" onClick={() => { setEditMode(false); setTempProfile(profile); }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {editMode ? (
              <div className="profile-edit-form">
                <div className="profile-field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={tempProfile.name}
                    onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                    placeholder="Your name"
                  />
                </div>
                <div className="profile-field">
                  <label>Age</label>
                  <input
                    type="number"
                    value={tempProfile.age}
                    onChange={(e) => setTempProfile({ ...tempProfile, age: e.target.value })}
                    placeholder="Years"
                    min="10"
                    max="120"
                  />
                </div>
                <div className="profile-field">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    value={tempProfile.height}
                    onChange={(e) => setTempProfile({ ...tempProfile, height: e.target.value })}
                    placeholder="cm"
                    min="100"
                    max="250"
                  />
                </div>
                <div className="profile-field">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    value={tempProfile.weight}
                    onChange={(e) => setTempProfile({ ...tempProfile, weight: e.target.value })}
                    placeholder="kg"
                    min="30"
                    max="300"
                  />
                </div>
                <button className="save-profile-btn" onClick={handleSaveProfile}>
                  <Save size={14} />
                  Save Profile
                </button>
              </div>
            ) : (
              <div className="profile-display">
                {isProfileComplete ? (
                  <>
                    <div className="profile-stat-row">
                      <span className="stat-label">Name</span>
                      <span className="stat-value">{profile.name}</span>
                    </div>
                    <div className="profile-stat-row">
                      <span className="stat-label">Age</span>
                      <span className="stat-value">{profile.age} years</span>
                    </div>
                    <div className="profile-stat-row">
                      <span className="stat-label">Height</span>
                      <span className="stat-value">{profile.height} cm</span>
                    </div>
                    <div className="profile-stat-row">
                      <span className="stat-label">Weight</span>
                      <span className="stat-value">{profile.weight} kg</span>
                    </div>
                  </>
                ) : (
                  <div className="profile-empty">
                    <p>Complete your profile to get personalized recommendations</p>
                    <button className="setup-profile-btn" onClick={() => setEditMode(true)}>
                      Set Up Profile
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}
      
      <div className="nav-menu">
        {navItems.map((item) => (
          <Link 
            key={item.path}
            to={item.path} 
            className={`nav-link ${isActive(item) ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <item.icon size={16} />
            {!collapsed && item.label}
          </Link>
        ))}
      </div>
      
      <button onClick={handleLogout} className="logout-btn" title={collapsed ? 'Sign Out' : ''}>
        <LogOut size={16} />
        {!collapsed && 'Sign Out'}
      </button>
    </nav>
    </>
  );
}
