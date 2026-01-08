import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  Droplets, Target, Plus, Minus, Check, RefreshCw, Trophy, Sparkles, 
  GlassWater, Beef, Wheat, X, ChevronRight, Apple, Activity,
  Pill, Calendar, Sun, Zap, Heart, Eye, Shield, Brain
} from 'lucide-react';
import '../components/HydrationStyles.css';
import '../components/DailyTrackerStyles.css';

export default function DailyTrackerPage() {
  const [activeView, setActiveView] = useState(null); // null, 'water', 'food', or 'micros'
  
  // ========== WATER TRACKING STATE ==========
  const [waterTarget, setWaterTarget] = useState(8);
  const [waterConsumed, setWaterConsumed] = useState(0);
  const [glassSize, setGlassSize] = useState(250);
  const [waterHistory, setWaterHistory] = useState([]);

  // ========== FOOD/MACRO TRACKING STATE ==========
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [proteinTarget, setProteinTarget] = useState(120);
  const [carbsTarget, setCarbsTarget] = useState(250);
  const [fatTarget, setFatTarget] = useState(65);
  
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [proteinConsumed, setProteinConsumed] = useState(0);
  const [carbsConsumed, setCarbsConsumed] = useState(0);
  const [fatConsumed, setFatConsumed] = useState(0);
  const [foodHistory, setFoodHistory] = useState([]);
  
  // Quick add form
  const [quickAdd, setQuickAdd] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  // ========== MICRONUTRIENT WEEKLY TRACKING STATE ==========
  const micronutrients = [
    { 
      id: 'vitA', 
      name: 'Vitamin A', 
      icon: Eye, 
      color: '#f59e0b', 
      weeklyTarget: 7, 
      description: 'Essential for vision, immune function, and skin health. Acts as an antioxidant.',
      sources: ['Carrots', 'Sweet Potato', 'Spinach', 'Kale', 'Eggs', 'Liver'],
      benefits: 'Supports eye health, boosts immunity, promotes healthy skin'
    },
    { 
      id: 'vitC', 
      name: 'Vitamin C', 
      icon: Zap, 
      color: '#f97316', 
      weeklyTarget: 7, 
      description: 'Powerful antioxidant that supports immune system and collagen production.',
      sources: ['Oranges', 'Bell Peppers', 'Strawberries', 'Broccoli', 'Kiwi', 'Tomatoes'],
      benefits: 'Boosts immunity, aids iron absorption, supports wound healing'
    },
    { 
      id: 'vitD', 
      name: 'Vitamin D', 
      icon: Sun, 
      color: '#eab308', 
      weeklyTarget: 5, 
      description: 'The sunshine vitamin crucial for bone health and immune function.',
      sources: ['Sunlight', 'Fatty Fish', 'Egg Yolks', 'Fortified Milk', 'Mushrooms'],
      benefits: 'Strengthens bones, improves mood, supports immune system'
    },
    { 
      id: 'vitB12', 
      name: 'Vitamin B12', 
      icon: Brain, 
      color: '#ec4899', 
      weeklyTarget: 5, 
      description: 'Essential for nerve function, DNA synthesis, and red blood cell formation.',
      sources: ['Beef', 'Salmon', 'Eggs', 'Dairy', 'Fortified Cereals'],
      benefits: 'Boosts energy, supports brain health, prevents anemia'
    },
    { 
      id: 'iron', 
      name: 'Iron', 
      icon: Heart, 
      color: '#ef4444', 
      weeklyTarget: 5, 
      description: 'Vital mineral for oxygen transport in blood and energy production.',
      sources: ['Red Meat', 'Spinach', 'Lentils', 'Beans', 'Tofu', 'Dark Chocolate'],
      benefits: 'Prevents fatigue, supports muscle function, aids concentration'
    },
    { 
      id: 'calcium', 
      name: 'Calcium', 
      icon: Shield, 
      color: '#f8fafc', 
      weeklyTarget: 7, 
      description: 'Essential mineral for strong bones, teeth, and muscle function.',
      sources: ['Dairy', 'Leafy Greens', 'Almonds', 'Sardines', 'Fortified Foods'],
      benefits: 'Builds strong bones, supports heart health, aids muscle function'
    },
    { 
      id: 'zinc', 
      name: 'Zinc', 
      icon: Shield, 
      color: '#6366f1', 
      weeklyTarget: 5, 
      description: 'Trace mineral important for immune function and wound healing.',
      sources: ['Oysters', 'Beef', 'Pumpkin Seeds', 'Chickpeas', 'Cashews'],
      benefits: 'Boosts immunity, supports wound healing, aids taste and smell'
    },
    { 
      id: 'omega3', 
      name: 'Omega-3', 
      icon: Heart, 
      color: '#06b6d4', 
      weeklyTarget: 3, 
      description: 'Essential fatty acids crucial for brain and heart health.',
      sources: ['Salmon', 'Mackerel', 'Walnuts', 'Flaxseed', 'Chia Seeds', 'Sardines'],
      benefits: 'Reduces inflammation, supports heart and brain health'
    },
  ];

  const [microLog, setMicroLog] = useState({});
  const [weekStart, setWeekStart] = useState('');

  // Get current week start (Monday)
  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toDateString();
  };

  // ========== LOAD/SAVE DATA ==========
  useEffect(() => {
    const today = new Date().toDateString();
    const currentWeekStart = getWeekStart();
    setWeekStart(currentWeekStart);
    
    // Load water data
    const savedWater = localStorage.getItem('ya_hydration');
    if (savedWater) {
      const data = JSON.parse(savedWater);
      if (data.date === today) {
        setWaterConsumed(data.consumed || 0);
        setWaterHistory(data.history || []);
      }
      setWaterTarget(data.target || 8);
      setGlassSize(data.glassSize || 250);
    }
    
    // Load food data
    const savedFood = localStorage.getItem('ya_food_tracker');
    if (savedFood) {
      const data = JSON.parse(savedFood);
      if (data.date === today) {
        setCaloriesConsumed(data.caloriesConsumed || 0);
        setProteinConsumed(data.proteinConsumed || 0);
        setCarbsConsumed(data.carbsConsumed || 0);
        setFatConsumed(data.fatConsumed || 0);
        setFoodHistory(data.foodHistory || []);
      }
      setCalorieTarget(data.calorieTarget || 2000);
      setProteinTarget(data.proteinTarget || 120);
      setCarbsTarget(data.carbsTarget || 250);
      setFatTarget(data.fatTarget || 65);
    }
    
    // Load micro data
    const savedMicros = localStorage.getItem('ya_micro_tracker');
    if (savedMicros) {
      const data = JSON.parse(savedMicros);
      if (data.weekStart === currentWeekStart) {
        setMicroLog(data.log || {});
      } else {
        // New week, reset
        setMicroLog({});
      }
    }
  }, []);

  // Save water data
  useEffect(() => {
    const data = {
      date: new Date().toDateString(),
      consumed: waterConsumed,
      target: waterTarget,
      glassSize,
      history: waterHistory
    };
    localStorage.setItem('ya_hydration', JSON.stringify(data));
  }, [waterConsumed, waterTarget, glassSize, waterHistory]);

  // Save food data
  useEffect(() => {
    const data = {
      date: new Date().toDateString(),
      caloriesConsumed,
      proteinConsumed,
      carbsConsumed,
      fatConsumed,
      calorieTarget,
      proteinTarget,
      carbsTarget,
      fatTarget,
      foodHistory
    };
    localStorage.setItem('ya_food_tracker', JSON.stringify(data));
  }, [caloriesConsumed, proteinConsumed, carbsConsumed, fatConsumed, calorieTarget, proteinTarget, carbsTarget, fatTarget, foodHistory]);

  // Save micro data
  useEffect(() => {
    if (weekStart) {
      const data = {
        weekStart,
        log: microLog
      };
      localStorage.setItem('ya_micro_tracker', JSON.stringify(data));
    }
  }, [microLog, weekStart]);

  // ========== WATER FUNCTIONS ==========
  const addGlass = () => {
    setWaterConsumed(prev => prev + 1);
    setWaterHistory(prev => [...prev, {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: glassSize
    }]);
  };

  const removeGlass = () => {
    if (waterConsumed > 0) {
      setWaterConsumed(prev => prev - 1);
      setWaterHistory(prev => prev.slice(0, -1));
    }
  };

  const resetWater = () => {
    setWaterConsumed(0);
    setWaterHistory([]);
  };

  // ========== FOOD FUNCTIONS ==========
  const addFood = () => {
    if (!quickAdd.name || !quickAdd.calories) return;
    
    const entry = {
      name: quickAdd.name,
      calories: parseInt(quickAdd.calories) || 0,
      protein: parseInt(quickAdd.protein) || 0,
      carbs: parseInt(quickAdd.carbs) || 0,
      fat: parseInt(quickAdd.fat) || 0,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setCaloriesConsumed(prev => prev + entry.calories);
    setProteinConsumed(prev => prev + entry.protein);
    setCarbsConsumed(prev => prev + entry.carbs);
    setFatConsumed(prev => prev + entry.fat);
    setFoodHistory(prev => [...prev, entry]);
    setQuickAdd({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  const removeLastFood = () => {
    if (foodHistory.length > 0) {
      const last = foodHistory[foodHistory.length - 1];
      setCaloriesConsumed(prev => Math.max(0, prev - last.calories));
      setProteinConsumed(prev => Math.max(0, prev - last.protein));
      setCarbsConsumed(prev => Math.max(0, prev - last.carbs));
      setFatConsumed(prev => Math.max(0, prev - last.fat));
      setFoodHistory(prev => prev.slice(0, -1));
    }
  };

  const resetFood = () => {
    setCaloriesConsumed(0);
    setProteinConsumed(0);
    setCarbsConsumed(0);
    setFatConsumed(0);
    setFoodHistory([]);
  };

  // ========== MICRO FUNCTIONS ==========
  const toggleMicro = (microId) => {
    setMicroLog(prev => {
      const current = prev[microId] || 0;
      const target = micronutrients.find(m => m.id === microId)?.weeklyTarget || 7;
      return {
        ...prev,
        [microId]: current < target ? current + 1 : 0
      };
    });
  };

  const incrementMicro = (microId) => {
    setMicroLog(prev => {
      const current = prev[microId] || 0;
      const target = micronutrients.find(m => m.id === microId)?.weeklyTarget || 7;
      return {
        ...prev,
        [microId]: Math.min(current + 1, target)
      };
    });
  };

  const decrementMicro = (microId) => {
    setMicroLog(prev => {
      const current = prev[microId] || 0;
      return {
        ...prev,
        [microId]: Math.max(current - 1, 0)
      };
    });
  };

  const resetMicros = () => {
    setMicroLog({});
  };

  // ========== COMPUTED VALUES ==========
  const waterProgress = Math.min((waterConsumed / waterTarget) * 100, 100);
  const totalMl = waterConsumed * glassSize;
  const targetMl = waterTarget * glassSize;
  const waterRemaining = Math.max(waterTarget - waterConsumed, 0);

  const calorieProgress = Math.min((caloriesConsumed / calorieTarget) * 100, 100);
  const proteinProgress = Math.min((proteinConsumed / proteinTarget) * 100, 100);
  const carbsProgress = Math.min((carbsConsumed / carbsTarget) * 100, 100);
  const fatProgress = Math.min((fatConsumed / fatTarget) * 100, 100);

  // Calculate overall micro progress
  const getMicroProgress = (microId) => {
    const micro = micronutrients.find(m => m.id === microId);
    const consumed = microLog[microId] || 0;
    return Math.min((consumed / micro.weeklyTarget) * 100, 100);
  };

  const overallMicroProgress = () => {
    const total = micronutrients.reduce((sum, m) => sum + getMicroProgress(m.id), 0);
    return Math.round(total / micronutrients.length);
  };

  const completedMicros = micronutrients.filter(m => (microLog[m.id] || 0) >= m.weeklyTarget).length;

  const getWaterMotivation = () => {
    if (waterConsumed === 0) return "Start your day with a glass of water! 💧";
    if (waterProgress < 25) return "Great start! Keep drinking! 🌱";
    if (waterProgress < 50) return "You're doing well! Almost halfway! 💪";
    if (waterProgress < 75) return "More than halfway there! Keep it up! 🎯";
    if (waterProgress < 100) return "Almost at your goal! You got this! 🔥";
    return "🎉 Goal achieved! Stay hydrated! 🏆";
  };

  // ========== RENDER ==========
  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="page-header-with-badge">
          <div>
            <h2>
              <Activity className="header-icon" size={28} />
              Daily Tracker
            </h2>
            <p className="subtitle">Track your nutrition and hydration in one place</p>
          </div>
        </div>

        {/* Summary Cards View */}
        {activeView === null && (
          <div className="tracker-summary-grid">
            {/* Water Summary Card */}
            <div className="summary-card water-summary" onClick={() => setActiveView('water')}>
              <div className="summary-icon water">
                <Droplets size={32} />
              </div>
              <div className="summary-content">
                <h3>Hydration</h3>
                <div className="summary-progress-ring">
                  <svg viewBox="0 0 100 100">
                    <circle className="bg" cx="50" cy="50" r="40" />
                    <circle 
                      className="progress water" 
                      cx="50" cy="50" r="40" 
                      strokeDasharray={`${waterProgress * 2.51} 251`}
                    />
                  </svg>
                  <div className="ring-text">
                    <span className="ring-value">{waterConsumed}</span>
                    <span className="ring-label">/{waterTarget}</span>
                  </div>
                </div>
                <div className="summary-stats">
                  <span className="summary-ml">{totalMl} ml</span>
                  <span className="summary-target">of {targetMl} ml</span>
                </div>
                {waterProgress >= 100 && (
                  <div className="summary-badge complete">
                    <Trophy size={14} /> Goal Complete!
                  </div>
                )}
              </div>
              <div className="summary-action">
                <ChevronRight size={24} />
              </div>
            </div>

            {/* Food Summary Card */}
            <div className="summary-card food-summary" onClick={() => setActiveView('food')}>
              <div className="summary-icon food">
                <Apple size={32} />
              </div>
              <div className="summary-content">
                <h3>Macronutrition</h3>
                <div className="summary-progress-ring">
                  <svg viewBox="0 0 100 100">
                    <circle className="bg" cx="50" cy="50" r="40" />
                    <circle 
                      className="progress food" 
                      cx="50" cy="50" r="40" 
                      strokeDasharray={`${calorieProgress * 2.51} 251`}
                    />
                  </svg>
                  <div className="ring-text">
                    <span className="ring-value">{caloriesConsumed}</span>
                    <span className="ring-label">kcal</span>
                  </div>
                </div>
                <div className="macro-mini-bars">
                  <div className="mini-bar">
                    <span>P</span>
                    <div className="bar-bg"><div className="bar-fill protein" style={{ width: `${proteinProgress}%` }} /></div>
                    <span>{proteinConsumed}g</span>
                  </div>
                  <div className="mini-bar">
                    <span>C</span>
                    <div className="bar-bg"><div className="bar-fill carbs" style={{ width: `${carbsProgress}%` }} /></div>
                    <span>{carbsConsumed}g</span>
                  </div>
                  <div className="mini-bar">
                    <span>F</span>
                    <div className="bar-bg"><div className="bar-fill fat" style={{ width: `${fatProgress}%` }} /></div>
                    <span>{fatConsumed}g</span>
                  </div>
                </div>
              </div>
              <div className="summary-action">
                <ChevronRight size={24} />
              </div>
            </div>

            {/* Micros Summary Card */}
            <div className="summary-card micros-summary" onClick={() => setActiveView('micros')}>
              <div className="summary-icon micros">
                <Pill size={32} />
              </div>
              <div className="summary-content">
                <h3>Micronutrients</h3>
                <div className="summary-progress-ring">
                  <svg viewBox="0 0 100 100">
                    <circle className="bg" cx="50" cy="50" r="40" />
                    <circle 
                      className="progress micros" 
                      cx="50" cy="50" r="40" 
                      strokeDasharray={`${overallMicroProgress() * 2.51} 251`}
                    />
                  </svg>
                  <div className="ring-text">
                    <span className="ring-value">{overallMicroProgress()}%</span>
                    <span className="ring-label">weekly</span>
                  </div>
                </div>
                <div className="micro-mini-stats">
                  <div className="micro-mini-stat">
                    <Calendar size={14} />
                    <span>This Week</span>
                  </div>
                  <div className="micro-mini-stat complete">
                    <Check size={14} />
                    <span>{completedMicros}/{micronutrients.length} complete</span>
                  </div>
                </div>
              </div>
              <div className="summary-action">
                <ChevronRight size={24} />
              </div>
            </div>
          </div>
        )}

        {/* Water Detail View */}
        {activeView === 'water' && (
          <div className="detail-view">
            <button className="back-btn" onClick={() => setActiveView(null)}>
              <X size={20} />
              Back to Summary
            </button>

            <div className="hydration-container">
              <div className="hydration-main-card">
                <div className="hydration-visual">
                  <div className="water-bottle">
                    <div className="water-level" style={{ height: `${waterProgress}%` }}>
                      <div className="water-wave"></div>
                    </div>
                    <div className="water-marks">
                      {[...Array(Math.min(waterTarget, 12))].map((_, i) => (
                        <div key={i} className="mark" style={{ bottom: `${((i + 1) / Math.min(waterTarget, 12)) * 100}%` }} />
                      ))}
                    </div>
                  </div>
                  
                  <div className="hydration-stats">
                    <div className="stat-big">
                      <span className="stat-value">{waterConsumed}</span>
                      <span className="stat-label">/ {waterTarget} glasses</span>
                    </div>
                    <div className="stat-ml">{totalMl} ml / {targetMl} ml</div>
                    {waterRemaining > 0 ? (
                      <div className="stat-remaining">{waterRemaining} more to go</div>
                    ) : (
                      <div className="stat-complete"><Trophy size={16} /> Goal Complete!</div>
                    )}
                  </div>
                </div>

                <div className="motivation-text">
                  <Sparkles size={16} />
                  {getWaterMotivation()}
                </div>

                <div className="hydration-controls">
                  <button className="control-btn minus" onClick={removeGlass} disabled={waterConsumed === 0}>
                    <Minus size={24} />
                  </button>
                  <button className="control-btn add" onClick={addGlass}>
                    <Plus size={28} />
                    <span>Add Glass</span>
                  </button>
                  <button className="control-btn reset" onClick={resetWater} title="Reset today">
                    <RefreshCw size={20} />
                  </button>
                </div>
              </div>

              <div className="hydration-side">
                <div className="hydration-card settings-card">
                  <h3><Target size={18} /> Daily Goal</h3>
                  <div className="setting-item">
                    <label>Glasses per day</label>
                    <div className="setting-control">
                      <button onClick={() => setWaterTarget(Math.max(1, waterTarget - 1))}><Minus size={16} /></button>
                      <span>{waterTarget}</span>
                      <button onClick={() => setWaterTarget(Math.min(40, waterTarget + 1))}><Plus size={16} /></button>
                    </div>
                  </div>
                  <div className="setting-item">
                    <label>Glass size (ml)</label>
                    <div className="glass-size-input">
                      <input
                        type="number"
                        value={glassSize}
                        onChange={(e) => {
                          const size = parseInt(e.target.value) || 0;
                          if (size >= 50 && size <= 1000) setGlassSize(size);
                        }}
                        min="50" max="1000" step="10"
                      />
                      <span>ml</span>
                    </div>
                  </div>
                  <div className="daily-target-info">
                    <GlassWater size={16} />
                    Daily target: <strong>{targetMl} ml</strong> ({(targetMl / 1000).toFixed(1)}L)
                  </div>
                </div>

                <div className="hydration-card log-card">
                  <h3><Droplets size={18} /> Today's Log</h3>
                  {waterHistory.length === 0 ? (
                    <div className="empty-log">
                      <Droplets size={32} />
                      <p>No water logged yet today</p>
                    </div>
                  ) : (
                    <div className="log-list">
                      {waterHistory.slice().reverse().map((entry, i) => (
                        <div key={i} className="log-entry">
                          <div className="log-icon"><Check size={14} /></div>
                          <span className="log-time">{entry.time}</span>
                          <span className="log-amount">{entry.amount}ml</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Food Detail View */}
        {activeView === 'food' && (
          <div className="detail-view">
            <button className="back-btn" onClick={() => setActiveView(null)}>
              <X size={20} />
              Back to Summary
            </button>

            <div className="food-tracker-container">
              {/* Main Stats */}
              <div className="food-main-card">
                <div className="calorie-display">
                  <div className="calorie-ring">
                    <svg viewBox="0 0 120 120">
                      <circle className="ring-bg" cx="60" cy="60" r="52" />
                      <circle 
                        className="ring-progress" 
                        cx="60" cy="60" r="52" 
                        strokeDasharray={`${calorieProgress * 3.27} 327`}
                      />
                    </svg>
                    <div className="ring-center">
                      <span className="cal-value">{caloriesConsumed}</span>
                      <span className="cal-label">/ {calorieTarget} kcal</span>
                    </div>
                  </div>
                  <div className="calorie-remaining">
                    {calorieTarget - caloriesConsumed > 0 
                      ? `${calorieTarget - caloriesConsumed} kcal remaining`
                      : '🎯 Goal reached!'}
                  </div>
                </div>

                <div className="macro-bars">
                  <div className="macro-bar-item">
                    <div className="macro-info">
                      <Beef size={18} className="protein-icon" />
                      <span>Protein</span>
                      <span className="macro-values">{proteinConsumed}g / {proteinTarget}g</span>
                    </div>
                    <div className="macro-progress-bar">
                      <div className="macro-fill protein" style={{ width: `${proteinProgress}%` }} />
                    </div>
                  </div>
                  
                  <div className="macro-bar-item">
                    <div className="macro-info">
                      <Wheat size={18} className="carbs-icon" />
                      <span>Carbs</span>
                      <span className="macro-values">{carbsConsumed}g / {carbsTarget}g</span>
                    </div>
                    <div className="macro-progress-bar">
                      <div className="macro-fill carbs" style={{ width: `${carbsProgress}%` }} />
                    </div>
                  </div>
                  
                  <div className="macro-bar-item">
                    <div className="macro-info">
                      <Droplets size={18} className="fat-icon" />
                      <span>Fat</span>
                      <span className="macro-values">{fatConsumed}g / {fatTarget}g</span>
                    </div>
                    <div className="macro-progress-bar">
                      <div className="macro-fill fat" style={{ width: `${fatProgress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="food-controls">
                  <button className="control-btn minus" onClick={removeLastFood} disabled={foodHistory.length === 0}>
                    <Minus size={24} />
                  </button>
                  <button className="control-btn reset" onClick={resetFood} title="Reset today">
                    <RefreshCw size={20} />
                  </button>
                </div>
              </div>

              {/* Side Panel */}
              <div className="food-side">
                {/* Quick Add */}
                <div className="food-card add-food-card">
                  <h3><Plus size={18} /> Quick Add Food</h3>
                  <div className="quick-add-form">
                    <input
                      type="text"
                      placeholder="Food name"
                      value={quickAdd.name}
                      onChange={(e) => setQuickAdd({ ...quickAdd, name: e.target.value })}
                    />
                    <div className="macro-inputs">
                      <div className="macro-input">
                        <label>Calories</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={quickAdd.calories}
                          onChange={(e) => setQuickAdd({ ...quickAdd, calories: e.target.value })}
                        />
                      </div>
                      <div className="macro-input">
                        <label>Protein (g)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={quickAdd.protein}
                          onChange={(e) => setQuickAdd({ ...quickAdd, protein: e.target.value })}
                        />
                      </div>
                      <div className="macro-input">
                        <label>Carbs (g)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={quickAdd.carbs}
                          onChange={(e) => setQuickAdd({ ...quickAdd, carbs: e.target.value })}
                        />
                      </div>
                      <div className="macro-input">
                        <label>Fat (g)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={quickAdd.fat}
                          onChange={(e) => setQuickAdd({ ...quickAdd, fat: e.target.value })}
                        />
                      </div>
                    </div>
                    <button className="add-food-btn" onClick={addFood} disabled={!quickAdd.name || !quickAdd.calories}>
                      <Plus size={18} />
                      Add Food
                    </button>
                  </div>
                </div>

                {/* Goals Settings */}
                <div className="food-card goals-card">
                  <h3><Target size={18} /> Daily Goals</h3>
                  <div className="goal-inputs">
                    <div className="goal-input">
                      <label>Calories</label>
                      <input type="number" value={calorieTarget} onChange={(e) => setCalorieTarget(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="goal-input">
                      <label>Protein (g)</label>
                      <input type="number" value={proteinTarget} onChange={(e) => setProteinTarget(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="goal-input">
                      <label>Carbs (g)</label>
                      <input type="number" value={carbsTarget} onChange={(e) => setCarbsTarget(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="goal-input">
                      <label>Fat (g)</label>
                      <input type="number" value={fatTarget} onChange={(e) => setFatTarget(parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>

                {/* Food Log */}
                <div className="food-card log-card">
                  <h3><Apple size={18} /> Today's Food</h3>
                  {foodHistory.length === 0 ? (
                    <div className="empty-log">
                      <Apple size={32} />
                      <p>No food logged yet today</p>
                    </div>
                  ) : (
                    <div className="food-log-list">
                      {foodHistory.slice().reverse().map((entry, i) => (
                        <div key={i} className="food-log-entry">
                          <div className="food-log-main">
                            <span className="food-name">{entry.name}</span>
                            <span className="food-time">{entry.time}</span>
                          </div>
                          <div className="food-log-macros">
                            <span className="cal">{entry.calories} kcal</span>
                            <span className="macro">P: {entry.protein}g</span>
                            <span className="macro">C: {entry.carbs}g</span>
                            <span className="macro">F: {entry.fat}g</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Micros Detail View */}
        {activeView === 'micros' && (
          <div className="detail-view">
            <button className="back-btn" onClick={() => setActiveView(null)}>
              <X size={20} />
              Back to Summary
            </button>

            <div className="micros-tracker-container">
              {/* Main Overview */}
              <div className="micros-main-card">
                <div className="micros-header">
                  <div className="micros-title">
                    <Pill size={24} />
                    <div>
                      <h3>Weekly Micronutrients</h3>
                      <p>Track vitamins & minerals you've consumed this week</p>
                    </div>
                  </div>
                  <div className="week-badge">
                    <Calendar size={14} />
                    Week of {new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                <div className="micros-overall">
                  <div className="overall-ring">
                    <svg viewBox="0 0 120 120">
                      <circle className="ring-bg" cx="60" cy="60" r="52" />
                      <circle 
                        className="ring-progress micros" 
                        cx="60" cy="60" r="52" 
                        strokeDasharray={`${overallMicroProgress() * 3.27} 327`}
                      />
                    </svg>
                    <div className="ring-center">
                      <span className="overall-value">{overallMicroProgress()}%</span>
                      <span className="overall-label">Overall</span>
                    </div>
                  </div>
                  <div className="overall-stats">
                    <div className="overall-stat">
                      <Check size={18} />
                      <span>{completedMicros} of {micronutrients.length}</span>
                      <span className="stat-desc">targets met</span>
                    </div>
                  </div>
                </div>

                <div className="micros-grid-new">
                  {micronutrients.map(micro => {
                    const consumed = microLog[micro.id] || 0;
                    const progress = getMicroProgress(micro.id);
                    const isComplete = consumed >= micro.weeklyTarget;
                    const MicroIcon = micro.icon;
                    
                    return (
                      <div 
                        key={micro.id} 
                        className={`micro-card-new ${isComplete ? 'complete' : ''}`}
                      >
                        <div className="micro-card-header">
                          <div className="micro-icon-new" style={{ backgroundColor: `${micro.color}20`, color: micro.color }}>
                            <MicroIcon size={22} />
                          </div>
                          <div className="micro-title-area">
                            <span className="micro-name-new">{micro.name}</span>
                            <span className="micro-progress-text">{consumed}/{micro.weeklyTarget} days this week</span>
                          </div>
                          {isComplete && (
                            <div className="micro-complete-badge">
                              <Check size={14} />
                              Done
                            </div>
                          )}
                        </div>
                        
                        <p className="micro-description">{micro.description}</p>
                        
                        <div className="micro-benefits">
                          <Sparkles size={12} />
                          <span>{micro.benefits}</span>
                        </div>
                        
                        <div className="micro-sources-section">
                          <span className="sources-label">Best Sources:</span>
                          <div className="sources-tags">
                            {micro.sources.map((source, idx) => (
                              <span key={idx} className="source-tag" style={{ borderColor: `${micro.color}40` }}>
                                {source}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="micro-progress-section">
                          <div className="micro-progress-bar-new">
                            <div 
                              className="micro-fill-new" 
                              style={{ width: `${progress}%`, backgroundColor: micro.color }}
                            />
                          </div>
                        </div>
                        
                        <button 
                          className={`mark-done-btn ${consumed > 0 ? 'has-progress' : ''} ${isComplete ? 'completed' : ''}`}
                          onClick={() => toggleMicro(micro.id)}
                          style={{ '--micro-color': micro.color }}
                        >
                          {isComplete ? (
                            <><Check size={16} /> Weekly Goal Complete!</>
                          ) : consumed > 0 ? (
                            <><Check size={16} /> Mark Today as Done ({consumed}/{micro.weeklyTarget})</>
                          ) : (
                            <><Check size={16} /> Mark as Done</>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button className="reset-micros-btn" onClick={resetMicros}>
                  <RefreshCw size={16} />
                  Reset Week
                </button>
              </div>

              {/* Info Panel */}
              <div className="micros-side">
                <div className="micros-info-card">
                  <h3><Sparkles size={18} /> How It Works</h3>
                  <div className="info-content">
                    <p>Track your micronutrient intake by marking when you've consumed foods rich in each vitamin or mineral.</p>
                    <ul>
                      <li>Click "Mark as Done" when you eat nutrient-rich foods</li>
                      <li>Each card shows best food sources</li>
                      <li>Aim to meet weekly targets for each</li>
                      <li>Progress resets automatically each Monday</li>
                    </ul>
                  </div>
                </div>

                <div className="micros-info-card tips-card">
                  <h3><Heart size={18} /> Why Micronutrients Matter</h3>
                  <div className="info-content">
                    <p>While macros (protein, carbs, fat) provide energy, micronutrients are essential for:</p>
                    <ul>
                      <li>Immune system function</li>
                      <li>Energy metabolism</li>
                      <li>Bone and muscle health</li>
                      <li>Brain function and mood</li>
                      <li>Cell repair and growth</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
