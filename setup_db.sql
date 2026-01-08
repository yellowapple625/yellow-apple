-- ============================================================
-- NutritionAI Database Schema (Optimized - 9 Tables)
-- Run this SQL script in PostgreSQL
-- ============================================================

-- ============================================================
-- 1. ADMIN USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default admin
INSERT INTO admin_users (email, password, name, role) 
VALUES ('admin@nutriai.com', 'admin123', 'Super Admin', 'superadmin')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. APP USERS TABLE (User Authentication)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  membership VARCHAR(50) DEFAULT 'free',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- ============================================================
-- 3. USER PROFILES TABLE (Profile + Targets + Settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE UNIQUE,
  
  -- Basic Info
  age INTEGER,
  gender VARCHAR(20),
  height FLOAT,
  weight FLOAT,
  activity_level VARCHAR(50) DEFAULT 'moderate',
  
  -- Calculated
  bmi FLOAT,
  bmr FLOAT,
  tdee FLOAT,
  
  -- Daily Targets
  calorie_target INTEGER DEFAULT 2000,
  protein_target INTEGER DEFAULT 100,
  carbs_target INTEGER DEFAULT 250,
  fat_target INTEGER DEFAULT 65,
  water_target INTEGER DEFAULT 8,
  step_goal INTEGER DEFAULT 10000,
  
  -- Preferences
  diet_type VARCHAR(50) DEFAULT 'balanced',
  restrictions TEXT[],
  
  -- Settings (merged - theme, units, notifications)
  settings JSONB DEFAULT '{"theme": "dark", "units": "metric", "notifications": true}',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. DAILY TRACKING TABLE (Water + Food Totals Combined)
-- All daily tracking in one table
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Water Tracking
  water_glasses INTEGER DEFAULT 0,
  water_target INTEGER DEFAULT 8,
  water_log JSONB DEFAULT '[]',
  
  -- Food/Macro Totals
  calories_consumed INTEGER DEFAULT 0,
  protein_consumed FLOAT DEFAULT 0,
  carbs_consumed FLOAT DEFAULT 0,
  fat_consumed FLOAT DEFAULT 0,
  
  -- Targets for the day
  calorie_target INTEGER DEFAULT 2000,
  protein_target INTEGER DEFAULT 100,
  carbs_target INTEGER DEFAULT 250,
  fat_target INTEGER DEFAULT 65,
  
  -- Micronutrients (weekly tracking as JSON)
  micros_log JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, date)
);

-- ============================================================
-- 5. FOOD LOG ENTRIES TABLE (Individual Food Items)
-- ============================================================
CREATE TABLE IF NOT EXISTS food_log_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  food_name VARCHAR(255) NOT NULL,
  meal_type VARCHAR(50),
  calories INTEGER DEFAULT 0,
  protein FLOAT DEFAULT 0,
  carbs FLOAT DEFAULT 0,
  fat FLOAT DEFAULT 0,
  
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. WORKOUT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  exercise_name VARCHAR(255) NOT NULL,
  exercise_type VARCHAR(50),
  duration_minutes INTEGER,
  calories_burned INTEGER DEFAULT 0,
  intensity VARCHAR(50),
  
  -- For strength training
  sets INTEGER,
  reps INTEGER,
  weight_kg FLOAT,
  
  -- For cardio
  distance_km FLOAT,
  
  source VARCHAR(50) DEFAULT 'manual',
  notes TEXT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. DAILY FITNESS SUMMARY TABLE (Steps + Activity)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_fitness (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  steps INTEGER DEFAULT 0,
  step_goal INTEGER DEFAULT 10000,
  calories_burned INTEGER DEFAULT 0,
  active_minutes INTEGER DEFAULT 0,
  workouts_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, date)
);

-- ============================================================
-- 8. SAVED MEAL PLANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_meal_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  
  plan_name VARCHAR(255),
  calories INTEGER,
  protein INTEGER,
  fat INTEGER,
  diet_type VARCHAR(50),
  goal VARCHAR(50),
  
  -- Full plan data as JSON
  plan_data JSONB NOT NULL,
  
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. WEIGHT HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS weight_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight FLOAT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, date)
);

-- ============================================================
-- 10. PAYMENTS TABLE (Payment Records)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  payment_id VARCHAR(255) UNIQUE NOT NULL,
  order_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  plan_id VARCHAR(50) NOT NULL,
  plan_name VARCHAR(100),
  status VARCHAR(50) DEFAULT 'captured',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_email);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_user_date ON daily_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_food_log_user_date ON food_log_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_user_date ON workout_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_fitness_user_date ON daily_fitness(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_user ON saved_meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_history(user_id, date);

-- ============================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_timestamp ON user_profiles;
CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_daily_timestamp ON daily_tracking;
CREATE TRIGGER update_daily_timestamp BEFORE UPDATE ON daily_tracking
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- Done! 9 tables created:
-- 1. admin_users      - Admin login
-- 2. app_users        - User authentication  
-- 3. user_profiles    - Profile + targets + settings
-- 4. daily_tracking   - Water + food totals + micros
-- 5. food_log_entries - Individual food items
-- 6. workout_log      - Exercise records
-- 7. daily_fitness    - Steps, calories burned
-- 8. saved_meal_plans - Meal plans
-- 9. weight_history   - Weight tracking
-- ============================================================
