import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Footprints, RefreshCw, Flame, TrendingUp, Link2, Dumbbell, Activity, MapPin, Clock, AlertCircle, Heart, Plus, Trash2, Target, Calculator, Calendar, Moon, Zap, BarChart3 } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';

export default function FitnessPage() {
  const { profile, isProfileComplete } = useUserProfile();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [steps, setSteps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState('');
  const [activityPeriod, setActivityPeriod] = useState('day');

  // Workout data from database
  const [workoutLog, setWorkoutLog] = useState([]);
  const [totalBurned, setTotalBurned] = useState(0);
  const [periodData, setPeriodData] = useState(null);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);

  // Health data from Google Fit
  const [healthData, setHealthData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Manual activity input state
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualActivity, setManualActivity] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualDuration, setManualDuration] = useState('');

  const DAILY_STEP_GOAL = profile?.step_goal || 10000;

  // Get auth token
  const getAuthToken = () => localStorage.getItem('ya_client_token');

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
    fetchWorkoutData();
  }, []);

  // Refetch when period changes
  useEffect(() => {
    fetchWorkoutData();
  }, [activityPeriod]);

  // Refetch steps when period changes or when connected
  useEffect(() => {
    if (connected) {
      fetchStepsForPeriod();
      fetchHealthData();
      fetchTrendsData();
    }
  }, [connected, activityPeriod]);

  // Fetch steps based on period
  const fetchStepsForPeriod = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/google-fit/steps?period=${activityPeriod}`);
      const data = await response.json();
      
      if (data.error) {
        if (data.error.includes('Not connected')) {
          setConnected(false);
        }
        setError(data.error);
      } else {
        setSteps(data.steps);
      }
    } catch (err) {
      setError('Failed to fetch fitness data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch extended health data from Google Fit
  const fetchHealthData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/google-fit/health`);
      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error('Error fetching health data:', err);
    }
  };

  // Fetch weekly trends
  const fetchTrendsData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/google-fit/trends`);
      if (response.ok) {
        const data = await response.json();
        setTrendsData(data);
      }
    } catch (err) {
      console.error('Error fetching trends:', err);
    }
  };

  // Fetch workout data from database
  const fetchWorkoutData = async () => {
    const token = getAuthToken();
    if (!token) return;
    
    setWorkoutsLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/tracking/workouts/period?period=${activityPeriod}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPeriodData(data);
        setWorkoutLog(data.workouts || []);
        setTotalBurned(data.totals?.calories_burned || 0);
      }
    } catch (err) {
      console.error('Error fetching workout data:', err);
    } finally {
      setWorkoutsLoading(false);
    }
  };

  // Add manual activity to database
  const addManualActivity = async () => {
    if (!manualActivity.trim() || !manualCalories) return;

    const token = getAuthToken();
    if (!token) {
      setError('Please login to save workouts');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/tracking/workouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exercise_name: manualActivity,
          exercise_type: 'manual',
          duration_minutes: parseInt(manualDuration) || null,
          calories_burned: parseInt(manualCalories) || 0,
          source: 'manual'
        })
      });

      if (response.ok) {
        // Refresh workout data
        fetchWorkoutData();
        
        // Reset form
        setManualActivity('');
        setManualCalories('');
        setManualDuration('');
        setShowManualAdd(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add activity');
      }
    } catch (err) {
      console.error('Error adding activity:', err);
      setError('Failed to add activity');
    }
  };

  // Remove workout from database
  const removeWorkout = async (id) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/tracking/workouts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchWorkoutData();
      }
    } catch (err) {
      console.error('Error removing workout:', err);
    }
  };

  const checkConnectionStatus = async () => {
    setCheckingStatus(true);
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('connected') === '1') {
        window.history.replaceState({}, '', '/home/activity');
      }

      const response = await fetch(`${BACKEND_URL}/api/google-fit/status`);
      const data = await response.json();
      
      if (data.connected) {
        setConnected(true);
        fetchSteps();
      } else {
        setConnected(false);
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const connectGoogleFit = () => {
    window.location.href = `${BACKEND_URL}/api/google-fit/auth`;
  };

  const fetchSteps = () => {
    fetchStepsForPeriod();
  };

  const calculateCaloriesBurned = (stepCount) => {
    return Math.round(stepCount * 0.04);
  };

  const getProgressPercentage = () => {
    if (!steps) return 0;
    const periodMultiplier = activityPeriod === 'week' ? 7 : activityPeriod === 'month' ? 30 : 1;
    return Math.min((steps / (DAILY_STEP_GOAL * periodMultiplier)) * 100, 100);
  };

  // Get period-specific totals from data
  const getPeriodTotals = () => {
    if (periodData?.totals) {
      return periodData.totals;
    }
    return {
      calories_burned: totalBurned || 0,
      workouts_count: workoutLog.length || 0,
      duration_minutes: workoutLog.reduce((sum, w) => sum + (w.duration_minutes || 0), 0),
      steps: 0,
      active_days: 0
    };
  };

  const totals = getPeriodTotals() || {
    calories_burned: 0,
    workouts_count: 0,
    duration_minutes: 0,
    steps: 0,
    active_days: 0
  };

  // Format workout date
  const formatWorkoutDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="app-container fitness-page">
      <Sidebar />
      
      <main className="main-content">
        <div className="page-header-with-badge">
          <div>
            <h2>
              <Activity className="header-icon" size={28} />
              Fitness & Activity
            </h2>
            <p className="subtitle">Track your daily activity and calories burned</p>
          </div>
          <div className="ai-model-badge google-fit-badge">
            <span>Google Fit</span>
          </div>
        </div>

        {/* Google Fit Integration Section - Now First */}
        <div className="google-fit-section">
          <div className="section-header-row">
            <h3 className="section-title">
              <Footprints size={20} />
              My Activity
            </h3>
            <div className="period-toggle">
              <button 
                className={`period-btn ${activityPeriod === 'day' ? 'active' : ''}`}
                onClick={() => setActivityPeriod('day')}
              >
                Day
              </button>
              <button 
                className={`period-btn ${activityPeriod === 'week' ? 'active' : ''}`}
                onClick={() => setActivityPeriod('week')}
              >
                Week
              </button>
              <button 
                className={`period-btn ${activityPeriod === 'month' ? 'active' : ''}`}
                onClick={() => setActivityPeriod('month')}
              >
                Month
              </button>
            </div>
          </div>
          
          <div className="fitness-grid">
            {/* Connection Card */}
            <div className="fitness-card connect-card">
              <h3><Link2 size={18} /> Google Fit Connection</h3>
              
              {checkingStatus ? (
                <div className="connect-section">
                  <p>Checking connection status...</p>
                </div>
              ) : !connected ? (
                <div className="connect-section">
                  <p>Connect your Google Fit account to sync your fitness data</p>
                  <button onClick={connectGoogleFit} className="connect-btn">
                    <Link2 size={16} />
                    Connect Google Fit
                  </button>
                </div>
              ) : (
                <div className="connected-section">
                  <span className="status-badge connected">Connected</span>
                  <button onClick={fetchSteps} className="refresh-btn" disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'spinning' : ''} />
                    {loading ? 'Loading...' : 'Refresh Data'}
                  </button>
                </div>
              )}
              
              {error && <p className="error-text">{error}</p>}
            </div>

            {/* Steps Card */}
            <div className="fitness-card steps-card">
              <h3><Footprints size={18} /> {activityPeriod === 'day' ? "Today's" : activityPeriod === 'week' ? "This Week's" : "This Month's"} Steps</h3>
              
              {steps !== null ? (
                <>
                  <div className="steps-display">
                    <span className="steps-number">{(totals.steps || steps).toLocaleString()}</span>
                    <span className="steps-goal">/ {(DAILY_STEP_GOAL * (activityPeriod === 'week' ? 7 : activityPeriod === 'month' ? 30 : 1)).toLocaleString()} goal</span>
                  </div>
                  
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                  <p className="progress-text">{Math.round(getProgressPercentage())}% of {activityPeriod}ly goal</p>
                </>
              ) : (
                <p className="placeholder-text">
                  {connected ? 'Click refresh to load steps' : 'Connect Google Fit to see steps'}
                </p>
              )}
            </div>

            {/* Calories Card */}
            <div className="fitness-card calories-card">
              <h3><Flame size={18} /> Calories from Steps</h3>
              
              {steps !== null ? (
                <div className="calories-display">
                  <span className="calories-number">{calculateCaloriesBurned(totals.steps || steps)}</span>
                  <span className="calories-unit">kcal</span>
                </div>
              ) : (
                <p className="placeholder-text">
                  {connected ? 'Click refresh to calculate' : 'Connect Google Fit first'}
                </p>
              )}
              
              <p className="calories-info">Estimated based on step count</p>
            </div>

            {/* Stats Summary */}
            <div className="fitness-card summary-card">
              <h3><TrendingUp size={18} /> {activityPeriod === 'day' ? 'Daily' : activityPeriod === 'week' ? 'Weekly' : 'Monthly'} Summary</h3>
              
              <ul className="stats-list">
                <li>
                  <span><Footprints size={14} /> Steps</span>
                  <strong>{(totals.steps || steps || 0).toLocaleString()}</strong>
                </li>
                <li>
                  <span><MapPin size={14} /> Distance</span>
                  <strong>{((totals.steps || steps || 0) * 0.0008).toFixed(2)} km</strong>
                </li>
                <li>
                  <span><Flame size={14} /> Workout Calories</span>
                  <strong>{(totals.calories_burned || 0).toLocaleString()} kcal</strong>
                </li>
                <li>
                  <span><Clock size={14} /> Active Time</span>
                  <strong>{totals.duration_minutes || 0} min</strong>
                </li>
                <li>
                  <span><Dumbbell size={14} /> Workouts</span>
                  <strong>{totals.workouts_count || 0}</strong>
                </li>
                {activityPeriod !== 'day' && (
                  <li>
                    <span><Calendar size={14} /> Active Days</span>
                    <strong>{totals.active_days || 0}</strong>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Health Insights Section - New! */}
        {connected && (
          <div className="health-insights-section">
            <div className="section-header-row">
              <h3 className="section-title">
                <Heart size={20} />
                Health Insights
              </h3>
              <button 
                className="refresh-btn small" 
                onClick={() => { fetchHealthData(); fetchTrendsData(); }}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            <div className="health-grid">
              {/* Heart Rate Card */}
              <div className="health-card heart-rate-card">
                <div className="health-card-icon">
                  <Heart size={24} />
                </div>
                <div className="health-card-content">
                  <span className="health-label">Heart Rate</span>
                  {healthData?.heartRate ? (
                    <>
                      <span className="health-value">{healthData.heartRate.avg}</span>
                      <span className="health-unit">bpm avg</span>
                      <span className="health-range">
                        {healthData.heartRate.min} - {healthData.heartRate.max} bpm
                      </span>
                    </>
                  ) : (
                    <span className="health-no-data">No data today</span>
                  )}
                </div>
              </div>

              {/* Heart Points Card */}
              <div className="health-card heart-points-card">
                <div className="health-card-icon">
                  <Zap size={24} />
                </div>
                <div className="health-card-content">
                  <span className="health-label">Heart Points</span>
                  {healthData?.heartPoints != null && healthData.heartPoints !== undefined ? (
                    <>
                      <span className="health-value">{healthData.heartPoints}</span>
                      <span className="health-unit">points</span>
                      <span className="health-range">Goal: 150/week</span>
                    </>
                  ) : (
                    <span className="health-no-data">No data today</span>
                  )}
                </div>
              </div>

              {/* Sleep Card */}
              <div className="health-card sleep-card">
                <div className="health-card-icon">
                  <Moon size={24} />
                </div>
                <div className="health-card-content">
                  <span className="health-label">Sleep (Last Night)</span>
                  {healthData?.sleep ? (
                    <>
                      <span className="health-value">{healthData.sleep.duration || 'N/A'}</span>
                      {healthData.sleep.quality && (
                        <span className={`health-quality ${(healthData.sleep.quality || '').toLowerCase()}`}>
                          {healthData.sleep.quality}
                        </span>
                      )}
                      <span className="health-range">
                        {healthData.sleep.bedTime || '?'} → {healthData.sleep.wakeTime || '?'}
                      </span>
                    </>
                  ) : (
                    <span className="health-no-data">No sleep data</span>
                  )}
                </div>
              </div>

              {/* Move Minutes Card */}
              <div className="health-card move-card">
                <div className="health-card-icon">
                  <Clock size={24} />
                </div>
                <div className="health-card-content">
                  <span className="health-label">Move Minutes</span>
                  {healthData?.moveMinutes != null && healthData.moveMinutes !== undefined ? (
                    <>
                      <span className="health-value">{healthData.moveMinutes}</span>
                      <span className="health-unit">min</span>
                      <span className="health-range">Active time today</span>
                    </>
                  ) : (
                    <span className="health-no-data">No data today</span>
                  )}
                </div>
              </div>

            </div>

            {/* Weekly Trends */}
            {trendsData && trendsData.averages && trendsData.totals && trendsData.daily && (
              <div className="trends-section">
                <h4><BarChart3 size={18} /> 7-Day Trends</h4>
                <div className="trends-grid">
                  <div className="trend-stat">
                    <span className="trend-label">Avg Steps</span>
                    <span className="trend-value">{(trendsData.averages.steps || 0).toLocaleString()}</span>
                  </div>
                  <div className="trend-stat">
                    <span className="trend-label">Avg Calories</span>
                    <span className="trend-value">{(trendsData.averages.calories || 0).toLocaleString()}</span>
                  </div>
                  <div className="trend-stat">
                    <span className="trend-label">Total Distance</span>
                    <span className="trend-value">{trendsData.totals.distance || 0} km</span>
                  </div>
                  <div className="trend-stat">
                    <span className="trend-label">Active Minutes</span>
                    <span className="trend-value">{trendsData.totals.activeMinutes || 0}</span>
                  </div>
                </div>
                
                <div className="daily-breakdown">
                  {(trendsData.daily || []).map((day, idx) => (
                    <div key={idx} className="day-bar">
                      <div className="day-label">{day.day}</div>
                      <div className="day-progress">
                        <div 
                          className="day-fill" 
                          style={{ height: `${Math.min(((day.steps || 0) / DAILY_STEP_GOAL) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="day-steps">{((day.steps || 0) / 1000).toFixed(1)}k</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Today's Workout Log Cards - Synced with Calorie Calculator */}
        <div className="workout-log-section">
          <div className="section-header-row">
            <h3 className="section-title">
              <Target size={20} />
              {activityPeriod === 'day' ? "Today's" : activityPeriod === 'week' ? "This Week's" : "This Month's"} Workout Log
            </h3>
            <div className="log-actions">
              <button 
                className="add-manual-btn"
                onClick={() => setShowManualAdd(!showManualAdd)}
              >
                <Plus size={16} />
                Add Activity
              </button>
              <button 
                className="go-calculator-btn"
                onClick={() => navigate('/home/bmr')}
              >
                <Calculator size={16} />
                Calorie Calculator
              </button>
            </div>
          </div>

          {/* Manual Add Form */}
          {showManualAdd && (
            <div className="manual-add-form">
              <div className="manual-inputs">
                <input
                  type="text"
                  value={manualActivity}
                  onChange={(e) => setManualActivity(e.target.value)}
                  placeholder="Activity name (e.g., Morning Jog)"
                  className="manual-input"
                />
                <input
                  type="number"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  placeholder="Calories"
                  className="manual-input small"
                  min="1"
                />
                <input
                  type="number"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  placeholder="Duration (min)"
                  className="manual-input small"
                  min="1"
                />
                <button 
                  className="add-btn"
                  onClick={addManualActivity}
                  disabled={!manualActivity.trim() || !manualCalories}
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="workout-log-grid">
            {/* Total Calories Burned Card */}
            <div className="workout-log-card total-card">
              <div className="card-icon">
                <Flame size={28} />
              </div>
              <div className="card-content">
                <span className="card-label">Total Burned {activityPeriod === 'day' ? 'Today' : activityPeriod === 'week' ? 'This Week' : 'This Month'}</span>
                <span className="card-value">{totalBurned.toLocaleString()}</span>
                <span className="card-unit">calories</span>
              </div>
              <div className="card-footer">
                {totals.workouts_count} {totals.workouts_count === 1 ? 'activity' : 'activities'} logged
                {activityPeriod !== 'day' && totals.active_days > 0 && ` across ${totals.active_days} days`}
              </div>
            </div>

            {/* Recent Activities Card */}
            <div className="workout-log-card activities-card">
              <div className="card-header">
                <Activity size={20} />
                <h4>{activityPeriod === 'day' ? 'Recent' : 'All'} Activities</h4>
                {workoutsLoading && <RefreshCw size={16} className="spinning" />}
              </div>
              {workoutLog.length > 0 ? (
                <div className="activities-list">
                  {workoutLog.slice(0, activityPeriod === 'day' ? 5 : 10).map(workout => (
                    <div key={workout.id} className="activity-item">
                      <div className="activity-icon">
                        {workout.exercise_type === 'gym' ? <Dumbbell size={16} /> : 
                         workout.exercise_type === 'cardio' ? <Heart size={16} /> : 
                         workout.exercise_type === 'manual' ? <Plus size={16} /> :
                         <Activity size={16} />}
                      </div>
                      <div className="activity-details">
                        <span className="activity-name">{workout.exercise_name || workout.exercise}</span>
                        <span className="activity-meta">
                          {activityPeriod !== 'day' && <span className="activity-date">{formatWorkoutDate(workout.date)} • </span>}
                          {workout.duration_minutes && `${workout.duration_minutes}min`}
                          {workout.sets && ` ${workout.sets}x${workout.reps}`}
                          {workout.intensity && ` • ${workout.intensity}`}
                        </span>
                      </div>
                      <div className="activity-calories">
                        <span>{workout.calories_burned || workout.calories}</span>
                        <span className="unit">cal</span>
                      </div>
                      <button 
                        className="remove-activity-btn"
                        onClick={() => removeWorkout(workout.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-activities">
                  <Dumbbell size={32} />
                  <p>No activities logged {activityPeriod === 'day' ? 'yet' : `this ${activityPeriod}`}</p>
                  <span>Use the Calorie Calculator or add manually</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
