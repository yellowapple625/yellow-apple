import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useUserProfile } from '../context/UserProfileContext';
import { 
  Calculator, Flame, TrendingDown, TrendingUp, Activity, Info,
  Dumbbell, Heart, Timer, Plus, Trash2,
  Zap, Target, MapPin, Clock, Repeat, Hash, AlertCircle
} from 'lucide-react';
import { BACKEND_URL } from '../config';

// Workout log storage key
const WORKOUT_LOG_KEY = 'nutri_workout_log';

export default function BmrPage() {
  const { profile, isProfileComplete, updateProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState('bmr');
  
  // Custom input states (optional - overrides profile if provided)
  const [customWeight, setCustomWeight] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [customAge, setCustomAge] = useState('');
  const [useCustomValues, setUseCustomValues] = useState(false);
  
  // Get profile data (with custom override)
  const profileWeight = profile.weight ? parseFloat(profile.weight) : 70;
  const profileHeight = profile.height ? parseFloat(profile.height) : 170;
  const profileAge = profile.age ? parseInt(profile.age) : 25;
  
  // Use custom values if provided, otherwise use profile
  const userWeight = customWeight ? parseFloat(customWeight) : profileWeight;
  const userHeight = customHeight ? parseFloat(customHeight) : profileHeight;
  const userAge = customAge ? parseInt(customAge) : profileAge;
  const userGender = profile.gender || 'male';
  
  // BMR Calculator States
  const [activity, setActivity] = useState('1.2');
  const [bmrResult, setBmrResult] = useState(null);

  // Workout Calculator States - Manual Input
  const [workoutType, setWorkoutType] = useState('gym');
  const [exerciseName, setExerciseName] = useState('');
  
  // Gym parameters - all manual
  const [gymSets, setGymSets] = useState('');
  const [gymReps, setGymReps] = useState('');
  const [gymWeight, setGymWeight] = useState(''); // Weight lifted (kg) - dumbbells, barbells
  const [gymRestTime, setGymRestTime] = useState('');
  const [gymIntensity, setGymIntensity] = useState('moderate');
  
  // Cardio parameters - all manual
  const [cardioDuration, setCardioDuration] = useState('');
  const [cardioDistance, setCardioDistance] = useState('');
  const [cardioIntensity, setCardioIntensity] = useState('moderate');
  
  // Sports parameters - all manual
  const [sportsDuration, setSportsDuration] = useState('');
  const [sportsIntensity, setSportsIntensity] = useState('moderate');
  
  // Results & Loading
  const [calculationResult, setCalculationResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [workoutLog, setWorkoutLog] = useState([]);
  const [totalBurned, setTotalBurned] = useState(0);

  const intensityMultipliers = {
    light: 0.75,
    moderate: 1.0,
    intense: 1.25,
    extreme: 1.5,
  };

  // Get auth token
  const getAuthToken = () => localStorage.getItem('ya_client_token');

  // Load workout log from database on mount
  useEffect(() => {
    fetchTodayWorkouts();
  }, []);

  const fetchTodayWorkouts = async () => {
    const token = getAuthToken();
    if (!token) {
      // Fallback to localStorage if not logged in
      const savedLog = localStorage.getItem(WORKOUT_LOG_KEY);
      if (savedLog) {
        try {
          const parsed = JSON.parse(savedLog);
          const today = new Date().toDateString();
          const todayWorkouts = parsed.filter(w => new Date(w.timestamp).toDateString() === today);
          setWorkoutLog(todayWorkouts);
          setTotalBurned(todayWorkouts.reduce((sum, w) => sum + w.calories, 0));
        } catch (e) {
          console.error('Error loading workout log:', e);
        }
      }
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/tracking/workouts/period?period=day`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkoutLog(data.workouts || []);
        setTotalBurned(data.totals?.calories_burned || 0);
      }
    } catch (err) {
      console.error('Error fetching workouts:', err);
    }
  };

  // Auto-calculate BMR on profile or custom value change
  useEffect(() => {
    if ((profile.weight || customWeight) && (profile.height || customHeight) && (profile.age || customAge)) {
      calculateBMR();
    }
  }, [profile.weight, profile.height, profile.age, userGender, activity, customWeight, customHeight, customAge]);

  const calculateBMR = () => {
    let bmr;
    
    // Mifflin-St Jeor Equation
    if (userGender === 'male') {
      bmr = 10 * userWeight + 6.25 * userHeight - 5 * userAge + 5;
    } else {
      bmr = 10 * userWeight + 6.25 * userHeight - 5 * userAge - 161;
    }
    
    const tdee = bmr * parseFloat(activity);
    const weightLossCal = tdee - 500;
    const weightGainCal = tdee + 500;
    
    // Calculate macros based on TDEE
    // Protein: 1.6-2.2g per kg body weight (using 2g for active people)
    // Fat: 25-35% of calories (using 30%)
    // Carbs: remaining calories
    
    const proteinPerKg = parseFloat(activity) >= 1.55 ? 2.0 : 1.6; // More protein for active people
    const protein = Math.round(userWeight * proteinPerKg);
    const fatPercent = 0.30;
    const fat = Math.round((tdee * fatPercent) / 9); // 9 cal per gram of fat
    const carbsCalories = tdee - (protein * 4) - (fat * 9); // Remaining calories for carbs
    const carbs = Math.round(carbsCalories / 4); // 4 cal per gram of carbs
    
    // Weight loss macros (higher protein to preserve muscle)
    const lossProtein = Math.round(userWeight * 2.2); // Higher protein during deficit
    const lossFat = Math.round((weightLossCal * 0.25) / 9);
    const lossCarbs = Math.round((weightLossCal - (lossProtein * 4) - (lossFat * 9)) / 4);
    
    // Weight gain macros
    const gainProtein = Math.round(userWeight * 2.0);
    const gainFat = Math.round((weightGainCal * 0.30) / 9);
    const gainCarbs = Math.round((weightGainCal - (gainProtein * 4) - (gainFat * 9)) / 4);
    
    setBmrResult({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      weightLoss: Math.round(weightLossCal),
      weightGain: Math.round(weightGainCal),
      // Maintenance macros
      protein,
      fat,
      carbs,
      // Weight loss macros
      lossProtein,
      lossFat,
      lossCarbs,
      // Weight gain macros
      gainProtein,
      gainFat,
      gainCarbs,
    });
  };

  // Calculate gym exercise calories
  const calculateGymCalories = async () => {
    if (!exerciseName.trim()) return;
    
    const sets = parseInt(gymSets) || 3;
    const reps = parseInt(gymReps) || 10;
    const rest = parseInt(gymRestTime) || 60;
    const liftingWeight = parseFloat(gymWeight) || 0; // Weight lifted in kg
    
    setIsCalculating(true);
    setCalculationResult(null);
    
    const estimatedWorkTime = sets * reps * 3;
    const totalRestTime = (sets - 1) * rest;
    const estimatedDuration = Math.ceil((estimatedWorkTime + totalRestTime) / 60);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/calculate-custom-calories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityDescription: exerciseName,
          activityType: 'gym',
          sets,
          reps,
          restTime: rest,
          liftingWeight,
          intensity: gymIntensity,
          weight: userWeight,
          height: userHeight,
          age: userAge,
        }),
      });
      
      const data = await response.json();
      if (data.error) {
        fallbackGymCalculation(estimatedDuration, sets, reps, liftingWeight);
      } else {
        setCalculationResult({ ...data, sets, reps, duration: estimatedDuration, liftingWeight });
      }
    } catch (err) {
      fallbackGymCalculation(estimatedDuration, sets, reps, liftingWeight);
    } finally {
      setIsCalculating(false);
    }
  };

  const fallbackGymCalculation = (duration, sets, reps, liftingWeight = 0) => {
    // Base MET for weight training is ~5.0
    // Heavier weights increase intensity and calorie burn
    const baseMet = 5.0;
    // Add bonus for lifting weight: +0.5 MET per 10kg lifted
    const weightBonus = liftingWeight > 0 ? (liftingWeight / 10) * 0.5 : 0;
    const met = (baseMet + weightBonus) * intensityMultipliers[gymIntensity];
    const calories = Math.round((met * userWeight * duration) / 60);
    setCalculationResult({
      calories,
      exercise: exerciseName,
      sets,
      reps,
      liftingWeight,
      duration,
      intensity: gymIntensity,
      tips: liftingWeight > 0 
        ? `Great work lifting ${liftingWeight}kg! Maintain proper form and stay hydrated.`
        : 'Maintain proper form and stay hydrated.',
    });
  };

  // Calculate cardio calories
  const calculateCardioCalories = async () => {
    if (!exerciseName.trim()) return;
    
    const duration = parseInt(cardioDuration) || 30;
    const distance = parseFloat(cardioDistance) || null;
    
    setIsCalculating(true);
    setCalculationResult(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/calculate-custom-calories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityDescription: exerciseName,
          activityType: 'cardio',
          duration,
          distance,
          intensity: cardioIntensity,
          weight: userWeight,
          height: userHeight,
          age: userAge,
        }),
      });
      
      const data = await response.json();
      if (data.error) {
        fallbackCardioCalculation(duration, distance);
      } else {
        setCalculationResult({ ...data, duration, distance });
      }
    } catch (err) {
      fallbackCardioCalculation(duration, distance);
    } finally {
      setIsCalculating(false);
    }
  };

  const fallbackCardioCalculation = (duration, distance) => {
    const baseMet = 7.0;
    const met = baseMet * intensityMultipliers[cardioIntensity];
    const calories = Math.round((met * userWeight * duration) / 60);
    setCalculationResult({
      calories,
      exercise: exerciseName,
      duration,
      distance,
      intensity: cardioIntensity,
      tips: 'Great cardio choice! Keep up the momentum.',
    });
  };

  // Calculate sports calories
  const calculateSportsCalories = async () => {
    if (!exerciseName.trim()) return;
    
    const duration = parseInt(sportsDuration) || 60;
    
    setIsCalculating(true);
    setCalculationResult(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/calculate-custom-calories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityDescription: exerciseName,
          activityType: 'sports',
          duration,
          intensity: sportsIntensity,
          weight: userWeight,
          height: userHeight,
          age: userAge,
        }),
      });
      
      const data = await response.json();
      if (data.error) {
        fallbackSportsCalculation(duration);
      } else {
        setCalculationResult({ ...data, duration });
      }
    } catch (err) {
      fallbackSportsCalculation(duration);
    } finally {
      setIsCalculating(false);
    }
  };

  const fallbackSportsCalculation = (duration) => {
    const baseMet = 6.0;
    const met = baseMet * intensityMultipliers[sportsIntensity];
    const calories = Math.round((met * userWeight * duration) / 60);
    setCalculationResult({
      calories,
      exercise: exerciseName,
      duration,
      intensity: sportsIntensity,
      tips: 'Sports are a great way to burn calories while having fun!',
    });
  };

  const handleCalculate = () => {
    if (workoutType === 'gym') calculateGymCalories();
    else if (workoutType === 'cardio') calculateCardioCalories();
    else calculateSportsCalories();
  };

  // Add workout to database
  const addToLog = async () => {
    if (!calculationResult) return;
    
    const token = getAuthToken();
    
    const workoutData = {
      exercise_name: calculationResult.exercise || exerciseName,
      exercise_type: workoutType,
      duration_minutes: calculationResult.duration || null,
      calories_burned: calculationResult.calories,
      intensity: calculationResult.intensity,
      sets: calculationResult.sets || null,
      reps: calculationResult.reps || null,
      distance_km: calculationResult.distance || null,
      source: 'calculator'
    };

    if (token) {
      // Save to database
      try {
        const response = await fetch(`${BACKEND_URL}/api/tracking/workouts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(workoutData)
        });

        if (response.ok) {
          // Refresh from database
          fetchTodayWorkouts();
        }
      } catch (err) {
        console.error('Error saving workout:', err);
      }
    } else {
      // Fallback to localStorage
      const newWorkout = {
        id: Date.now(),
        exercise: calculationResult.exercise || exerciseName,
        calories: calculationResult.calories,
        duration: calculationResult.duration,
        type: workoutType,
        sets: calculationResult.sets,
        reps: calculationResult.reps,
        liftingWeight: calculationResult.liftingWeight,
        distance: calculationResult.distance,
        intensity: calculationResult.intensity,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString(),
      };
      
      const updatedLog = [newWorkout, ...workoutLog];
      setWorkoutLog(updatedLog);
      setTotalBurned(totalBurned + calculationResult.calories);
      localStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(updatedLog));
    }
    
    setCalculationResult(null);
    
    // Reset form
    setExerciseName('');
    setGymSets('');
    setGymReps('');
    setGymWeight('');
    setGymRestTime('');
    setCardioDuration('');
    setCardioDistance('');
    setSportsDuration('');
  };

  const removeWorkout = async (id) => {
    const token = getAuthToken();
    
    if (token) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/tracking/workouts/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          fetchTodayWorkouts();
        }
      } catch (err) {
        console.error('Error deleting workout:', err);
      }
    } else {
      const workout = workoutLog.find(w => w.id === id);
      if (workout) {
        setTotalBurned(totalBurned - (workout.calories || workout.calories_burned));
        const updatedLog = workoutLog.filter(w => w.id !== id);
        setWorkoutLog(updatedLog);
        if (updatedLog.length === 0) {
          localStorage.removeItem(WORKOUT_LOG_KEY);
        } else {
          localStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(updatedLog));
        }
      }
    }
  };

  const clearAllWorkouts = async () => {
    const token = getAuthToken();
    
    if (token) {
      // Delete all today's workouts from database
      for (const workout of workoutLog) {
        try {
          await fetch(`${BACKEND_URL}/api/tracking/workouts/${workout.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (err) {
          console.error('Error deleting workout:', err);
        }
      }
      fetchTodayWorkouts();
    } else {
      setWorkoutLog([]);
      setTotalBurned(0);
      localStorage.removeItem(WORKOUT_LOG_KEY);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="page-header-with-badge">
          <div>
            <h2>
              <Calculator className="header-icon" size={28} />
              Calorie Calculator
            </h2>
            <p className="subtitle">
              Calculate your BMR, TDEE, and track workout calories burned
              {isProfileComplete && (
                <span className="profile-badge">
                  Using your profile data
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Profile Data Banner */}
        <div className="profile-data-banner">
          <Info size={16} />
          <span>
            {(customWeight || customHeight || customAge) ? 'Using custom values: ' : 'Using profile: '}
            <strong>{userWeight}kg</strong>, <strong>{userHeight}cm</strong>, <strong>{userAge} years</strong>
          </span>
          {(customWeight || customHeight || customAge) && (
            <button 
              className="reset-custom-btn"
              onClick={() => { setCustomWeight(''); setCustomHeight(''); setCustomAge(''); }}
            >
              Reset to Profile
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="calculator-tabs">
          <button 
            className={`calc-tab ${activeTab === 'bmr' ? 'active' : ''}`}
            onClick={() => setActiveTab('bmr')}
          >
            <Flame size={18} />
            BMR and TDEE
          </button>
          <button 
            className={`calc-tab ${activeTab === 'workout' ? 'active' : ''}`}
            onClick={() => setActiveTab('workout')}
          >
            <Dumbbell size={18} />
            Workout Calories
          </button>
        </div>
        
        {/* BMR Calculator Tab */}
        {activeTab === 'bmr' && (
          <div className="bmr-container">
            <div className="bmr-form-card">
              <div className="card-header">
                <Activity size={20} />
                <h3>Your Details</h3>
              </div>
              
              <div className="custom-inputs-section">
                <p className="custom-inputs-label">Custom values (optional - leave empty to use profile)</p>
                <div className="custom-inputs-grid">
                  <div className="custom-input-group">
                    <label>Weight (kg)</label>
                    <input
                      type="number"
                      placeholder={`${profileWeight}`}
                      value={customWeight}
                      onChange={(e) => setCustomWeight(e.target.value)}
                      min="30"
                      max="300"
                    />
                  </div>
                  <div className="custom-input-group">
                    <label>Height (cm)</label>
                    <input
                      type="number"
                      placeholder={`${profileHeight}`}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      min="100"
                      max="250"
                    />
                  </div>
                  <div className="custom-input-group">
                    <label>Age (years)</label>
                    <input
                      type="number"
                      placeholder={`${profileAge}`}
                      value={customAge}
                      onChange={(e) => setCustomAge(e.target.value)}
                      min="10"
                      max="120"
                    />
                  </div>
                </div>
              </div>
              
              <div className="profile-info-display">
                <div className="info-item">
                  <span className="info-label">Using Weight</span>
                  <span className="info-value">{userWeight} kg</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Using Height</span>
                  <span className="info-value">{userHeight} cm</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Using Age</span>
                  <span className="info-value">{userAge} years</span>
                </div>
              </div>
              
              <div className="form-group">
                <label>Gender</label>
                <div className="gender-toggle">
                  <button 
                    type="button"
                    className={userGender === 'male' ? 'active' : ''}
                    onClick={() => updateProfile({ gender: 'male' })}
                  >
                    Male
                  </button>
                  <button 
                    type="button"
                    className={userGender === 'female' ? 'active' : ''}
                    onClick={() => updateProfile({ gender: 'female' })}
                  >
                    Female
                  </button>
                </div>
              </div>
              
              <div className="form-group full-width">
                <label>Activity Level</label>
                <div className="activity-options">
                  {[
                    { value: '1.2', label: 'Sedentary', desc: 'Little or no exercise' },
                    { value: '1.375', label: 'Light', desc: 'Exercise 1-3 days/week' },
                    { value: '1.55', label: 'Moderate', desc: 'Exercise 3-5 days/week' },
                    { value: '1.725', label: 'Active', desc: 'Exercise 6-7 days/week' },
                    { value: '1.9', label: 'Very Active', desc: 'Hard exercise daily' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`activity-btn ${activity === opt.value ? 'active' : ''}`}
                      onClick={() => setActivity(opt.value)}
                    >
                      <span className="activity-label">{opt.label}</span>
                      <span className="activity-desc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {!isProfileComplete && (
                <div className="warning-box">
                  <AlertCircle size={16} />
                  <p>Complete your profile for automatic calculations</p>
                </div>
              )}
            </div>
            
            <div className="bmr-results-card">
              <div className="card-header">
                <Flame size={20} />
                <h3>Your Results</h3>
              </div>
              
              {bmrResult ? (
                <div className="results-content">
                  <div className="bmr-main-result">
                    <span className="bmr-label">Basal Metabolic Rate</span>
                    <span className="bmr-value">{bmrResult.bmr}</span>
                    <span className="bmr-unit">calories/day at rest</span>
                  </div>
                  
                  <div className="calorie-cards">
                    <div className="calorie-card maintain">
                      <Activity size={20} />
                      <span className="cal-label">Maintenance (TDEE)</span>
                      <span className="cal-value">{bmrResult.tdee}</span>
                      <span className="cal-unit">cal/day</span>
                      <div className="macro-breakdown">
                        <span>P: {bmrResult.protein}g</span>
                        <span>C: {bmrResult.carbs}g</span>
                        <span>F: {bmrResult.fat}g</span>
                      </div>
                    </div>
                    
                    <div className="calorie-card loss">
                      <TrendingDown size={20} />
                      <span className="cal-label">Weight Loss</span>
                      <span className="cal-value">{bmrResult.weightLoss}</span>
                      <span className="cal-unit">cal/day (-500)</span>
                      <div className="macro-breakdown">
                        <span>P: {bmrResult.lossProtein}g</span>
                        <span>C: {bmrResult.lossCarbs}g</span>
                        <span>F: {bmrResult.lossFat}g</span>
                      </div>
                    </div>
                    
                    <div className="calorie-card gain">
                      <TrendingUp size={20} />
                      <span className="cal-label">Weight Gain</span>
                      <span className="cal-value">{bmrResult.weightGain}</span>
                      <span className="cal-unit">cal/day (+500)</span>
                      <div className="macro-breakdown">
                        <span>P: {bmrResult.gainProtein}g</span>
                        <span>C: {bmrResult.gainCarbs}g</span>
                        <span>F: {bmrResult.gainFat}g</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="info-box">
                    <Info size={16} />
                    <p>
                      Your BMR is the calories your body burns at complete rest. 
                      TDEE factors in activity. <strong>P</strong>=Protein, <strong>C</strong>=Carbs, <strong>F</strong>=Fat (in grams).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="results-placeholder">
                  <Calculator size={48} />
                  <p>Complete your profile to see your BMR and daily calorie needs.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workout Calories Calculator Tab */}
        {activeTab === 'workout' && (
          <div className="workout-calculator">
            <div className="workout-form-card">
              <div className="card-header">
                <Dumbbell size={20} />
                <h3>Calculate Calories Burned</h3>
              </div>

              {/* Workout Type Selector */}
              <div className="workout-type-selector">
                <button 
                  className={`type-btn ${workoutType === 'gym' ? 'active' : ''}`}
                  onClick={() => { setWorkoutType('gym'); setCalculationResult(null); setExerciseName(''); }}
                >
                  <Dumbbell size={18} />
                  Gym
                </button>
                <button 
                  className={`type-btn ${workoutType === 'cardio' ? 'active' : ''}`}
                  onClick={() => { setWorkoutType('cardio'); setCalculationResult(null); setExerciseName(''); }}
                >
                  <Heart size={18} />
                  Cardio
                </button>
                <button 
                  className={`type-btn ${workoutType === 'sports' ? 'active' : ''}`}
                  onClick={() => { setWorkoutType('sports'); setCalculationResult(null); setExerciseName(''); }}
                >
                  <Activity size={18} />
                  Sports
                </button>
              </div>

              {/* Exercise Name Input */}
              <div className="exercise-input-section">
                <label>
                  {workoutType === 'gym' ? 'Exercise Name' : workoutType === 'cardio' ? 'Activity Name' : 'Sport Name'}
                </label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder={
                    workoutType === 'gym' ? 'e.g., Bench Press, Squats, Deadlift...' :
                    workoutType === 'cardio' ? 'e.g., Running, Cycling, Swimming...' :
                    'e.g., Basketball, Tennis, Football...'
                  }
                  className="exercise-name-input"
                />
              </div>

              {/* GYM Parameters */}
              {workoutType === 'gym' && (
                <div className="manual-params-section">
                  <div className="params-grid">
                    <div className="param-input-group">
                      <label><Hash size={14} /> Sets</label>
                      <input
                        type="number"
                        value={gymSets}
                        onChange={(e) => setGymSets(e.target.value)}
                        placeholder="3"
                        min="1"
                      />
                    </div>
                    <div className="param-input-group">
                      <label><Repeat size={14} /> Reps per Set</label>
                      <input
                        type="number"
                        value={gymReps}
                        onChange={(e) => setGymReps(e.target.value)}
                        placeholder="10"
                        min="1"
                      />
                    </div>
                    <div className="param-input-group">
                      <label><Dumbbell size={14} /> Weight (kg)</label>
                      <input
                        type="number"
                        value={gymWeight}
                        onChange={(e) => setGymWeight(e.target.value)}
                        placeholder="20"
                        min="0"
                        step="0.5"
                      />
                      <span className="input-hint">Dumbbell/Barbell weight</span>
                    </div>
                    <div className="param-input-group">
                      <label><Timer size={14} /> Rest (seconds)</label>
                      <input
                        type="number"
                        value={gymRestTime}
                        onChange={(e) => setGymRestTime(e.target.value)}
                        placeholder="60"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="intensity-section">
                    <label><Zap size={14} /> Intensity</label>
                    <div className="intensity-buttons">
                      {['light', 'moderate', 'intense', 'extreme'].map(i => (
                        <button
                          key={i}
                          className={gymIntensity === i ? 'active' : ''}
                          onClick={() => setGymIntensity(i)}
                        >{i}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CARDIO Parameters */}
              {workoutType === 'cardio' && (
                <div className="manual-params-section">
                  <div className="params-grid">
                    <div className="param-input-group">
                      <label><Clock size={14} /> Duration (minutes)</label>
                      <input
                        type="number"
                        value={cardioDuration}
                        onChange={(e) => setCardioDuration(e.target.value)}
                        placeholder="30"
                        min="1"
                      />
                    </div>
                    <div className="param-input-group">
                      <label><MapPin size={14} /> Distance (km) - Optional</label>
                      <input
                        type="number"
                        value={cardioDistance}
                        onChange={(e) => setCardioDistance(e.target.value)}
                        placeholder="5"
                        min="0"
                        step="0.1"
                      />
                    </div>
                  </div>
                  
                  <div className="intensity-section">
                    <label><Zap size={14} /> Intensity</label>
                    <div className="intensity-buttons">
                      {['light', 'moderate', 'intense', 'extreme'].map(i => (
                        <button
                          key={i}
                          className={cardioIntensity === i ? 'active' : ''}
                          onClick={() => setCardioIntensity(i)}
                        >{i}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SPORTS Parameters */}
              {workoutType === 'sports' && (
                <div className="manual-params-section">
                  <div className="params-grid single">
                    <div className="param-input-group">
                      <label><Clock size={14} /> Duration (minutes)</label>
                      <input
                        type="number"
                        value={sportsDuration}
                        onChange={(e) => setSportsDuration(e.target.value)}
                        placeholder="60"
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div className="intensity-section">
                    <label><Zap size={14} /> Intensity</label>
                    <div className="intensity-buttons">
                      {['light', 'moderate', 'intense', 'extreme'].map(i => (
                        <button
                          key={i}
                          className={sportsIntensity === i ? 'active' : ''}
                          onClick={() => setSportsIntensity(i)}
                        >{i}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Calculate Button */}
              <button 
                className="calculate-btn"
                onClick={handleCalculate}
                disabled={isCalculating || !exerciseName.trim()}
              >
                {isCalculating ? (
                  <>
                    <Activity size={18} className="spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator size={18} />
                    Calculate Calories
                  </>
                )}
              </button>

              {/* Calculation Result */}
              {calculationResult && (
                <div className="calculation-result">
                  <div className="result-header">
                    <Flame size={24} />
                    <div>
                      <span className="result-exercise">{calculationResult.exercise || exerciseName}</span>
                      <span className="result-meta">
                        {calculationResult.sets && `${calculationResult.sets} sets x ${calculationResult.reps} reps`}
                        {calculationResult.duration && ` ${calculationResult.duration} min`}
                        {calculationResult.distance && ` ${calculationResult.distance} km`}
                        {calculationResult.intensity && ` - ${calculationResult.intensity}`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="result-calories">
                    <span className="cal-number">{calculationResult.calories}</span>
                    <span className="cal-label">calories burned</span>
                  </div>
                  
                  {calculationResult.tips && (
                    <div className="result-tips">
                      <Info size={14} />
                      <p>{calculationResult.tips}</p>
                    </div>
                  )}
                  
                  <button className="add-to-log-btn" onClick={addToLog}>
                    <Plus size={18} />
                    Add to Today's Log
                  </button>
                </div>
              )}
            </div>

            {/* Workout Log */}
            <div className="workout-log-card">
              <div className="card-header">
                <Target size={20} />
                <h3>Today's Log</h3>
                {workoutLog.length > 0 && (
                  <button className="clear-btn" onClick={clearAllWorkouts}>
                    <Trash2 size={14} />
                    Clear
                  </button>
                )}
              </div>

              <div className="total-burned">
                <Flame size={24} />
                <div>
                  <span className="total-label">Total Burned</span>
                  <span className="total-value">{totalBurned}</span>
                </div>
              </div>

              {workoutLog.length > 0 ? (
                <div className="workout-list">
                  {workoutLog.map(workout => (
                    <div key={workout.id} className="workout-item">
                      <div className="workout-icon">
                        {(workout.type || workout.exercise_type) === 'gym' ? <Dumbbell size={18} /> : 
                         (workout.type || workout.exercise_type) === 'cardio' ? <Heart size={18} /> : 
                         <Activity size={18} />}
                      </div>
                      <div className="workout-info">
                        <span className="workout-activity">{workout.exercise || workout.exercise_name}</span>
                        <span className="workout-meta">
                          {workout.sets && `${workout.sets}x${workout.reps}`}
                          {(workout.duration || workout.duration_minutes) && ` ${workout.duration || workout.duration_minutes}min`}
                          {(workout.distance || workout.distance_km) && ` ${workout.distance || workout.distance_km}km`}
                          {workout.intensity && ` • ${workout.intensity}`}
                        </span>
                      </div>
                      <div className="workout-calories">
                        <span className="calories-value">{workout.calories || workout.calories_burned}</span>
                        <span className="calories-unit">cal</span>
                      </div>
                      <button 
                        className="remove-btn"
                        onClick={() => removeWorkout(workout.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-log">
                  <Dumbbell size={48} />
                  <p>No workouts logged yet</p>
                  <span>Calculate and add activities to track calories</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
