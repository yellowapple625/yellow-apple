# 🍎 YELLOW APPLE - Project Structure

> A Nutrition & Fitness Tracking App with AI-powered features

---

## 📁 Root Files

| File | Purpose |
|------|---------|
| `index.html` | Main HTML entry point for React app |
| `package.json` | NPM dependencies and scripts |
| `vite.config.js` | Vite bundler configuration |
| `.env` | Environment variables (API keys, DB config) |
| `.env.example` | Template for environment setup |
| `setup_db.sql` | PostgreSQL database schema |

---

## 🎨 FRONTEND (`/src`)

### Core App Files
| File | Purpose |
|------|---------|
| `main.jsx` | React entry point, renders App |
| `App.jsx` | Main app with all routes defined |
| `index.css` | Global styles & CSS variables |

### 📄 Pages (`/src/pages`)

#### 🔐 Authentication
| File | Description |
|------|-------------|
| `AuthPage.jsx` | User login & signup page |
| `AdminAuthPage.jsx` | Admin login with admin code |

#### 🏠 Dashboard
| File | Description |
|------|-------------|
| `Home.jsx` | Main user dashboard with quick stats |

#### 🥗 Nutrition Features
| File | Description |
|------|-------------|
| `FoodAnalyzerPage.jsx` | AI-powered food nutrition analysis |
| `MealPlanPage.jsx` | AI meal plan generator |
| `DailyTrackerPage.jsx` | Daily food & water tracking |

#### 💪 Fitness Features
| File | Description |
|------|-------------|
| `FitnessPage.jsx` | Activity tracking & Google Fit sync |
| `BmrPage.jsx` | BMR/TDEE calculator |

#### 🤖 AI Features
| File | Description |
|------|-------------|
| `AiCoachPage.jsx` | AI nutrition coach chat (Llama 3.3 70B) |

#### 📊 Reports & Analytics
| File | Description |
|------|-------------|
| `ReportPage.jsx` | Progress reports & analytics |
| `ReportStyles.css` | Styles for report page |

#### 💳 Subscription & Payments
| File | Description |
|------|-------------|
| `SubscriptionPage.jsx` | Plan selection & Razorpay payments |

#### 👨‍💼 Admin Panel
| File | Description |
|------|-------------|
| `AdminDashboard.jsx` | Admin dashboard with user management |

#### 📝 Miscellaneous
| File | Description |
|------|-------------|
| `NotesPage.jsx` | Personal notes feature |

### 🧩 Components (`/src/components`)

| File | Description |
|------|-------------|
| `Sidebar.jsx` | Navigation sidebar with toggle |

### 🎯 Context (`/src/context`)

| File | Description |
|------|-------------|
| `UserProfileContext.jsx` | Global user profile state management |

### 🎨 Styles (`/src/components/*.css`)

| File | Description |
|------|-------------|
| `AdminStyles.css` | Admin panel styling |
| `AiCoachChat.css` | AI chat interface styling |
| `DailyTrackerStyles.css` | Daily tracker styling |
| `HydrationStyles.css` | Water tracking styling |

---

## ⚙️ BACKEND (`/server`)

### Main Server
| File | Description |
|------|-------------|
| `index.js` | Express.js server with ALL API endpoints |

### AI Integration
| File | Description |
|------|-------------|
| `groq.js` | Groq AI service (Llama 3.3 70B model) |

### Configuration
| File | Description |
|------|-------------|
| `.env` | Server environment variables |
| `credentials.json` | Google OAuth credentials for Fit API |

---

## 🗄️ DATABASE

| File | Description |
|------|-------------|
| `setup_db.sql` | PostgreSQL schema with 10 tables |

### Database Tables

| Table | Purpose |
|-------|---------|
| `admin_users` | Admin authentication |
| `app_users` | User authentication & membership |
| `user_profiles` | User profile data & targets |
| `daily_tracking` | Daily water & macro totals |
| `food_log_entries` | Individual food items logged |
| `workout_log` | Exercise records |
| `daily_fitness` | Daily steps & activity |
| `saved_meal_plans` | AI-generated meal plans |
| `weight_history` | Weight tracking over time |
| `payments` | Razorpay payment records |

---

## 🔌 API Endpoints (server/index.js)

### 🔐 Authentication APIs
```
POST /api/user/signup      - User registration
POST /api/user/login       - User login
POST /api/admin/signup     - Admin registration
POST /api/admin/login      - Admin login
```

### 👤 User APIs
```
GET  /api/user/profile     - Get user profile
POST /api/user/profile     - Update user profile
GET  /api/user/data/sync   - Sync all user data
```

### 🥗 Nutrition APIs
```
POST /api/analyze-nutrition - AI food analysis
POST /api/food-log         - Log food item
GET  /api/food-log/:date   - Get food log for date
POST /api/generate-meal-plan - AI meal plan
```

### 💧 Tracking APIs
```
GET  /api/daily-tracking/:date  - Get daily tracking
POST /api/daily-tracking        - Update tracking
POST /api/water-log             - Log water intake
```

### 🤖 AI APIs
```
POST /api/ai/chat          - Chat with AI coach
GET  /api/ai/status        - Check AI availability
```

### 💪 Fitness APIs
```
GET  /api/google-fit/auth  - Start Google Fit OAuth
GET  /api/google-fit/callback - OAuth callback
GET  /api/google-fit/data  - Get fitness data
POST /api/workout-log      - Log workout
```

### 💳 Payment APIs
```
GET  /api/payment/key      - Get Razorpay key
POST /api/payment/create-order - Create payment order
POST /api/payment/verify   - Verify payment
GET  /api/payment/subscription - Get subscription status
```

### 👨‍💼 Admin APIs
```
GET  /api/admin/stats      - Dashboard statistics
GET  /api/admin/users      - List all users
GET  /api/admin/payments   - List all payments
PATCH /api/admin/users/:email/status - Toggle user status
PATCH /api/admin/users/:email/membership - Change membership
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 3. Setup database
psql -U postgres -d nutrition_db -f setup_db.sql

# 4. Run development
npm run dev      # Frontend (port 5173)
npm run server   # Backend (port 5174)

# Or run both together
npm start
```

---

## 🔑 Required API Keys

| Service | Get Key At | Used For |
|---------|-----------|----------|
| Groq AI | https://console.groq.com/keys | AI features (FREE) |
| Razorpay | https://dashboard.razorpay.com | Payments |
| Google Cloud | https://console.cloud.google.com | Google Fit |

---

## 📱 Routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | AuthPage | Public |
| `/home` | Home | User |
| `/home/food-analyzer` | FoodAnalyzerPage | User |
| `/home/ai-coach` | AiCoachPage | User |
| `/home/bmr` | BmrPage | User |
| `/home/activity` | FitnessPage | User |
| `/home/meal-plans` | MealPlanPage | User |
| `/home/daily-tracker` | DailyTrackerPage | User |
| `/home/reports` | ReportPage | User |
| `/home/subscription` | SubscriptionPage | User |
| `/home/notes` | NotesPage | User |
| `/admin/dashboard` | AdminDashboard | Admin |

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite + React Router
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL
- **AI**: Groq (Llama 3.3 70B)
- **Payments**: Razorpay
- **Fitness**: Google Fit API
- **Styling**: Custom CSS with CSS Variables
- **Icons**: Lucide React
