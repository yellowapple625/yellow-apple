import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  Sparkles, UtensilsCrossed, Target, Zap, Activity, 
  Clock, ChefHat, Plus, Trash2, Save, RefreshCw,
  Apple, Salad, Flame, Dumbbell, Moon, Heart, Sun, Coffee, Sandwich, Cookie,
  ChevronDown, ChevronUp, Leaf, Wheat, Droplet
} from 'lucide-react';
import { BACKEND_URL } from '../config';

export default function MealPlanPage() {
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('generate');

  // Form state
  const [settings, setSettings] = useState({
    calories: 2000,
    protein: 100,
    fat: 65,
    goal: 'maintain',
    dietType: 'balanced',
    meals: 4,
    portionSize: 'medium',
    restrictions: [],
    customPrompt: ''
  });

  const portionSizes = [
    { id: 'small', label: 'Small', desc: 'Lighter portions' },
    { id: 'medium', label: 'Medium', desc: 'Standard portions' },
    { id: 'large', label: 'Large', desc: 'Bigger portions' }
  ];

  const goals = [
    { id: 'lose', label: 'Weight Loss', icon: Flame, desc: 'Calorie deficit for fat loss' },
    { id: 'maintain', label: 'Maintain', icon: Target, desc: 'Keep current weight' },
    { id: 'muscle', label: 'Muscle Gain', icon: Dumbbell, desc: 'High protein for muscle' },
    { id: 'bulk', label: 'Weight Gain', icon: Activity, desc: 'Calorie surplus to bulk up' },
    { id: 'health', label: 'General Health', icon: Heart, desc: 'Focus on nutrition quality' },
    { id: 'energy', label: 'Energy Boost', icon: Zap, desc: 'Foods for sustained energy' }
  ];

  // Popular diet types shown as main buttons
  const popularDiets = [
    { id: 'balanced', label: 'Balanced' },
    { id: 'high-protein', label: 'High Protein' },
    { id: 'low-carb', label: 'Low Carb' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'vegan', label: 'Vegan' },
    { id: 'keto', label: 'Keto' },
  ];

  // All diet types for dropdown
  const allDietTypes = [
    { id: 'balanced', label: 'Balanced', category: 'General' },
    { id: 'high-protein', label: 'High Protein', category: 'General' },
    { id: 'low-carb', label: 'Low Carb', category: 'General' },
    { id: 'calorie-counting', label: 'Calorie Counting', category: 'General' },
    { id: 'vegetarian', label: 'Vegetarian', category: 'Plant-Based' },
    { id: 'vegan', label: 'Vegan', category: 'Plant-Based' },
    { id: 'pescatarian', label: 'Pescatarian', category: 'Plant-Based' },
    { id: 'flexitarian', label: 'Flexitarian', category: 'Plant-Based' },
    { id: 'keto', label: 'Keto', category: 'Low-Carb' },
    { id: 'atkins', label: 'Atkins', category: 'Low-Carb' },
    { id: 'carnivore', label: 'Carnivore', category: 'Low-Carb' },
    { id: 'mediterranean', label: 'Mediterranean', category: 'Regional' },
    { id: 'indian', label: 'Indian', category: 'Regional' },
    { id: 'asian', label: 'Asian', category: 'Regional' },
    { id: 'middle-eastern', label: 'Middle Eastern', category: 'Regional' },
    { id: 'mexican', label: 'Mexican', category: 'Regional' },
    { id: 'japanese', label: 'Japanese', category: 'Regional' },
    { id: 'paleo', label: 'Paleo', category: 'Specialty' },
    { id: 'whole30', label: 'Whole30', category: 'Specialty' },
    { id: 'fodmap', label: 'Low FODMAP', category: 'Specialty' },
    { id: 'iron-rich', label: 'Iron Rich', category: 'Health-Focused' },
    { id: 'anti-inflammatory', label: 'Anti-Inflammatory', category: 'Health-Focused' },
    { id: 'gut-health', label: 'Gut Health', category: 'Health-Focused' },
    { id: 'diabetic-friendly', label: 'Diabetic Friendly', category: 'Health-Focused' },
    { id: 'heart-healthy', label: 'Heart Healthy', category: 'Health-Focused' },
    { id: 'kidney-friendly', label: 'Kidney Friendly', category: 'Health-Focused' },
    { id: 'thyroid-support', label: 'Thyroid Support', category: 'Health-Focused' },
    { id: 'pcos-friendly', label: 'PCOS Friendly', category: 'Health-Focused' },
    { id: 'pregnancy', label: 'Pregnancy Nutrition', category: 'Health-Focused' },
    { id: 'detox', label: 'Detox / Cleanse', category: 'Specialty' },
    { id: 'intermittent-fasting', label: 'Intermittent Fasting', category: 'Specialty' },
  ];

  const [showAllDiets, setShowAllDiets] = useState(false);
  const [showAllRestrictions, setShowAllRestrictions] = useState(false);

  // Popular restrictions shown as main buttons
  const popularRestrictions = [
    'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher', 'low-sodium'
  ];

  // All restrictions organized by category
  const allRestrictionTypes = [
    { id: 'gluten-free', label: 'Gluten-Free', category: 'Allergens' },
    { id: 'dairy-free', label: 'Dairy-Free', category: 'Allergens' },
    { id: 'nut-free', label: 'Nut-Free', category: 'Allergens' },
    { id: 'peanut-free', label: 'Peanut-Free', category: 'Allergens' },
    { id: 'tree-nut-free', label: 'Tree Nut-Free', category: 'Allergens' },
    { id: 'egg-free', label: 'Egg-Free', category: 'Allergens' },
    { id: 'soy-free', label: 'Soy-Free', category: 'Allergens' },
    { id: 'sesame-free', label: 'Sesame-Free', category: 'Allergens' },
    { id: 'shellfish-free', label: 'Shellfish-Free', category: 'Allergens' },
    { id: 'fish-free', label: 'Fish-Free', category: 'Allergens' },
    { id: 'mustard-free', label: 'Mustard-Free', category: 'Allergens' },
    { id: 'celery-free', label: 'Celery-Free', category: 'Allergens' },
    { id: 'sulfite-free', label: 'Sulfite-Free', category: 'Allergens' },
    { id: 'halal', label: 'Halal', category: 'Religious' },
    { id: 'kosher', label: 'Kosher', category: 'Religious' },
    { id: 'jain', label: 'Jain', category: 'Religious' },
    { id: 'sattvic', label: 'Sattvic', category: 'Religious' },
    { id: 'no-pork', label: 'No Pork', category: 'Meat Preferences' },
    { id: 'no-beef', label: 'No Beef', category: 'Meat Preferences' },
    { id: 'no-seafood', label: 'No Seafood', category: 'Meat Preferences' },
    { id: 'no-red-meat', label: 'No Red Meat', category: 'Meat Preferences' },
    { id: 'no-poultry', label: 'No Poultry', category: 'Meat Preferences' },
    { id: 'no-lamb', label: 'No Lamb', category: 'Meat Preferences' },
    { id: 'no-nightshades', label: 'No Nightshades', category: 'Ingredient Avoidance' },
    { id: 'no-onion-garlic', label: 'No Onion/Garlic', category: 'Ingredient Avoidance' },
    { id: 'no-raw-food', label: 'No Raw Food', category: 'Ingredient Avoidance' },
    { id: 'no-spicy', label: 'No Spicy', category: 'Ingredient Avoidance' },
    { id: 'no-cruciferous', label: 'No Cruciferous', category: 'Ingredient Avoidance' },
    { id: 'no-legumes', label: 'No Legumes', category: 'Ingredient Avoidance' },
    { id: 'low-sodium', label: 'Low Sodium', category: 'Health-Based' },
    { id: 'low-sugar', label: 'Low Sugar', category: 'Health-Based' },
    { id: 'low-fodmap', label: 'Low FODMAP', category: 'Health-Based' },
    { id: 'low-histamine', label: 'Low Histamine', category: 'Health-Based' },
    { id: 'low-oxalate', label: 'Low Oxalate', category: 'Health-Based' },
    { id: 'no-artificial-sweeteners', label: 'No Artificial Sweeteners', category: 'Other' },
    { id: 'organic-only', label: 'Organic Only', category: 'Other' },
    { id: 'non-gmo', label: 'Non-GMO', category: 'Other' },
    { id: 'whole-foods-only', label: 'Whole Foods Only', category: 'Other' }
  ];

  // Group restrictions by category
  const restrictionCategories = allRestrictionTypes.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  // Load saved plans from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ya_meal_plans');
    if (saved) {
      setSavedPlans(JSON.parse(saved));
    }
  }, []);

  // Save plans to localStorage
  const savePlanToStorage = (plan) => {
    const newPlan = {
      ...plan,
      id: `plan_${Date.now()}`,
      savedAt: new Date().toISOString()
    };
    const updated = [newPlan, ...savedPlans];
    setSavedPlans(updated);
    localStorage.setItem('ya_meal_plans', JSON.stringify(updated));
    return newPlan;
  };

  const deletePlan = (planId) => {
    const updated = savedPlans.filter(p => p.id !== planId);
    setSavedPlans(updated);
    localStorage.setItem('ya_meal_plans', JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.removeItem('ya_client_token');
    window.location.href = '/login';
  };

  const toggleRestriction = (r) => {
    if (settings.restrictions.includes(r)) {
      setSettings({ ...settings, restrictions: settings.restrictions.filter(x => x !== r) });
    } else {
      setSettings({ ...settings, restrictions: [...settings.restrictions, r] });
    }
  };

  const generateMealPlan = async () => {
    setLoading(true);
    setError('');
    setGeneratedPlan(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/generate-meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate meal plan');
      }

      setGeneratedPlan(data.plan);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = () => {
    if (generatedPlan) {
      savePlanToStorage(generatedPlan);
      setActiveTab('saved');
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="page-header-with-badge">
          <div>
            <h2>
              <ChefHat className="header-icon" size={28} />
              AI Meal Planner
            </h2>
            <p className="subtitle">Generate personalized meal plans with Llama 3.3 AI</p>
          </div>
          <div className="ai-model-badge">
            <Sparkles size={14} />
            <span>Llama 3.3 70B</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="meal-plan-tabs">
          <button 
            className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            <Sparkles size={16} />
            Generate New
          </button>
          <button 
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <Save size={16} />
            Saved Plans ({savedPlans.length})
          </button>
        </div>

        {activeTab === 'generate' && (
          <div className="meal-plan-generator">
            {/* Settings Panel */}
            <div className="generator-settings">
              <div className="settings-section">
                <h3>
                  <Target size={18} />
                  Your Goal
                </h3>
                <div className="goal-grid">
                  {goals.map(g => (
                    <button
                      key={g.id}
                      className={`goal-card ${settings.goal === g.id ? 'active' : ''}`}
                      onClick={() => setSettings({ ...settings, goal: g.id })}
                    >
                      <g.icon size={24} />
                      <span className="goal-label">{g.label}</span>
                      <span className="goal-desc">{g.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section">
                <h3>
                  <Zap size={18} />
                  Nutrition Targets
                </h3>
                <div className="targets-grid">
                  <div className="target-input">
                    <label>Daily Calories</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        value={settings.calories}
                        onChange={e => setSettings({ ...settings, calories: parseInt(e.target.value) || 0 })}
                        min="1000"
                        max="5000"
                        step="50"
                        placeholder="Enter calories"
                      />
                      <span>kcal</span>
                    </div>
                  </div>

                  <div className="target-input">
                    <label>Daily Protein</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        value={settings.protein}
                        onChange={e => setSettings({ ...settings, protein: parseInt(e.target.value) || 0 })}
                        min="30"
                        max="300"
                        step="5"
                        placeholder="Enter protein"
                      />
                      <span>grams</span>
                    </div>
                  </div>

                  <div className="target-input">
                    <label>Daily Fat</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        value={settings.fat}
                        onChange={e => setSettings({ ...settings, fat: parseInt(e.target.value) || 0 })}
                        min="20"
                        max="200"
                        step="5"
                        placeholder="Enter fat"
                      />
                      <span>grams</span>
                    </div>
                  </div>
                  <div className="target-input">
                    <label>Meals Per Day</label>
                    <div className="meals-selector">
                      {[2, 3, 4, 5, 6].map(m => (
                        <button
                          key={m}
                          className={settings.meals === m ? 'active' : ''}
                          onClick={() => setSettings({ ...settings, meals: m })}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="target-input">
                    <label>Portion Size</label>
                    <div className="portion-selector">
                      {portionSizes.map(p => (
                        <button
                          key={p.id}
                          className={settings.portionSize === p.id ? 'active' : ''}
                          onClick={() => setSettings({ ...settings, portionSize: p.id })}
                          title={p.desc}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3>
                  <Salad size={18} />
                  Diet Type
                </h3>
                
                {/* Popular Diet Types */}
                <div className="diet-popular">
                  {popularDiets.map(d => (
                    <button
                      key={d.id}
                      className={`diet-btn-main ${settings.dietType === d.id ? 'active' : ''}`}
                      onClick={() => setSettings({ ...settings, dietType: d.id })}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* All Diet Types Dropdown */}
                <div className="diet-all-wrapper">
                  <button 
                    className="diet-all-toggle"
                    onClick={() => setShowAllDiets(!showAllDiets)}
                  >
                    <span>Browse All Diet Types ({allDietTypes.length})</span>
                    {showAllDiets ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  
                  {showAllDiets && (
                    <div className="diet-all-dropdown">
                      {['General', 'Plant-Based', 'Low-Carb', 'Regional', 'Health-Focused', 'Specialty'].map(category => (
                        <div key={category} className="diet-category">
                          <div className="diet-category-label">{category}</div>
                          <div className="diet-category-items">
                            {allDietTypes.filter(d => d.category === category).map(d => (
                              <button
                                key={d.id}
                                className={`diet-btn-mini ${settings.dietType === d.id ? 'active' : ''}`}
                                onClick={() => {
                                  setSettings({ ...settings, dietType: d.id });
                                  setShowAllDiets(false);
                                }}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Show current selection if not in popular */}
                {!popularDiets.find(d => d.id === settings.dietType) && (
                  <div className="current-diet-badge">
                    <Leaf size={14} />
                    Selected: {allDietTypes.find(d => d.id === settings.dietType)?.label || settings.dietType}
                  </div>
                )}
              </div>

              <div className="settings-section">
                <h3>
                  <Apple size={18} />
                  Dietary Restrictions
                </h3>
                
                {/* Popular Restrictions */}
                <div className="restriction-popular">
                  {popularRestrictions.map(r => (
                    <button
                      key={r}
                      className={`restriction-btn-main ${settings.restrictions.includes(r) ? 'active' : ''}`}
                      onClick={() => toggleRestriction(r)}
                    >
                      {r.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>

                {/* Show selected restrictions badge */}
                {settings.restrictions.length > 0 && (
                  <div className="current-restriction-badge">
                    Selected: {settings.restrictions.map(r => 
                      r.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                    ).join(', ')}
                  </div>
                )}

                {/* Browse All Restrictions Dropdown */}
                <div className="restriction-all-wrapper">
                  <button 
                    className="restriction-all-toggle"
                    onClick={() => setShowAllRestrictions(!showAllRestrictions)}
                  >
                    {showAllRestrictions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    Browse All Dietary Restrictions
                    <span className="restriction-count">({allRestrictionTypes.length} options)</span>
                  </button>
                  
                  {showAllRestrictions && (
                    <div className="restriction-all-dropdown">
                      {Object.entries(restrictionCategories).map(([category, items]) => (
                        <div key={category} className="restriction-category">
                          <div className="restriction-category-label">{category}</div>
                          <div className="restriction-category-items">
                            {items.map(r => (
                              <button
                                key={r.id}
                                className={`restriction-btn-mini ${settings.restrictions.includes(r.id) ? 'active' : ''}`}
                                onClick={() => toggleRestriction(r.id)}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-section">
                <h3>
                  <Sparkles size={18} />
                  Custom Instructions (Optional)
                </h3>
                <textarea
                  className="custom-prompt"
                  value={settings.customPrompt}
                  onChange={e => setSettings({ ...settings, customPrompt: e.target.value })}
                  placeholder="Add any specific preferences... e.g., 'Include Indian breakfast options', 'No raw vegetables', 'Easy to cook meals only', 'Include post-workout snacks'"
                  rows={3}
                />
              </div>

              <button 
                className="generate-btn"
                onClick={generateMealPlan}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Generating Your Plan...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Meal Plan
                  </>
                )}
              </button>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
            </div>

            {/* Generated Plan */}
            {generatedPlan && (
              <div className="generated-plan">
                <div className="plan-header">
                  <div>
                    <h3>{generatedPlan.planName || 'Your Personalized Meal Plan'}</h3>
                    <p className="plan-meta">
                      <span><Zap size={14} /> {generatedPlan.totalCalories} kcal</span>
                      <span><Activity size={14} /> {generatedPlan.totalProtein}g protein</span>
                      <span><Droplet size={14} /> {generatedPlan.totalFat || Math.round(generatedPlan.totalCalories * 0.3 / 9)}g fat</span>
                      <span><UtensilsCrossed size={14} /> {generatedPlan.meals?.length || 0} meals</span>
                    </p>
                  </div>
                  <div className="plan-actions">
                    <button className="save-btn" onClick={handleSavePlan}>
                      <Save size={16} />
                      Save Plan
                    </button>
                    <button className="regenerate-btn" onClick={generateMealPlan} disabled={loading}>
                      <RefreshCw size={16} />
                      Regenerate
                    </button>
                  </div>
                </div>

                <div className="meals-grid">
                  {generatedPlan.meals?.map((meal, idx) => {
                    const mealIcon = getMealIcon(idx, generatedPlan.meals.length);
                    const mealColor = getMealColor(idx, generatedPlan.meals.length);
                    return (
                      <div key={idx} className="meal-card-v2" style={{'--meal-color': mealColor}}>
                        <div className="meal-card-accent"></div>
                        <div className="meal-card-content">
                          <div className="meal-icon-badge" style={{background: `${mealColor}20`, color: mealColor}}>
                            {mealIcon}
                          </div>
                          <div className="meal-header-v2">
                            <div className="meal-time-badge">
                              <Clock size={12} />
                              {meal.time || getMealTime(idx, generatedPlan.meals.length)}
                            </div>
                            <h4>{meal.name}</h4>
                          </div>
                          
                          <div className="meal-foods-v2">
                            {meal.foods?.map((food, i) => (
                              <span key={i} className="food-pill">{food}</span>
                            ))}
                          </div>

                          {meal.description && (
                            <p className="meal-description-v2">{meal.description}</p>
                          )}

                          <div className="meal-macros-v2">
                            <div className="macro-box calories">
                              <Zap size={14} />
                              <div className="macro-value">{meal.calories}</div>
                              <div className="macro-label">kcal</div>
                            </div>
                            <div className="macro-box protein">
                              <Activity size={14} />
                              <div className="macro-value">{meal.protein}g</div>
                              <div className="macro-label">protein</div>
                            </div>
                            {meal.carbs && (
                              <div className="macro-box carbs">
                                <Wheat size={14} />
                                <div className="macro-value">{meal.carbs}g</div>
                                <div className="macro-label">carbs</div>
                              </div>
                            )}
                            {meal.fat && (
                              <div className="macro-box fat">
                                <Droplet size={14} />
                                <div className="macro-value">{meal.fat}g</div>
                                <div className="macro-label">fat</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {generatedPlan.tips && generatedPlan.tips.length > 0 && (
                  <div className="plan-tips">
                    <h4>
                      <Sparkles size={16} />
                      AI Tips
                    </h4>
                    <ul>
                      {generatedPlan.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="saved-plans">
            {savedPlans.length === 0 ? (
              <div className="no-plans">
                <UtensilsCrossed size={48} />
                <h3>No saved meal plans yet</h3>
                <p>Generate a meal plan and save it for later!</p>
                <button onClick={() => setActiveTab('generate')}>
                  <Sparkles size={16} />
                  Generate Your First Plan
                </button>
              </div>
            ) : (
              <div className="plans-list">
                {savedPlans.map(plan => (
                  <div key={plan.id} className="saved-plan-card">
                    <div className="saved-plan-header">
                      <div>
                        <h3>{plan.planName || 'Meal Plan'}</h3>
                        <p className="saved-date">
                          Saved {new Date(plan.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button 
                        className="delete-btn"
                        onClick={() => deletePlan(plan.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="saved-plan-stats">
                      <span><Zap size={14} /> {plan.totalCalories} kcal</span>
                      <span><Activity size={14} /> {plan.totalProtein}g protein</span>
                      <span><UtensilsCrossed size={14} /> {plan.meals?.length || 0} meals</span>
                    </div>

                    <div className="saved-plan-meals">
                      {plan.meals?.slice(0, 3).map((meal, i) => (
                        <div key={i} className="mini-meal">
                          <strong>{meal.name}</strong>
                          <span>{meal.calories} kcal</span>
                        </div>
                      ))}
                      {plan.meals?.length > 3 && (
                        <div className="more-meals">+{plan.meals.length - 3} more meals</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function getMealTime(index, total) {
  const times = {
    2: ['10:00 AM', '6:00 PM'],
    3: ['8:00 AM', '1:00 PM', '7:00 PM'],
    4: ['8:00 AM', '12:00 PM', '4:00 PM', '8:00 PM'],
    5: ['7:00 AM', '10:00 AM', '1:00 PM', '5:00 PM', '8:00 PM'],
    6: ['7:00 AM', '9:30 AM', '12:30 PM', '3:30 PM', '6:30 PM', '9:00 PM']
  };
  return times[total]?.[index] || `Meal ${index + 1}`;
}

function getMealIcon(index, total) {
  const icons = {
    2: [<Sun size={22} />, <Moon size={22} />],
    3: [<Sun size={22} />, <Sandwich size={22} />, <Moon size={22} />],
    4: [<Coffee size={22} />, <Sandwich size={22} />, <Cookie size={22} />, <Moon size={22} />],
    5: [<Coffee size={22} />, <Apple size={22} />, <Sandwich size={22} />, <Cookie size={22} />, <Moon size={22} />],
    6: [<Coffee size={22} />, <Apple size={22} />, <Sandwich size={22} />, <Cookie size={22} />, <UtensilsCrossed size={22} />, <Moon size={22} />]
  };
  return icons[total]?.[index] || <UtensilsCrossed size={22} />;
}

function getMealColor(index, total) {
  // Warm amber/gold palette - no pink, purple, red, green, blue
  const colors = {
    2: ['#d4a574', '#c9a227'],
    3: ['#d4a574', '#b8956a', '#c9a227'],
    4: ['#e6b87a', '#d4a574', '#b8956a', '#c9a227'],
    5: ['#f0c896', '#e6b87a', '#d4a574', '#b8956a', '#c9a227'],
    6: ['#f5d4a8', '#e6b87a', '#d4a574', '#c9a227', '#a08060', '#8b7355']
  };
  return colors[total]?.[index] || '#d4a574';
}
