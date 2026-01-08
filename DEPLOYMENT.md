# Yellow Apple - Deployment Guide

## Architecture
- **Frontend**: React + Vite → Deploy to **Vercel**
- **Backend**: Express.js → Deploy to **Railway** or **Render**
- **Database**: PostgreSQL → **Railway** or **Neon** (free tier available)

---

## Step 1: Deploy Database (Railway - Free)

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click "New Project" → "Provision PostgreSQL"
3. Once created, click on the PostgreSQL service
4. Go to "Variables" tab and copy:
   - `DATABASE_URL` (full connection string)
   - Or individual: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

5. Connect to the database and run `setup_db.sql`:
   ```bash
   # Using Railway CLI or pgAdmin with the connection details
   psql $DATABASE_URL < setup_db.sql
   ```

---

## Step 2: Deploy Backend (Railway)

1. In the same Railway project, click "New" → "GitHub Repo"
2. Select your repository
3. Railway will auto-detect it's a Node.js app
4. Go to "Variables" and add:
   ```
   PORT=5174
   JWT_SECRET=your-secure-secret-here-change-this
   ADMIN_EMAIL=your-admin-email
   ADMIN_PASSWORD=your-admin-password
   ADMIN_CODE=your-admin-code
   
   # Database (Railway auto-fills if you link services)
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   
   # Groq AI
   GROQ_API_KEY=your-groq-api-key
   
   # Frontend URL (update after deploying frontend)
   CLIENT_REDIRECT=https://your-app.vercel.app/home/activity?connected=1
   GOOGLE_REDIRECT_URI=https://your-backend.railway.app/api/google-fit/callback
   
   # Razorpay (optional)
   RAZORPAY_KEY_ID=your-key
   RAZORPAY_KEY_SECRET=your-secret
   ```

5. Set the start command: `node server/index.js`
6. Deploy and copy your backend URL (e.g., `https://yellow-apple-production.up.railway.app`)

---

## Step 3: Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "New Project" → Import your repository
3. Configure:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Add Environment Variables:
   ```
   VITE_BACKEND_URL=https://your-backend.railway.app
   ```

5. Deploy!

---

## Step 4: Update Google OAuth (IMPORTANT)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project → APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add to Authorized redirect URIs:
   ```
   https://your-backend.railway.app/api/google-fit/callback
   ```
5. Add to Authorized JavaScript origins:
   ```
   https://your-app.vercel.app
   https://your-backend.railway.app
   ```

---

## Step 5: Update Backend Environment

Go back to Railway and update:
```
CLIENT_REDIRECT=https://your-app.vercel.app/home/activity?connected=1
GOOGLE_REDIRECT_URI=https://your-backend.railway.app/api/google-fit/callback
```

---

## Quick Commands

### Build Frontend Locally
```bash
npm run build
```

### Test Production Build
```bash
npm run preview
```

---

## Environment Variables Summary

### Backend (Railway)
| Variable | Description |
|----------|-------------|
| PORT | 5174 |
| JWT_SECRET | Secure random string |
| DATABASE_URL | PostgreSQL connection string |
| GROQ_API_KEY | From console.groq.com |
| GOOGLE_REDIRECT_URI | Backend callback URL |
| CLIENT_REDIRECT | Frontend redirect after OAuth |
| ADMIN_EMAIL | Admin login email |
| ADMIN_PASSWORD | Admin login password |
| ADMIN_CODE | Admin registration code |

### Frontend (Vercel)
| Variable | Description |
|----------|-------------|
| VITE_BACKEND_URL | Your Railway backend URL |

---

## Troubleshooting

### CORS Issues
The backend already has CORS configured. If you get CORS errors, update `server/index.js`:
```javascript
app.use(cors({
  origin: ['https://your-app.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
```

### Database Connection
Make sure to run `setup_db.sql` on your production database before the app works.

### Google Fit Not Working
- Verify OAuth redirect URIs match exactly
- Ensure Google Fit API is enabled in Google Cloud Console
- Check that the production domain is in authorized JavaScript origins

---

## Free Tier Limits

- **Railway**: $5 free credit/month, then ~$5-10/month for small apps
- **Vercel**: Free for hobby projects, generous limits
- **Neon** (alt DB): Free tier with 0.5GB storage
- **Groq AI**: 14,400 free requests/day

Your app should run completely **free** on these services! 🎉
