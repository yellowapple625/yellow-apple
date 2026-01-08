import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  Utensils, Calculator, Zap, UtensilsCrossed, Footprints, Droplets, 
  LayoutDashboard, Flame, Beef, GlassWater, Activity, MapPin,
  Trophy, ChevronRight, Sparkles, Wheat, Droplet, Home as HomeIcon,
  Crown, StickyNote, Dumbbell, Timer
} from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import { BACKEND_URL } from '../config';

export default function Home() {
  const { profile } = useUserProfile();
  
  // Dashboard summary data from localStorage
  const [waterData, setWaterData] = useState({ consumed: 0, target: 8, glassSize: 250 });
  const [foodData, setFoodData] = useState({ 
    calories: 0, calorieTarget: 2000, 
    protein: 0, proteinTarget: 120, 
    carbs: 0, carbsTarget: 250,
    fat: 0, fatTarget: 65
  });
  const [fitnessData, setFitnessData] = useState({ 
    steps: 0, goal: 10000, distance: 0, caloriesBurned: 0, activeMinutes: 0, activities: [] 
  });
  
  useEffect(() => {
    const today = new Date().toDateString();
    
    // Load water data
    const savedWater = localStorage.getItem('ya_hydration');
    if (savedWater) {
      const data = JSON.parse(savedWater);
      if (data.date === today) {
        setWaterData({
          consumed: data.consumed || 0,
          target: data.target || 8,
          glassSize: data.glassSize || 250
        });
      } else {
        setWaterData({ consumed: 0, target: data.target || 8, glassSize: data.glassSize || 250 });
      }
    }
    
    // Load food/macro data
    const savedFood = localStorage.getItem('ya_food_tracker');
    if (savedFood) {
      const data = JSON.parse(savedFood);
      if (data.date === today) {
        setFoodData({
          calories: data.caloriesConsumed || 0,
          calorieTarget: data.calorieTarget || 2000,
          protein: data.proteinConsumed || 0,
          proteinTarget: data.proteinTarget || 120,
          carbs: data.carbsConsumed || 0,
          carbsTarget: data.carbsTarget || 250,
          fat: data.fatConsumed || 0,
          fatTarget: data.fatTarget || 65
        });
      } else {
        setFoodData({
          calories: 0,
          calorieTarget: data.calorieTarget || 2000,
          protein: 0,
          proteinTarget: data.proteinTarget || 120,
          carbs: 0,
          carbsTarget: data.carbsTarget || 250,
          fat: 0,
          fatTarget: data.fatTarget || 65
        });
      }
    }
    
    // Load fitness data from Google Fit
    fetch(`${BACKEND_URL}/api/google-fit/activities`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setFitnessData({ 
            steps: data.steps || 0, 
            goal: 10000, 
            distance: data.distance || 0,
            caloriesBurned: data.calories || 0,
            activeMinutes: data.activeMinutes || 0,
            activities: data.activities || []
          });
        }
      })
      .catch(() => {});
  }, []);
  
  // Calculate progress percentages
  const waterProgress = Math.min((waterData.consumed / waterData.target) * 100, 100);
  const stepsProgress = Math.min((fitnessData.steps / fitnessData.goal) * 100, 100);
  const calorieProgress = Math.min((foodData.calories / foodData.calorieTarget) * 100, 100);
  const proteinProgress = Math.min((foodData.protein / foodData.proteinTarget) * 100, 100);
  const carbsProgress = Math.min((foodData.carbs / foodData.carbsTarget) * 100, 100);
  const fatProgress = Math.min((foodData.fat / foodData.fatTarget) * 100, 100);

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        {/* Welcome Header */}
        <div className="welcome-section">
          <div className="welcome-header">
            <h2>
              <HomeIcon className="header-icon" size={28} />
                {profile.name ? `Welcome back, ${profile.name}` : 'Welcome to Yellow Apple'}
            </h2>
          </div>
        </div>

        {/* Today's Overview - Titlebar */}
        <div className="dashboard-titlebar">
          <div className="titlebar-left">
            <LayoutDashboard size={24} />
            <h1>Today's Overview</h1>
          </div>
          <span className="titlebar-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Health & Fitness Cards */}
        <div className="dashboard-cards-grid">
          
          {/* Activities Card */}
          <Link to="/home/activity" className="dashboard-card fitness-card">
            <div className="card-header">
              <div className="card-icon fitness">
                <Activity size={22} />
              </div>
              <span className="card-title">Activities</span>
              <ChevronRight size={18} className="card-arrow" />
            </div>
            
            <div className="unified-card-content">
              <div className="ring-section">
                <div className="large-ring">
                  <svg viewBox="0 0 100 100">
                    <circle className="ring-bg" cx="50" cy="50" r="42" />
                    <circle 
                      className="ring-progress steps" 
                      cx="50" cy="50" r="42" 
                      strokeDasharray={`${stepsProgress * 2.64} 264`}
                    />
                  </svg>
                  <div className="ring-center">
                    <span className="ring-main-value">{fitnessData.steps.toLocaleString()}</span>
                    <small>steps</small>
                  </div>
                </div>
                {stepsProgress >= 100 && (
                  <div className="goal-badge">
                    <Trophy size={12} /> Goal!
                  </div>
                )}
              </div>
              
              <div className="card-stats">
                <div className="card-stat">
                  <MapPin size={16} />
                  <div className="stat-info">
                    <span className="stat-value">{fitnessData.distance.toFixed(2)} km</span>
                    <span className="stat-label">Distance</span>
                  </div>
                </div>
                <div className="card-stat">
                  <Flame size={16} />
                  <div className="stat-info">
                    <span className="stat-value">{fitnessData.caloriesBurned} kcal</span>
                    <span className="stat-label">Burned</span>
                  </div>
                </div>
                {fitnessData.activities.length > 0 ? (
                  <div className="card-stat activity-highlight">
                    <Dumbbell size={16} />
                    <div className="stat-info">
                      <span className="stat-value">{fitnessData.activities[0].name}</span>
                      <span className="stat-label">{fitnessData.activities[0].duration} min</span>
                    </div>
                  </div>
                ) : (
                  <div className="card-stat">
                    <Timer size={16} />
                    <div className="stat-info">
                      <span className="stat-value">{fitnessData.activeMinutes} min</span>
                      <span className="stat-label">Active</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Nutrition Card */}
          <Link to="/home/daily-tracker" className="dashboard-card nutrition-card">
            <div className="card-header">
              <div className="card-icon macros">
                <Flame size={22} />
              </div>
              <span className="card-title">Nutrition</span>
              <ChevronRight size={18} className="card-arrow" />
            </div>
            
            <div className="unified-card-content">
              <div className="ring-section">
                <div className="large-ring">
                  <svg viewBox="0 0 100 100">
                    <circle className="ring-bg" cx="50" cy="50" r="42" />
                    <circle 
                      className="ring-progress calories" 
                      cx="50" cy="50" r="42" 
                      strokeDasharray={`${calorieProgress * 2.64} 264`}
                    />
                  </svg>
                  <div className="ring-center">
                    <span className="ring-main-value">{foodData.calories}</span>
                    <small>kcal</small>
                  </div>
                </div>
                {calorieProgress >= 100 && (
                  <div className="goal-badge calories">
                    <Trophy size={12} /> Goal!
                  </div>
                )}
              </div>
              
              <div className="card-stats">
                <div className="card-stat">
                  <Beef size={16} />
                  <div className="stat-info">
                    <span className="stat-value">{foodData.protein}g / {foodData.proteinTarget}g</span>
                    <span className="stat-label">Protein</span>
                  </div>
                </div>
                <div className="card-stat">
                  <Wheat size={16} />
                  <div className="stat-info">
                    <span className="stat-value">{foodData.carbs}g / {foodData.carbsTarget}g</span>
                    <span className="stat-label">Carbs</span>
                  </div>
                </div>
                <div className="card-stat">
                  <Droplet size={16} />
                  <div className="stat-info">
                    <span className="stat-value">{foodData.fat}g / {foodData.fatTarget}g</span>
                    <span className="stat-label">Fat</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Hydration Card */}
          <Link to="/home/daily-tracker" className="dashboard-card hydration-card">
            <div className="card-header">
              <div className="card-icon water">
                <GlassWater size={22} />
              </div>
              <span className="card-title">Hydration</span>
              <ChevronRight size={18} className="card-arrow" />
            </div>
            
            <div className="unified-card-content">
              <div className="ring-section">
                <div className="large-ring">
                  <svg viewBox="0 0 100 100">
                    <circle className="ring-bg" cx="50" cy="50" r="42" />
                    <circle 
                      className="ring-progress water" 
                      cx="50" cy="50" r="42" 
                      strokeDasharray={`${waterProgress * 2.64} 264`}
                    />
                  </svg>
                  <div className="ring-center">
                    <span className="ring-main-value">{waterData.consumed}</span>
                    <small>glasses</small>
                  </div>
                </div>
                {waterProgress >= 100 && (
                  <div className="goal-badge water">
                    <Trophy size={12} /> Hydrated!
                  </div>
                )}
              </div>
              
              <div className="card-stats">
                <div className="card-stat">
                  <Droplets size={16} />
                  <div className="stat-info">
                    <span className="stat-value">{waterData.consumed * waterData.glassSize} ml</span>
                    <span className="stat-label">Consumed</span>
                  </div>
                </div>
                <div className="card-stat">
                  <GlassWater size={16} />
                  <div className="stat-info">
                    <span className="stat-value">{Math.max(0, (waterData.target - waterData.consumed) * waterData.glassSize)} ml</span>
                    <span className="stat-label">Remaining</span>
                  </div>
                </div>
                <div className="card-stat">
                  <Activity size={16} />
                  <div className="stat-info">
                    <span className="stat-value">{Math.round(waterProgress)}%</span>
                    <span className="stat-label">Progress</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Explore Section */}
        <div className="quick-actions-section">
          <h3><Zap size={20} /> Explore</h3>
          <div className="features-grid">
            <Link to="/home/food-analyzer" className="feature-card">
              <div className="feature-icon-wrapper">
                <Utensils size={24} />
              </div>
              <h3>Food Analyzer</h3>
              <p>Analyze any food or recipe and get instant nutritional breakdown with AI.</p>
            </Link>
            
            <Link to="/home/meal-plans" className="feature-card">
              <div className="feature-icon-wrapper">
                <UtensilsCrossed size={24} />
              </div>
              <h3>AI Meal Planner</h3>
              <p>Generate personalized meal plans based on your goals and preferences.</p>
            </Link>
            
            <Link to="/home/ai-coach" className="feature-card">
              <div className="feature-icon-wrapper">
                <Sparkles size={24} />
              </div>
              <h3>AI Nutrition Coach</h3>
              <p>Chat with your personal AI coach for diet advice and tips.</p>
            </Link>
            
            <Link to="/home/bmr" className="feature-card">
              <div className="feature-icon-wrapper">
                <Calculator size={24} />
              </div>
              <h3>BMR Calculator</h3>
              <p>Calculate your Basal Metabolic Rate and daily calorie needs.</p>
            </Link>
            
            <Link to="/home/activity" className="feature-card">
              <div className="feature-icon-wrapper">
                <Footprints size={24} />
              </div>
              <h3>Activity & Steps</h3>
              <p>Connect Google Fit to track steps, distance and workouts.</p>
            </Link>
            
            <Link to="/home/daily-tracker" className="feature-card">
              <div className="feature-icon-wrapper">
                <Droplets size={24} />
              </div>
              <h3>Daily Tracker</h3>
              <p>Track water, calories, protein & macros all in one place.</p>
            </Link>
            
            <Link to="/home/notes" className="feature-card">
              <div className="feature-icon-wrapper">
                <StickyNote size={24} />
              </div>
              <h3>My Notes</h3>
              <p>Write and organize your nutrition notes, meal ideas and goals.</p>
            </Link>
            
            <Link to="/home/subscription" className="feature-card">
              <div className="feature-icon-wrapper">
                <Crown size={24} />
              </div>
              <h3>Subscription</h3>
              <p>Manage your plan and unlock AI-powered nutrition features.</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
