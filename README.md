# 🍎 YELLOW APPLE

> AI-Powered Nutrition & Fitness Tracking Application

![Version](https://img.shields.io/badge/version-2.0.0-yellow)
![License](https://img.shields.io/badge/license-MIT-green)
![AI](https://img.shields.io/badge/AI-Llama%203.3%2070B-orange)

---

## ✨ Features

### 🥗 Nutrition
- **AI Food Analyzer** - Instant nutrition breakdown for any food
- **AI Meal Planner** - Personalized meal plans based on your goals
- **Daily Tracker** - Log meals, track macros & water intake

### 💪 Fitness
- **Activity Tracking** - Log workouts and exercises
- **Google Fit Sync** - Import steps and activity data
- **BMR Calculator** - Calculate metabolic rate & calorie needs

### 🤖 AI Coach
- **Chat Assistant** - Powered by Llama 3.3 70B via Groq
- **Personalized Advice** - Diet tips based on your profile
- **24/7 Available** - Get instant nutrition guidance

### 📊 Analytics
- **Progress Reports** - Weekly and monthly summaries
- **Weight Tracking** - Monitor changes over time
- **Goal Tracking** - Visual progress towards targets

### 💳 Premium Features
- **Free Plan** - Basic tracking features
- **Premium Plan** - Full AI features, unlimited meal plans

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Groq API Key (free at https://console.groq.com/keys)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd "YELLOW APPLE"

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Setup database
psql -U postgres -c "CREATE DATABASE nutrition_db;"
psql -U postgres -d nutrition_db -f setup_db.sql

# Start development servers
npm start
```

### Access
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5174

---

## 📁 Project Structure

```
YELLOW APPLE/
├── 📄 index.html              # HTML entry point
├── 📄 package.json            # Dependencies
├── 📄 vite.config.js          # Vite config
├── 📄 setup_db.sql            # Database schema
├── 📄 .env.example            # Environment template
│
├── 📁 src/                    # FRONTEND
│   ├── 📄 App.jsx             # Routes & app structure
│   ├── 📄 main.jsx            # React entry
│   ├── 📄 index.css           # Global styles
│   │
│   ├── 📁 pages/              # Page Components
│   │   ├── AuthPage.jsx       # 🔐 User login/signup
│   │   ├── AdminAuthPage.jsx  # 🔐 Admin login
│   │   ├── Home.jsx           # 🏠 Dashboard
│   │   ├── FoodAnalyzerPage   # 🥗 AI food analysis
│   │   ├── MealPlanPage.jsx   # 🥗 AI meal plans
│   │   ├── DailyTrackerPage   # 🥗 Daily tracking
│   │   ├── FitnessPage.jsx    # 💪 Activity tracking
│   │   ├── BmrPage.jsx        # 💪 BMR calculator
│   │   ├── AiCoachPage.jsx    # 🤖 AI chat coach
│   │   ├── ReportPage.jsx     # 📊 Reports
│   │   ├── SubscriptionPage   # 💳 Payments
│   │   ├── AdminDashboard     # 👨‍💼 Admin panel
│   │   └── NotesPage.jsx      # 📝 Notes
│   │
│   ├── 📁 components/         # Reusable Components
│   │   └── Sidebar.jsx        # Navigation sidebar
│   │
│   └── 📁 context/            # React Context
│       └── UserProfileContext # User state
│
├── 📁 server/                 # BACKEND
│   ├── 📄 index.js            # Express server & APIs
│   ├── 📄 groq.js             # AI service (Llama 3.3)
│   ├── 📄 credentials.json    # Google OAuth
│   └── 📄 .env                # Server config
│
└── 📄 PROJECT_STRUCTURE.md    # Detailed documentation
```

---

## 🔑 Environment Variables

```env
# AI (Required)
GROQ_API_KEY=your_groq_key

# Server
PORT=5174
JWT_SECRET=your_secret

# Database
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_NAME=nutrition_db

# Payments (Optional)
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router |
| Backend | Express.js, Node.js |
| Database | PostgreSQL |
| AI | Groq (Llama 3.3 70B) |
| Payments | Razorpay |
| Fitness | Google Fit API |
| Icons | Lucide React |

---

## 📱 Screenshots

### Dashboard
User home with quick stats and AI status

### AI Coach
Chat interface with Llama 3.3 powered assistant

### Daily Tracker
Food logging with macro tracking

### Admin Panel
User management and analytics

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) - Fast AI inference
- [Lucide](https://lucide.dev) - Beautiful icons
- [Razorpay](https://razorpay.com) - Payment gateway
