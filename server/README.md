# ⚙️ Server Directory

Express.js backend server handling all API endpoints.

## Files

| File | Purpose |
|------|---------|
| `index.js` | Main server file with ALL API endpoints |
| `groq.js` | Groq AI service for Llama 3.3 integration |
| `credentials.json` | Google OAuth credentials for Fit API |
| `.env` | Server environment variables |

## API Categories in index.js

### 🔐 Authentication (Lines ~250-400)
- User signup/login
- Admin signup/login
- JWT token generation
- Session management

### 👤 User Management (Lines ~400-600)
- Profile CRUD operations
- User data sync
- Settings management

### 🥗 Nutrition APIs (Lines ~1500-1800)
- AI food analysis
- Meal plan generation
- Food logging

### 💧 Daily Tracking (Lines ~1800-2200)
- Water intake logging
- Macro tracking
- Daily summaries

### 🤖 AI Integration (Lines ~1350-1500)
- Chat with AI coach
- AI status checking
- Session management

### 💪 Fitness APIs (Lines ~2200-2600)
- Google Fit OAuth flow
- Activity data fetching
- Workout logging

### 💳 Payment APIs (Lines ~500-700)
- Razorpay order creation
- Payment verification
- Subscription management

### 👨‍💼 Admin APIs (Lines ~700-900)
- Dashboard statistics
- User management
- Payment history

## AI Service (groq.js)

```javascript
// Groq Service Features:
- generate(prompt)        // Single response
- chat(sessionId, msg)    // Conversation with history
- analyzeFood(foodName)   // Nutrition analysis
- getNutrition(food, portion) // Detailed nutrition
- analyzeRecipe(ingredients)  // Recipe analysis
```

## Environment Variables (.env)

```env
# Required
GROQ_API_KEY=           # For AI features
JWT_SECRET=             # For authentication
DB_PASSWORD=            # PostgreSQL password

# Optional
RAZORPAY_KEY_ID=        # For payments
RAZORPAY_KEY_SECRET=    # For payments
```
