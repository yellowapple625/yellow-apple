import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  BarChart3, TrendingUp, TrendingDown, Target, Flame, Droplets, 
  Scale, Activity, Calendar, Award, AlertCircle, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Settings,
  Dumbbell, Utensils, Zap, Clock, ChevronRight, Plus, Edit3,
  Trash2, PieChart, Heart, Moon, Coffee, Apple, X, Save,
  Timer, Footprints, Brain, Eye, Ruler, Percent
} from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import './ReportStyles.css';
import { BACKEND_URL } from '../config';

// Storage keys
const WORKOUT_LOG_KEY = 'nutri_workout_log';
const FOOD_TRACKER_KEY = 'ya_food_tracker';
const HYDRATION_KEY = 'ya_hydration';
const GOALS_KEY = 'ya_user_goals';
const WEIGHT_HISTORY_KEY = 'ya_weight_history';
const CUSTOM_GOALS_KEY = 'ya_custom_goals';

// Predefined goal templates
const goalTemplates = {
  weight_loss: { name: 'Weight Loss', icon: TrendingDown, color: '#4ade80' },
  weight_gain: { name: 'Weight Gain', icon: TrendingUp, color: '#60a5fa' },
  maintain: { name: 'Maintain Weight', icon: Minus, color: '#d4a574' },
  muscle_gain: { name: 'Build Muscle', icon: Dumbbell, color: '#a855f7' },
  endurance: { name: 'Improve Endurance', icon: Heart, color: '#ef4444' },
  flexibility: { name: 'Flexibility', icon: Activity, color: '#14b8a6' },
  sleep: { name: 'Better Sleep', icon: Moon, color: '#6366f1' },
  hydration: { name: 'Hydration Goal', icon: Droplets, color: '#3b82f6' },
  nutrition: { name: 'Nutrition Balance', icon: Apple, color: '#22c55e' },
  custom: { name: 'Custom Goal', icon: Target, color: '#f59e0b' },
};

// Tracking metric options
const metricOptions = [
  { id: 'weight', label: 'Weight (kg)', icon: Scale, unit: 'kg' },
  { id: 'calories_burned', label: 'Calories Burned', icon: Flame, unit: 'kcal' },
  { id: 'calories_consumed', label: 'Calories Consumed', icon: Utensils, unit: 'kcal' },
  { id: 'calorie_deficit', label: 'Calorie Deficit', icon: Zap, unit: 'kcal' },
  { id: 'water_glasses', label: 'Water Intake', icon: Droplets, unit: 'glasses' },
  { id: 'workout_minutes', label: 'Workout Duration', icon: Timer, unit: 'min' },
  { id: 'workout_count', label: 'Workouts Count', icon: Dumbbell, unit: 'sessions' },
  { id: 'steps', label: 'Steps', icon: Footprints, unit: 'steps' },
  { id: 'protein', label: 'Protein Intake', icon: Dumbbell, unit: 'g' },
  { id: 'sleep_hours', label: 'Sleep Duration', icon: Moon, unit: 'hrs' },
  { id: 'body_fat', label: 'Body Fat %', icon: Percent, unit: '%' },
  { id: 'waist', label: 'Waist Size', icon: Ruler, unit: 'cm' },
  { id: 'custom_metric', label: 'Custom Metric', icon: Edit3, unit: '' },
];

export default function ReportPage() {
  const { profile, updateProfile } = useUserProfile();
  
  // Main goal state
  const [goals, setGoals] = useState({
    type: 'weight_loss',
    targetWeight: '',
    targetCalorieDeficit: 500,
    weeklyGoal: 0.5,
    startWeight: '',
    startDate: '',
  });
  
  // Custom goals state
  const [customGoals, setCustomGoals] = useState([]);
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [showCustomGoalModal, setShowCustomGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  
  // New custom goal form
  const [newGoal, setNewGoal] = useState({
    id: '',
    name: '',
    type: 'custom',
    metric: 'weight',
    customMetricName: '',
    customMetricUnit: '',
    targetValue: '',
    currentValue: '',
    startValue: '',
    direction: 'decrease',
    deadline: '',
    frequency: 'daily',
    notes: '',
    color: '#d4a574',
    trackingHistory: [],
  });
  
  // Tracking data
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [proteinConsumed, setProteinConsumed] = useState(0);
  const [waterTarget, setWaterTarget] = useState(8);
  const [waterConsumed, setWaterConsumed] = useState(0);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [workoutMinutes, setWorkoutMinutes] = useState(0);
  const [weightHistory, setWeightHistory] = useState([]);
  
  // Google Fit data
  const [googleFitSteps, setGoogleFitSteps] = useState({ day: 0, week: 0, month: 0 });
  const [googleFitConnected, setGoogleFitConnected] = useState(false);
  const [googleFitComparison, setGoogleFitComparison] = useState(null);
  
  // Analysis data
  const [weeklyAverage, setWeeklyAverage] = useState({
    caloriesIn: 0,
    caloriesOut: 0,
    water: 0,
    workouts: 0,
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAllData();
    fetchGoogleFitData();
  }, []);

  // Fetch Google Fit steps for all periods
  const fetchGoogleFitData = async () => {
    try {
      // Check connection status
      const statusRes = await fetch(`${BACKEND_URL}/api/google-fit/status`);
      const statusData = await statusRes.json();
      
      if (!statusData.connected) {
        setGoogleFitConnected(false);
        return;
      }
      
      setGoogleFitConnected(true);
      
      // Fetch steps for all periods and comparison data in parallel
      const [dayRes, weekRes, monthRes, comparisonRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/google-fit/steps?period=day`),
        fetch(`${BACKEND_URL}/api/google-fit/steps?period=week`),
        fetch(`${BACKEND_URL}/api/google-fit/steps?period=month`),
        fetch(`${BACKEND_URL}/api/google-fit/comparison`)
      ]);
      
      const [dayData, weekData, monthData, comparisonData] = await Promise.all([
        dayRes.json(),
        weekRes.json(),
        monthRes.json(),
        comparisonRes.json()
      ]);
      
      setGoogleFitSteps({
        day: dayData.steps || 0,
        week: weekData.steps || 0,
        month: monthData.steps || 0
      });
      
      if (!comparisonData.error) {
        setGoogleFitComparison(comparisonData);
      }
    } catch (err) {
      console.error('Failed to fetch Google Fit data:', err);
    }
  };

  const loadAllData = () => {
    setLoading(true);
    
    const savedGoals = localStorage.getItem(GOALS_KEY);
    if (savedGoals) setGoals(JSON.parse(savedGoals));
    
    const savedCustomGoals = localStorage.getItem(CUSTOM_GOALS_KEY);
    if (savedCustomGoals) setCustomGoals(JSON.parse(savedCustomGoals));
    
    const savedWeightHistory = localStorage.getItem(WEIGHT_HISTORY_KEY);
    if (savedWeightHistory) setWeightHistory(JSON.parse(savedWeightHistory));
    
    const workoutLog = localStorage.getItem(WORKOUT_LOG_KEY);
    if (workoutLog) {
      const parsed = JSON.parse(workoutLog);
      const today = new Date().toDateString();
      const todayWorkouts = parsed.filter(w => new Date(w.timestamp).toDateString() === today);
      setWorkoutCount(todayWorkouts.length);
      setCaloriesBurned(todayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0));
      setWorkoutMinutes(todayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0));
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekWorkouts = parsed.filter(w => new Date(w.timestamp) >= weekAgo);
      setWeeklyAverage(prev => ({
        ...prev,
        caloriesOut: Math.round(weekWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0) / 7),
        workouts: Math.round(weekWorkouts.length / 7 * 10) / 10,
      }));
    }
    
    const foodData = localStorage.getItem(FOOD_TRACKER_KEY);
    if (foodData) {
      const parsed = JSON.parse(foodData);
      const today = new Date().toDateString();
      if (parsed.date === today) {
        setCaloriesConsumed(parsed.caloriesConsumed || 0);
        setProteinConsumed(parsed.proteinConsumed || 0);
      }
    }
    
    const hydrationData = localStorage.getItem(HYDRATION_KEY);
    if (hydrationData) {
      const parsed = JSON.parse(hydrationData);
      const today = new Date().toDateString();
      setWaterTarget(parsed.target || 8);
      if (parsed.date === today) setWaterConsumed(parsed.consumed || 0);
    }
    
    setLoading(false);
  };

  const saveGoals = (newGoals) => {
    setGoals(newGoals);
    localStorage.setItem(GOALS_KEY, JSON.stringify(newGoals));
  };

  const saveCustomGoals = (goals) => {
    setCustomGoals(goals);
    localStorage.setItem(CUSTOM_GOALS_KEY, JSON.stringify(goals));
  };

  const saveCustomGoal = () => {
    const goalToSave = {
      ...newGoal,
      id: newGoal.id || Date.now().toString(),
      startValue: newGoal.startValue || newGoal.currentValue,
      createdAt: newGoal.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    let updated;
    if (editingGoal) {
      updated = customGoals.map(g => g.id === editingGoal.id ? goalToSave : g);
    } else {
      updated = [...customGoals, goalToSave];
    }
    
    saveCustomGoals(updated);
    setShowCustomGoalModal(false);
    setEditingGoal(null);
    resetNewGoal();
  };

  const deleteCustomGoal = (goalId) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      const updated = customGoals.filter(g => g.id !== goalId);
      saveCustomGoals(updated);
    }
  };

  const logGoalProgress = (goalId, value) => {
    const updated = customGoals.map(g => {
      if (g.id === goalId) {
        const entry = {
          value: parseFloat(value),
          date: new Date().toISOString(),
          dateString: new Date().toDateString(),
        };
        const history = [...(g.trackingHistory || []).filter(h => h.dateString !== entry.dateString), entry];
        history.sort((a, b) => new Date(a.date) - new Date(b.date));
        return { ...g, currentValue: value, trackingHistory: history };
      }
      return g;
    });
    saveCustomGoals(updated);
  };

  const resetNewGoal = () => {
    setNewGoal({
      id: '',
      name: '',
      type: 'custom',
      metric: 'weight',
      customMetricName: '',
      customMetricUnit: '',
      targetValue: '',
      currentValue: '',
      startValue: '',
      direction: 'decrease',
      deadline: '',
      frequency: 'daily',
      notes: '',
      color: '#d4a574',
      trackingHistory: [],
    });
  };

  const editGoal = (goal) => {
    setEditingGoal(goal);
    setNewGoal(goal);
    setShowCustomGoalModal(true);
  };

  const logWeight = (weight) => {
    const entry = {
      weight: parseFloat(weight),
      date: new Date().toISOString(),
      dateString: new Date().toDateString(),
    };
    
    const updated = [...weightHistory.filter(w => w.dateString !== entry.dateString), entry];
    updated.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    setWeightHistory(updated);
    localStorage.setItem(WEIGHT_HISTORY_KEY, JSON.stringify(updated));
    updateProfile({ weight });
  };

  // Calculate metrics
  const netCalories = caloriesConsumed - caloriesBurned;
  const waterProgress = waterTarget > 0 ? Math.round((waterConsumed / waterTarget) * 100) : 0;
  
  const currentWeight = parseFloat(profile.weight) || 0;
  const startWeight = parseFloat(goals.startWeight) || currentWeight;
  const targetWeight = parseFloat(goals.targetWeight) || currentWeight;
  const weightChange = currentWeight - startWeight;
  const weightGoalProgress = targetWeight !== startWeight 
    ? Math.round(((startWeight - currentWeight) / (startWeight - targetWeight)) * 100) 
    : 0;

  const weeklyWeightChange = goals.weeklyGoal || 0.5;
  const remainingWeight = Math.abs(targetWeight - currentWeight);
  const weeksToGoal = weeklyWeightChange > 0 ? Math.ceil(remainingWeight / weeklyWeightChange) : 0;

  const calorieStatus = goals.type === 'weight_loss' 
    ? netCalories <= -goals.targetCalorieDeficit 
    : goals.type === 'weight_gain' 
      ? netCalories >= goals.targetCalorieDeficit 
      : Math.abs(netCalories) < 200;

  const calculateGoalProgress = (goal) => {
    const current = parseFloat(goal.currentValue) || 0;
    const target = parseFloat(goal.targetValue) || 0;
    const start = parseFloat(goal.startValue) || current;
    
    if (target === start) return 0;
    
    if (goal.direction === 'increase') {
      return Math.min(100, Math.max(0, Math.round(((current - start) / (target - start)) * 100)));
    } else if (goal.direction === 'decrease') {
      return Math.min(100, Math.max(0, Math.round(((start - current) / (start - target)) * 100)));
    } else {
      const deviation = Math.abs(current - target);
      const tolerance = target * 0.05;
      return deviation <= tolerance ? 100 : Math.max(0, Math.round((1 - deviation / target) * 100));
    }
  };

  const getAutoTrackedValue = (metric) => {
    switch (metric) {
      case 'calories_burned': return caloriesBurned;
      case 'calories_consumed': return caloriesConsumed;
      case 'calorie_deficit': return caloriesBurned - caloriesConsumed;
      case 'water_glasses': return waterConsumed;
      case 'workout_minutes': return workoutMinutes;
      case 'workout_count': return workoutCount;
      case 'weight': return currentWeight;
      case 'protein': return proteinConsumed;
      case 'steps': return googleFitSteps.day;
      default: return null;
    }
  };

  // BMI calculation
  const heightM = (parseFloat(profile.height) || 170) / 100;
  const bmi = currentWeight > 0 ? (currentWeight / (heightM * heightM)).toFixed(1) : 0;
  const getBmiCategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#60a5fa' };
    if (bmi < 25) return { label: 'Normal', color: '#4ade80' };
    if (bmi < 30) return { label: 'Overweight', color: '#fbbf24' };
    return { label: 'Obese', color: '#ef4444' };
  };
  const bmiCategory = getBmiCategory(parseFloat(bmi));

  // Main Goal Setup Modal
  const GoalSetupModal = () => (
    <div className="modal-overlay" onClick={() => setShowGoalSetup(false)}>
      <div className="goal-setup-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Target size={20} /> Set Primary Goal</h3>
          <button className="close-btn" onClick={() => setShowGoalSetup(false)}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="goal-type-selector">
            <label>What's your primary goal?</label>
            <div className="goal-type-buttons">
              <button 
                className={`goal-type-btn ${goals.type === 'weight_loss' ? 'active' : ''}`}
                onClick={() => saveGoals({ ...goals, type: 'weight_loss' })}
              >
                <TrendingDown size={18} />
                Lose Weight
              </button>
              <button 
                className={`goal-type-btn ${goals.type === 'weight_gain' ? 'active' : ''}`}
                onClick={() => saveGoals({ ...goals, type: 'weight_gain' })}
              >
                <TrendingUp size={18} />
                Gain Weight
              </button>
              <button 
                className={`goal-type-btn ${goals.type === 'maintain' ? 'active' : ''}`}
                onClick={() => saveGoals({ ...goals, type: 'maintain' })}
              >
                <Minus size={18} />
                Maintain
              </button>
            </div>
          </div>

          {goals.type !== 'maintain' && (
            <>
              <div className="goal-input-group">
                <label>Starting Weight (kg)</label>
                <input
                  type="number"
                  value={goals.startWeight}
                  onChange={(e) => saveGoals({ ...goals, startWeight: e.target.value })}
                  placeholder={profile.weight || "Enter starting weight"}
                />
              </div>

              <div className="goal-input-group">
                <label>Target Weight (kg)</label>
                <input
                  type="number"
                  value={goals.targetWeight}
                  onChange={(e) => saveGoals({ ...goals, targetWeight: e.target.value })}
                  placeholder="Enter target weight"
                />
              </div>

              <div className="goal-input-group">
                <label>Weekly Goal (kg/week)</label>
                <input
                  type="number"
                  value={goals.weeklyGoal}
                  onChange={(e) => saveGoals({ ...goals, weeklyGoal: parseFloat(e.target.value) || 0.5 })}
                  placeholder="0.5"
                  step="0.1"
                  min="0.1"
                  max="2"
                />
                <span className="input-hint">Recommended: 0.25 - 1.0 kg per week</span>
              </div>

              <div className="goal-input-group">
                <label>Daily Calorie {goals.type === 'weight_loss' ? 'Deficit' : 'Surplus'}</label>
                <input
                  type="number"
                  value={goals.targetCalorieDeficit}
                  onChange={(e) => saveGoals({ ...goals, targetCalorieDeficit: parseInt(e.target.value) || 500 })}
                  placeholder="500"
                  step="50"
                  min="100"
                  max="1500"
                />
                <span className="input-hint">Recommended: 250 - 750 kcal for sustainable results</span>
              </div>

              <div className="goal-input-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={goals.startDate}
                  onChange={(e) => saveGoals({ ...goals, startDate: e.target.value })}
                />
              </div>
            </>
          )}

          <button className="save-goals-btn" onClick={() => setShowGoalSetup(false)}>
            Save Primary Goal
          </button>
        </div>
      </div>
    </div>
  );

  // Custom Goal Modal
  const CustomGoalModal = () => {
    const selectedMetric = metricOptions.find(m => m.id === newGoal.metric);
    
    return (
      <div className="modal-overlay" onClick={() => { setShowCustomGoalModal(false); setEditingGoal(null); resetNewGoal(); }}>
        <div className="custom-goal-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3><Plus size={20} /> {editingGoal ? 'Edit Goal' : 'Create Custom Goal'}</h3>
            <button className="close-btn" onClick={() => { setShowCustomGoalModal(false); setEditingGoal(null); resetNewGoal(); }}>×</button>
          </div>
          
          <div className="modal-content">
            <div className="goal-input-group">
              <label>Goal Name *</label>
              <input
                type="text"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                placeholder="e.g., Lose 5kg, Run 5K, Drink more water"
              />
            </div>

            <div className="goal-input-group">
              <label>Goal Category</label>
              <div className="goal-category-grid">
                {Object.entries(goalTemplates).map(([key, template]) => (
                  <button
                    key={key}
                    className={`category-chip ${newGoal.type === key ? 'active' : ''}`}
                    style={{ '--chip-color': template.color }}
                    onClick={() => setNewGoal({ ...newGoal, type: key, color: template.color })}
                  >
                    <template.icon size={14} />
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="goal-input-group">
              <label>What to Track *</label>
              <select
                value={newGoal.metric}
                onChange={(e) => setNewGoal({ ...newGoal, metric: e.target.value })}
                className="metric-select"
              >
                {metricOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {newGoal.metric === 'custom_metric' && (
              <div className="goal-input-row">
                <div className="goal-input-group">
                  <label>Metric Name</label>
                  <input
                    type="text"
                    value={newGoal.customMetricName}
                    onChange={(e) => setNewGoal({ ...newGoal, customMetricName: e.target.value })}
                    placeholder="e.g., Push-ups"
                  />
                </div>
                <div className="goal-input-group">
                  <label>Unit</label>
                  <input
                    type="text"
                    value={newGoal.customMetricUnit}
                    onChange={(e) => setNewGoal({ ...newGoal, customMetricUnit: e.target.value })}
                    placeholder="e.g., reps"
                  />
                </div>
              </div>
            )}

            <div className="goal-input-group">
              <label>Direction *</label>
              <div className="direction-buttons">
                <button
                  className={`direction-btn ${newGoal.direction === 'increase' ? 'active increase' : ''}`}
                  onClick={() => setNewGoal({ ...newGoal, direction: 'increase' })}
                >
                  <TrendingUp size={16} />
                  Increase
                </button>
                <button
                  className={`direction-btn ${newGoal.direction === 'decrease' ? 'active decrease' : ''}`}
                  onClick={() => setNewGoal({ ...newGoal, direction: 'decrease' })}
                >
                  <TrendingDown size={16} />
                  Decrease
                </button>
                <button
                  className={`direction-btn ${newGoal.direction === 'maintain' ? 'active maintain' : ''}`}
                  onClick={() => setNewGoal({ ...newGoal, direction: 'maintain' })}
                >
                  <Minus size={16} />
                  Maintain
                </button>
              </div>
            </div>

            <div className="goal-input-row">
              <div className="goal-input-group">
                <label>Start Value</label>
                <div className="value-input-wrapper">
                  <input
                    type="number"
                    value={newGoal.startValue}
                    onChange={(e) => setNewGoal({ ...newGoal, startValue: e.target.value })}
                    placeholder="0"
                  />
                  <span className="unit">{newGoal.metric === 'custom_metric' ? newGoal.customMetricUnit : selectedMetric?.unit}</span>
                </div>
              </div>
              <div className="goal-input-group">
                <label>Current Value</label>
                <div className="value-input-wrapper">
                  <input
                    type="number"
                    value={newGoal.currentValue}
                    onChange={(e) => setNewGoal({ ...newGoal, currentValue: e.target.value })}
                    placeholder="0"
                  />
                  <span className="unit">{newGoal.metric === 'custom_metric' ? newGoal.customMetricUnit : selectedMetric?.unit}</span>
                </div>
              </div>
              <div className="goal-input-group">
                <label>Target Value *</label>
                <div className="value-input-wrapper">
                  <input
                    type="number"
                    value={newGoal.targetValue}
                    onChange={(e) => setNewGoal({ ...newGoal, targetValue: e.target.value })}
                    placeholder="0"
                  />
                  <span className="unit">{newGoal.metric === 'custom_metric' ? newGoal.customMetricUnit : selectedMetric?.unit}</span>
                </div>
              </div>
            </div>

            <div className="goal-input-group">
              <label>Tracking Frequency</label>
              <div className="frequency-buttons">
                {['daily', 'weekly', 'monthly'].map(freq => (
                  <button
                    key={freq}
                    className={`frequency-btn ${newGoal.frequency === freq ? 'active' : ''}`}
                    onClick={() => setNewGoal({ ...newGoal, frequency: freq })}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="goal-input-group">
              <label>Target Deadline (optional)</label>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
              />
            </div>

            <div className="goal-input-group">
              <label>Goal Color</label>
              <div className="color-picker">
                {['#d4a574', '#4ade80', '#60a5fa', '#a855f7', '#ef4444', '#f59e0b', '#14b8a6', '#ec4899'].map(color => (
                  <button
                    key={color}
                    className={`color-btn ${newGoal.color === color ? 'active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setNewGoal({ ...newGoal, color })}
                  />
                ))}
              </div>
            </div>

            <div className="goal-input-group">
              <label>Notes (optional)</label>
              <textarea
                value={newGoal.notes}
                onChange={(e) => setNewGoal({ ...newGoal, notes: e.target.value })}
                placeholder="Add any notes or motivation..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => { setShowCustomGoalModal(false); setEditingGoal(null); resetNewGoal(); }}>
                Cancel
              </button>
              <button 
                className="save-goals-btn"
                onClick={saveCustomGoal}
                disabled={!newGoal.name || !newGoal.targetValue}
              >
                <Save size={16} />
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container report-page">
      <Sidebar />
      
      <main className="main-content">
        <div className="page-header-with-badge">
          <div>
            <h2>
              <BarChart3 className="header-icon" size={28} />
              Report & Analysis
            </h2>
            <p className="subtitle">Track your progress and achieve your health goals</p>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={loadAllData} title="Refresh Data">
              <RefreshCw size={16} />
            </button>
            <button className="add-goal-btn" onClick={() => setShowCustomGoalModal(true)}>
              <Plus size={16} />
              Add Goal
            </button>
            <button className="setup-goals-btn" onClick={() => setShowGoalSetup(true)}>
              <Settings size={16} />
              Primary Goal
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="report-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <PieChart size={16} />
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            <Target size={16} />
            My Goals ({customGoals.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            <BarChart3 size={16} />
            Analysis
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your progress...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                <div className="goal-overview-card">
                  <div className="goal-header">
                    <div className="goal-type-display">
                      {goals.type === 'weight_loss' && <TrendingDown size={24} className="goal-icon loss" />}
                      {goals.type === 'weight_gain' && <TrendingUp size={24} className="goal-icon gain" />}
                      {goals.type === 'maintain' && <Minus size={24} className="goal-icon maintain" />}
                      <div>
                        <h3>
                          {goals.type === 'weight_loss' && 'Weight Loss Goal'}
                          {goals.type === 'weight_gain' && 'Weight Gain Goal'}
                          {goals.type === 'maintain' && 'Maintain Weight'}
                        </h3>
                        {goals.targetWeight && goals.type !== 'maintain' && (
                          <p className="goal-target">Target: {goals.targetWeight} kg</p>
                        )}
                      </div>
                    </div>
                    {goals.targetWeight && goals.type !== 'maintain' && (
                      <div className="goal-eta">
                        <Clock size={16} />
                        <span>~{weeksToGoal} weeks to go</span>
                      </div>
                    )}
                  </div>

                  {goals.type !== 'maintain' && goals.targetWeight && (
                    <div className="weight-progress-section">
                      <div className="weight-progress-bar">
                        <div className="progress-labels">
                          <span className="start-label">{startWeight} kg</span>
                          <span className="current-label">{currentWeight} kg</span>
                          <span className="target-label">{targetWeight} kg</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, weightGoalProgress))}%` }}></div>
                          <div className="progress-marker" style={{ left: `${Math.min(100, Math.max(0, weightGoalProgress))}%` }}></div>
                        </div>
                      </div>
                      <div className="weight-change-info">
                        <span className={`weight-change ${weightChange < 0 ? 'loss' : weightChange > 0 ? 'gain' : ''}`}>
                          {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                        </span>
                        <span className="since-start">since start</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="quick-stats-row">
                  <div className="quick-stat-card calories-in">
                    <div className="stat-icon"><Utensils size={20} /></div>
                    <div className="stat-content">
                      <span className="stat-value">{caloriesConsumed}</span>
                      <span className="stat-label">Calories In</span>
                    </div>
                    <ArrowUpRight size={16} className="trend-icon up" />
                  </div>

                  <div className="quick-stat-card calories-out">
                    <div className="stat-icon"><Flame size={20} /></div>
                    <div className="stat-content">
                      <span className="stat-value">{caloriesBurned}</span>
                      <span className="stat-label">Calories Burned</span>
                    </div>
                    <ArrowDownRight size={16} className="trend-icon down" />
                  </div>

                  <div className={`quick-stat-card net-calories ${netCalories > 0 ? 'surplus' : 'deficit'}`}>
                    <div className="stat-icon"><Zap size={20} /></div>
                    <div className="stat-content">
                      <span className="stat-value">{netCalories > 0 ? '+' : ''}{netCalories}</span>
                      <span className="stat-label">Net Calories</span>
                    </div>
                    {calorieStatus ? <CheckCircle2 size={16} className="status-icon success" /> : <AlertCircle size={16} className="status-icon warning" />}
                  </div>

                  <div className="quick-stat-card steps-card">
                    <div className="stat-icon"><Footprints size={20} /></div>
                    <div className="stat-content">
                      <span className="stat-value">{googleFitSteps.day.toLocaleString()}</span>
                      <span className="stat-label">Steps Today</span>
                    </div>
                    {googleFitConnected ? (
                      <CheckCircle2 size={16} className="status-icon success" title="Google Fit Connected" />
                    ) : (
                      <AlertCircle size={16} className="status-icon warning" title="Google Fit Not Connected" />
                    )}
                  </div>

                  <div className="quick-stat-card workouts">
                    <div className="stat-icon"><Dumbbell size={20} /></div>
                    <div className="stat-content">
                      <span className="stat-value">{workoutCount}</span>
                      <span className="stat-label">Workouts Today</span>
                    </div>
                    <Activity size={16} className="trend-icon" />
                  </div>
                </div>

                <div className="analysis-grid">
                  <div className="analysis-card calorie-balance-card">
                    <div className="card-header">
                      <h4><Flame size={18} /> Calorie Balance</h4>
                      <span className={`status-badge ${calorieStatus ? 'on-track' : 'off-track'}`}>
                        {calorieStatus ? 'On Track' : 'Needs Attention'}
                      </span>
                    </div>
                    
                    <div className="calorie-breakdown">
                      <div className="breakdown-item consumed">
                        <div className="breakdown-bar">
                          <div className="bar-fill" style={{ width: '100%' }}></div>
                        </div>
                        <div className="breakdown-info">
                          <span className="breakdown-label">Consumed</span>
                          <span className="breakdown-value">{caloriesConsumed} kcal</span>
                        </div>
                      </div>
                      
                      <div className="breakdown-item burned">
                        <div className="breakdown-bar">
                          <div className="bar-fill" style={{ width: `${caloriesConsumed > 0 ? Math.min(100, (caloriesBurned / caloriesConsumed) * 100) : 0}%` }}></div>
                        </div>
                        <div className="breakdown-info">
                          <span className="breakdown-label">Burned</span>
                          <span className="breakdown-value">{caloriesBurned} kcal</span>
                        </div>
                      </div>
                    </div>

                    <div className="calorie-summary">
                      {goals.type === 'weight_loss' && (
                        <p>
                          {netCalories <= -goals.targetCalorieDeficit ? (
                            <><CheckCircle2 size={14} className="success" /> Great! You're in a {Math.abs(netCalories)} kcal deficit</>
                          ) : (
                            <><AlertCircle size={14} className="warning" /> Need {goals.targetCalorieDeficit + netCalories} more kcal deficit</>
                          )}
                        </p>
                      )}
                      {goals.type === 'weight_gain' && (
                        <p>
                          {netCalories >= goals.targetCalorieDeficit ? (
                            <><CheckCircle2 size={14} className="success" /> Great! You're in a {netCalories} kcal surplus</>
                          ) : (
                            <><AlertCircle size={14} className="warning" /> Eat {goals.targetCalorieDeficit - netCalories} more kcal</>
                          )}
                        </p>
                      )}
                      {goals.type === 'maintain' && (
                        <p>
                          {Math.abs(netCalories) < 200 ? (
                            <><CheckCircle2 size={14} className="success" /> Perfect balance!</>
                          ) : (
                            <><AlertCircle size={14} className="warning" /> Balance off by {Math.abs(netCalories)} kcal</>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="analysis-card hydration-card">
                    <div className="card-header">
                      <h4><Droplets size={18} /> Hydration</h4>
                      <span className={`status-badge ${waterProgress >= 100 ? 'on-track' : waterProgress >= 50 ? 'moderate' : 'off-track'}`}>
                        {waterProgress >= 100 ? 'Complete' : waterProgress >= 50 ? 'In Progress' : 'Low'}
                      </span>
                    </div>

                    <div className="hydration-visual">
                      <div className="water-bottle">
                        <div className="water-level" style={{ height: `${Math.min(100, waterProgress)}%` }}></div>
                        <div className="water-percentage">{waterProgress}%</div>
                      </div>
                      <div className="hydration-stats">
                        <div className="hydration-stat">
                          <span className="stat-value">{waterConsumed}</span>
                          <span className="stat-label">consumed</span>
                        </div>
                        <div className="hydration-stat">
                          <span className="stat-value">{waterTarget}</span>
                          <span className="stat-label">target</span>
                        </div>
                        <div className="hydration-stat">
                          <span className="stat-value">{Math.max(0, waterTarget - waterConsumed)}</span>
                          <span className="stat-label">remaining</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="analysis-card bmi-card">
                    <div className="card-header">
                      <h4><Scale size={18} /> Body Mass Index</h4>
                      <span className="status-badge" style={{ background: `${bmiCategory.color}20`, color: bmiCategory.color }}>
                        {bmiCategory.label}
                      </span>
                    </div>
                    
                    <div className="bmi-display">
                      <div className="bmi-value">{bmi}</div>
                      <div className="bmi-scale">
                        <div className="scale-bar">
                          <div className="scale-segment underweight"></div>
                          <div className="scale-segment normal"></div>
                          <div className="scale-segment overweight"></div>
                          <div className="scale-segment obese"></div>
                        </div>
                        <div className="scale-marker" style={{ left: `${Math.min(100, Math.max(0, ((parseFloat(bmi) - 15) / 25) * 100))}%` }}></div>
                        <div className="scale-labels">
                          <span>15</span>
                          <span>18.5</span>
                          <span>25</span>
                          <span>30</span>
                          <span>40</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bmi-info">
                      <p>Height: {profile.height || '—'} cm | Weight: {currentWeight || '—'} kg</p>
                    </div>
                  </div>

                  {/* Google Fit Activity Card */}
                  <div className="analysis-card google-fit-card">
                    <div className="card-header">
                      <h4><Footprints size={18} /> Google Fit Activity</h4>
                      <span className={`status-badge ${googleFitConnected ? 'connected' : 'disconnected'}`}>
                        {googleFitConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    
                    {googleFitConnected ? (
                      <div className="google-fit-stats">
                        <div className="fit-stat-row">
                          <div className="fit-stat">
                            <span className="fit-label">Today</span>
                            <span className="fit-value">{googleFitSteps.day.toLocaleString()}</span>
                            <span className="fit-unit">steps</span>
                          </div>
                          <div className="fit-stat">
                            <span className="fit-label">This Week</span>
                            <span className="fit-value">{googleFitSteps.week.toLocaleString()}</span>
                            <span className="fit-unit">steps</span>
                          </div>
                          <div className="fit-stat">
                            <span className="fit-label">This Month</span>
                            <span className="fit-value">{googleFitSteps.month.toLocaleString()}</span>
                            <span className="fit-unit">steps</span>
                          </div>
                        </div>
                        
                        <div className="fit-progress">
                          <div className="progress-header">
                            <span>Daily Goal Progress</span>
                            <span>{Math.min(100, Math.round((googleFitSteps.day / 10000) * 100))}%</span>
                          </div>
                          <div className="progress-track">
                            <div 
                              className="progress-fill steps-fill" 
                              style={{ width: `${Math.min(100, (googleFitSteps.day / 10000) * 100)}%` }}
                            />
                          </div>
                          <span className="progress-info">{Math.max(0, 10000 - googleFitSteps.day).toLocaleString()} steps to daily goal</span>
                        </div>

                        {/* Weekly & Monthly Comparison */}
                        {googleFitComparison && (
                          <div className="fit-comparison-section">
                            <h5>Period Comparisons</h5>
                            
                            <div className="comparison-grid">
                              {/* Weekly Comparison */}
                              <div className="comparison-card">
                                <div className="comparison-header">
                                  <span className="comparison-title">Weekly Progress</span>
                                  <span className={`comparison-badge ${googleFitComparison.comparison.weeklyTrend}`}>
                                    {googleFitComparison.comparison.weeklyTrend === 'up' && <ArrowUpRight size={14} />}
                                    {googleFitComparison.comparison.weeklyTrend === 'down' && <ArrowDownRight size={14} />}
                                    {googleFitComparison.comparison.weeklyTrend === 'same' && <Minus size={14} />}
                                    {googleFitComparison.comparison.weeklyChange > 0 ? '+' : ''}{googleFitComparison.comparison.weeklyChange}%
                                  </span>
                                </div>
                                <div className="comparison-details">
                                  <div className="comparison-item current">
                                    <span className="period-label">This Week</span>
                                    <span className="period-value">{googleFitComparison.thisWeek.steps.toLocaleString()}</span>
                                    <span className="period-avg">{googleFitComparison.thisWeek.avgPerDay.toLocaleString()} avg/day</span>
                                  </div>
                                  <div className="comparison-vs">vs</div>
                                  <div className="comparison-item previous">
                                    <span className="period-label">Last Week</span>
                                    <span className="period-value">{googleFitComparison.lastWeek.steps.toLocaleString()}</span>
                                    <span className="period-avg">{googleFitComparison.lastWeek.avgPerDay.toLocaleString()} avg/day</span>
                                  </div>
                                </div>
                                <div className="comparison-diff">
                                  {googleFitComparison.thisWeek.steps > googleFitComparison.lastWeek.steps ? (
                                    <span className="diff-positive">
                                      +{(googleFitComparison.thisWeek.steps - googleFitComparison.lastWeek.steps).toLocaleString()} steps more
                                    </span>
                                  ) : googleFitComparison.thisWeek.steps < googleFitComparison.lastWeek.steps ? (
                                    <span className="diff-negative">
                                      {(googleFitComparison.thisWeek.steps - googleFitComparison.lastWeek.steps).toLocaleString()} steps less
                                    </span>
                                  ) : (
                                    <span className="diff-neutral">Same as last week</span>
                                  )}
                                </div>
                              </div>

                              {/* Monthly Comparison */}
                              <div className="comparison-card">
                                <div className="comparison-header">
                                  <span className="comparison-title">Monthly Progress</span>
                                  <span className={`comparison-badge ${googleFitComparison.comparison.monthlyTrend}`}>
                                    {googleFitComparison.comparison.monthlyTrend === 'up' && <ArrowUpRight size={14} />}
                                    {googleFitComparison.comparison.monthlyTrend === 'down' && <ArrowDownRight size={14} />}
                                    {googleFitComparison.comparison.monthlyTrend === 'same' && <Minus size={14} />}
                                    {googleFitComparison.comparison.monthlyChange > 0 ? '+' : ''}{googleFitComparison.comparison.monthlyChange}%
                                  </span>
                                </div>
                                <div className="comparison-details">
                                  <div className="comparison-item current">
                                    <span className="period-label">This Month</span>
                                    <span className="period-value">{googleFitComparison.thisMonth.steps.toLocaleString()}</span>
                                    <span className="period-avg">{googleFitComparison.thisMonth.avgPerDay.toLocaleString()} avg/day</span>
                                  </div>
                                  <div className="comparison-vs">vs</div>
                                  <div className="comparison-item previous">
                                    <span className="period-label">Last Month</span>
                                    <span className="period-value">{googleFitComparison.lastMonth.steps.toLocaleString()}</span>
                                    <span className="period-avg">{googleFitComparison.lastMonth.avgPerDay.toLocaleString()} avg/day</span>
                                  </div>
                                </div>
                                <div className="comparison-diff">
                                  {googleFitComparison.thisMonth.steps > googleFitComparison.lastMonth.steps ? (
                                    <span className="diff-positive">
                                      +{(googleFitComparison.thisMonth.steps - googleFitComparison.lastMonth.steps).toLocaleString()} steps more
                                    </span>
                                  ) : googleFitComparison.thisMonth.steps < googleFitComparison.lastMonth.steps ? (
                                    <span className="diff-negative">
                                      {(googleFitComparison.thisMonth.steps - googleFitComparison.lastMonth.steps).toLocaleString()} steps less
                                    </span>
                                  ) : (
                                    <span className="diff-neutral">Same as last month</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="fit-averages">
                          <div className="average-stat">
                            <span className="avg-label">Weekly Avg</span>
                            <span className="avg-value">{Math.round(googleFitSteps.week / 7).toLocaleString()}</span>
                            <span className="avg-unit">steps/day</span>
                          </div>
                          <div className="average-stat">
                            <span className="avg-label">Monthly Avg</span>
                            <span className="avg-value">{Math.round(googleFitSteps.month / 30).toLocaleString()}</span>
                            <span className="avg-unit">steps/day</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="fit-not-connected">
                        <AlertCircle size={32} />
                        <p>Connect Google Fit on the Activity page to see your step data here</p>
                      </div>
                    )}
                  </div>

                  <div className="analysis-card insights-card">
                    <div className="card-header">
                      <h4><Award size={18} /> Daily Summary</h4>
                    </div>

                    <div className="insights-list">
                      <div className={`insight-item ${calorieStatus ? 'positive' : 'negative'}`}>
                        <div className="insight-icon">
                          {calorieStatus ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        </div>
                        <div className="insight-content">
                          <span className="insight-title">Calorie Goal</span>
                          <span className="insight-text">
                            {calorieStatus ? 'You\'re on track with your calorie goals!' : 'Adjust intake or activity to meet your goal.'}
                          </span>
                        </div>
                      </div>

                      <div className={`insight-item ${waterProgress >= 80 ? 'positive' : 'neutral'}`}>
                        <div className="insight-icon">
                          {waterProgress >= 80 ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        </div>
                        <div className="insight-content">
                          <span className="insight-title">Hydration</span>
                          <span className="insight-text">
                            {waterProgress >= 100 ? 'Daily goal reached!' : `${waterTarget - waterConsumed} more glasses to go.`}
                          </span>
                        </div>
                      </div>

                      <div className={`insight-item ${workoutCount > 0 ? 'positive' : 'neutral'}`}>
                        <div className="insight-icon">
                          {workoutCount > 0 ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        </div>
                        <div className="insight-content">
                          <span className="insight-title">Activity</span>
                          <span className="insight-text">
                            {workoutCount > 0 ? `${workoutCount} workout(s), ${caloriesBurned} kcal burned` : 'No workouts logged today.'}
                          </span>
                        </div>
                      </div>

                      {googleFitConnected && (
                        <div className={`insight-item ${googleFitSteps.day >= 10000 ? 'positive' : googleFitSteps.day >= 5000 ? 'neutral' : 'negative'}`}>
                          <div className="insight-icon">
                            {googleFitSteps.day >= 10000 ? <CheckCircle2 size={18} /> : <Footprints size={18} />}
                          </div>
                          <div className="insight-content">
                            <span className="insight-title">Steps</span>
                            <span className="insight-text">
                              {googleFitSteps.day >= 10000 
                                ? `Amazing! ${googleFitSteps.day.toLocaleString()} steps today!` 
                                : `${googleFitSteps.day.toLocaleString()} steps - ${(10000 - googleFitSteps.day).toLocaleString()} more to reach 10k`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* GOALS TAB */}
            {activeTab === 'goals' && (
              <div className="goals-tab-content">
                {customGoals.length === 0 ? (
                  <div className="empty-goals">
                    <Target size={48} />
                    <h3>No Custom Goals Yet</h3>
                    <p>Create personalized goals to track your fitness journey</p>
                    <button className="create-goal-btn" onClick={() => setShowCustomGoalModal(true)}>
                      <Plus size={18} />
                      Create Your First Goal
                    </button>
                  </div>
                ) : (
                  <div className="custom-goals-grid">
                    {customGoals.map(goal => {
                      const progress = calculateGoalProgress(goal);
                      const metric = metricOptions.find(m => m.id === goal.metric);
                      const template = goalTemplates[goal.type] || goalTemplates.custom;
                      const autoValue = getAutoTrackedValue(goal.metric);
                      
                      return (
                        <div key={goal.id} className="custom-goal-card" style={{ '--goal-color': goal.color }}>
                          <div className="goal-card-header">
                            <div className="goal-icon-wrapper" style={{ background: `${goal.color}20` }}>
                              <template.icon size={20} style={{ color: goal.color }} />
                            </div>
                            <div className="goal-title-section">
                              <h4>{goal.name}</h4>
                              <span className="goal-category">{template.name}</span>
                            </div>
                            <div className="goal-actions">
                              <button className="action-btn" onClick={() => editGoal(goal)} title="Edit">
                                <Edit3 size={14} />
                              </button>
                              <button className="action-btn delete" onClick={() => deleteCustomGoal(goal.id)} title="Delete">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="goal-progress-section">
                            <div className="progress-header">
                              <span className="progress-text">{progress}% Complete</span>
                              <span className="progress-direction">
                                {goal.direction === 'increase' && <TrendingUp size={14} />}
                                {goal.direction === 'decrease' && <TrendingDown size={14} />}
                                {goal.direction === 'maintain' && <Minus size={14} />}
                              </span>
                            </div>
                            <div className="goal-progress-bar">
                              <div className="progress-fill" style={{ width: `${progress}%`, background: goal.color }}></div>
                            </div>
                          </div>

                          <div className="goal-values">
                            <div className="value-item">
                              <span className="value-label">Start</span>
                              <span className="value-number">{goal.startValue || '—'}</span>
                              <span className="value-unit">{goal.metric === 'custom_metric' ? goal.customMetricUnit : metric?.unit}</span>
                            </div>
                            <div className="value-item current">
                              <span className="value-label">Current</span>
                              <span className="value-number">{autoValue !== null ? autoValue : goal.currentValue || '—'}</span>
                              <span className="value-unit">{goal.metric === 'custom_metric' ? goal.customMetricUnit : metric?.unit}</span>
                            </div>
                            <div className="value-item target">
                              <span className="value-label">Target</span>
                              <span className="value-number">{goal.targetValue}</span>
                              <span className="value-unit">{goal.metric === 'custom_metric' ? goal.customMetricUnit : metric?.unit}</span>
                            </div>
                          </div>

                          {autoValue === null && (
                            <div className="log-progress-section">
                              <input
                                type="number"
                                placeholder="Log progress..."
                                className="progress-input"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && e.target.value) {
                                    logGoalProgress(goal.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <button 
                                className="log-btn"
                                onClick={(e) => {
                                  const input = e.target.previousSibling;
                                  if (input.value) {
                                    logGoalProgress(goal.id, input.value);
                                    input.value = '';
                                  }
                                }}
                              >
                                Log
                              </button>
                            </div>
                          )}

                          {goal.deadline && (
                            <div className="goal-deadline">
                              <Calendar size={12} />
                              <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                            </div>
                          )}

                          {goal.notes && (
                            <div className="goal-notes">
                              <p>{goal.notes}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="add-goal-card" onClick={() => setShowCustomGoalModal(true)}>
                      <Plus size={32} />
                      <span>Add New Goal</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ANALYSIS TAB */}
            {activeTab === 'analysis' && (
              <div className="analysis-tab-content">
                <div className="analysis-section">
                  <h3><Calendar size={18} /> Weekly Averages</h3>
                  <div className="weekly-stats-grid">
                    <div className="weekly-stat-card">
                      <Utensils size={24} />
                      <div className="stat-info">
                        <span className="stat-value">{weeklyAverage.caloriesIn || '—'}</span>
                        <span className="stat-label">Avg Calories In/Day</span>
                      </div>
                    </div>
                    <div className="weekly-stat-card">
                      <Flame size={24} />
                      <div className="stat-info">
                        <span className="stat-value">{weeklyAverage.caloriesOut}</span>
                        <span className="stat-label">Avg Calories Burned/Day</span>
                      </div>
                    </div>
                    <div className="weekly-stat-card">
                      <Droplets size={24} />
                      <div className="stat-info">
                        <span className="stat-value">{weeklyAverage.water || '—'}</span>
                        <span className="stat-label">Avg Water/Day</span>
                      </div>
                    </div>
                    <div className="weekly-stat-card">
                      <Dumbbell size={24} />
                      <div className="stat-info">
                        <span className="stat-value">{weeklyAverage.workouts}</span>
                        <span className="stat-label">Avg Workouts/Day</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="analysis-section">
                  <div className="section-header">
                    <h3><Scale size={18} /> Weight History</h3>
                    <button className="log-weight-btn" onClick={() => {
                      const weight = prompt('Enter your current weight (kg):', currentWeight);
                      if (weight && !isNaN(weight)) logWeight(weight);
                    }}>
                      <Plus size={14} /> Log Weight
                    </button>
                  </div>
                  
                  {weightHistory.length > 0 ? (
                    <div className="weight-history-chart">
                      <div className="chart-container">
                        {weightHistory.slice(-14).map((entry, idx, arr) => {
                          const minW = Math.min(...arr.map(e => e.weight)) - 2;
                          const maxW = Math.max(...arr.map(e => e.weight)) + 2;
                          const range = maxW - minW || 1;
                          const height = ((entry.weight - minW) / range) * 100;
                          
                          return (
                            <div key={idx} className="chart-bar-wrapper">
                              <div className="chart-bar" style={{ height: `${height}%` }} title={`${entry.weight} kg`}>
                                <span className="bar-value">{entry.weight}</span>
                              </div>
                              <span className="bar-date">
                                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-history">
                      <Scale size={32} />
                      <p>No weight entries yet. Start logging to track your progress.</p>
                    </div>
                  )}
                </div>

                <div className="analysis-section">
                  <h3><PieChart size={18} /> Today's Nutrition</h3>
                  <div className="macro-cards">
                    <div className="macro-card protein">
                      <div className="macro-icon"><Dumbbell size={20} /></div>
                      <div className="macro-info">
                        <span className="macro-value">{proteinConsumed}g</span>
                        <span className="macro-label">Protein</span>
                      </div>
                    </div>
                    <div className="macro-card calories">
                      <div className="macro-icon"><Flame size={20} /></div>
                      <div className="macro-info">
                        <span className="macro-value">{caloriesConsumed}</span>
                        <span className="macro-label">Calories</span>
                      </div>
                    </div>
                    <div className="macro-card water">
                      <div className="macro-icon"><Droplets size={20} /></div>
                      <div className="macro-info">
                        <span className="macro-value">{waterConsumed * 250}ml</span>
                        <span className="macro-label">Water</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="analysis-section tips-section">
                  <h3><Brain size={18} /> Recommendations</h3>
                  <div className="tips-list">
                    {goals.type === 'weight_loss' && netCalories > -goals.targetCalorieDeficit && (
                      <div className="tip-item">
                        <AlertCircle size={16} />
                        <p>Try adding a 30-minute walk to increase your calorie deficit by ~150 kcal.</p>
                      </div>
                    )}
                    {waterProgress < 50 && (
                      <div className="tip-item">
                        <Droplets size={16} />
                        <p>You're behind on hydration. Try setting hourly reminders to drink water.</p>
                      </div>
                    )}
                    {workoutCount === 0 && (
                      <div className="tip-item">
                        <Dumbbell size={16} />
                        <p>No workout logged today. Even a short 15-minute session can boost your metabolism.</p>
                      </div>
                    )}
                    {proteinConsumed < 50 && (
                      <div className="tip-item">
                        <Apple size={16} />
                        <p>Protein intake is low. Consider adding lean meat, eggs, or legumes to your meals.</p>
                      </div>
                    )}
                    {calorieStatus && waterProgress >= 80 && workoutCount > 0 && (
                      <div className="tip-item success">
                        <CheckCircle2 size={16} />
                        <p>Excellent work today! You're hitting all your targets. Keep it up!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="quick-actions-section">
              <h3>Quick Actions</h3>
              <div className="quick-actions-grid">
                <a href="/home/daily-tracker" className="quick-action-card">
                  <Utensils size={24} />
                  <span>Log Food</span>
                  <ChevronRight size={16} />
                </a>
                <a href="/home/bmr" className="quick-action-card">
                  <Flame size={24} />
                  <span>Log Workout</span>
                  <ChevronRight size={16} />
                </a>
                <a href="/home/activity" className="quick-action-card">
                  <Activity size={24} />
                  <span>View Activity</span>
                  <ChevronRight size={16} />
                </a>
                <button className="quick-action-card" onClick={() => setShowCustomGoalModal(true)}>
                  <Target size={24} />
                  <span>Add Goal</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        {showGoalSetup && <GoalSetupModal />}
        {showCustomGoalModal && <CustomGoalModal />}
      </main>
    </div>
  );
}
