import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import multer from 'multer';
import pkg from 'pg';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import GroqService from './groq.js';

const { Pool } = pkg;
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5174;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_CODE = process.env.ADMIN_CODE || '12345';
const CLIENT_REDIRECT = process.env.CLIENT_REDIRECT || 'http://localhost:5173/home/activity?connected=1';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5174/api/google-fit/callback';

// Razorpay Config (Test Mode)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_yourkeyid';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'yoursecretkey';

// Initialize Razorpay instance
let razorpayInstance = null;
try {
  razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized (Test Mode)');
} catch (err) {
  console.warn('⚠️  Razorpay not initialized:', err.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, 'credentials.json');

// Global state
let googleTokens = null;
let ai = null;
let aiModel = 'llama-3.3-70b-versatile';

// Token persistence file
const TOKENS_PATH = path.join(__dirname, 'google_tokens.json');

// Load saved Google tokens on startup
function loadGoogleTokens() {
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      const savedTokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
      if (savedTokens && savedTokens.access_token) {
        googleTokens = savedTokens;
        if (oauth2Client) {
          oauth2Client.setCredentials(googleTokens);
        }
        console.log('✅ Google Fit tokens restored from storage');
        return true;
      }
    }
  } catch (err) {
    console.warn('⚠️  Could not load saved Google tokens:', err.message);
  }
  return false;
}

// Save Google tokens to file
function saveGoogleTokens(tokens) {
  try {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
    console.log('✅ Google Fit tokens saved');
  } catch (err) {
    console.error('❌ Failed to save Google tokens:', err.message);
  }
}

// Refresh Google tokens if expired
async function refreshGoogleTokensIfNeeded() {
  if (!googleTokens || !oauth2Client) return false;
  
  // Check if token is expired or about to expire (within 5 minutes)
  const expiryDate = googleTokens.expiry_date;
  if (expiryDate && Date.now() >= expiryDate - 300000) {
    try {
      oauth2Client.setCredentials(googleTokens);
      const { credentials } = await oauth2Client.refreshAccessToken();
      googleTokens = credentials;
      oauth2Client.setCredentials(credentials);
      saveGoogleTokens(credentials);
      console.log('✅ Google tokens refreshed');
      return true;
    } catch (err) {
      console.error('❌ Token refresh failed:', err.message);
      // Clear invalid tokens
      googleTokens = null;
      try { fs.unlinkSync(TOKENS_PATH); } catch {}
      return false;
    }
  }
  return true;
}

// Initialize Groq AI
function initAI() {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    console.warn('⚠️  GROQ_API_KEY not set. AI features disabled.');
    console.log('   Get your free key at: https://console.groq.com/keys');
    return false;
  }

  try {
    ai = new GroqService(GROQ_API_KEY);
    aiModel = ai.model;
    console.log('✅ Groq AI ready with model:', aiModel);
    return true;
  } catch (error) {
    console.error('❌ Groq initialization failed:', error.message);
    ai = null;
    return false;
  }
}

// Initialize Google OAuth
let oauth2Client;
try {
  const fileContent = fs.readFileSync(CREDENTIALS_PATH);
  const keys = JSON.parse(fileContent).web;
  oauth2Client = new google.auth.OAuth2(keys.client_id, keys.client_secret, GOOGLE_REDIRECT_URI);
  console.log('✅ Google OAuth ready');
  
  // Load saved tokens after OAuth client is initialized
  loadGoogleTokens();
} catch (error) {
  console.warn('⚠️  Google credentials not found. Google Fit disabled.');
}

// Express setup
const allowedOrigins = [
  /localhost:\d+$/,
  /vercel\.app$/,
  /railway\.app$/,
  /netlify\.app$/
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({ 
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    const allowed = allowedOrigins.some(pattern => {
      if (pattern instanceof RegExp) return pattern.test(origin);
      return origin === pattern;
    });
    
    if (allowed) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in production for now
    }
  },
  credentials: true 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Database connection - supports DATABASE_URL or individual vars
const pool = new Pool(
  process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'nutrition_db',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 5432,
      }
);

// Serve static files
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Middleware: require AI
const requireAI = (req, res, next) => {
  if (!ai) {
    return res.status(503).json({ 
      error: 'AI service unavailable. Set GROQ_API_KEY in .env',
      setup: 'Get free key: https://console.groq.com/keys'
    });
  }
  next();
};

// ===================== ROUTES =====================

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok',
    ai: ai ? aiModel : 'disabled',
    googleFit: oauth2Client ? 'ready' : 'disabled'
  });
});

// AI Status
app.get('/api/ai/status', (_req, res) => {
  res.json({
    available: !!ai,
    model: aiModel || null,
    provider: 'Groq (Llama 3.3 70B)'
  });
});

// ===================== ADMIN SYSTEM =====================

// In-memory admin store (use database in production)
const admins = new Map();
const adminSessions = new Map();
const appUsers = new Map();
const mealPlans = new Map();

// Real analytics - start from zero
const analytics = {
  totalRegistrations: 0,
  totalLogins: 0,
  activeUsersToday: new Set(),
  foodAnalysesToday: 0,
  chatMessagesToday: 0,
  aiRequestsToday: 0,
  lastReset: new Date().toDateString(),
  logs: []
};

// Helper to reset daily stats
function checkDailyReset() {
  const today = new Date().toDateString();
  if (analytics.lastReset !== today) {
    analytics.activeUsersToday = new Set();
    analytics.foodAnalysesToday = 0;
    analytics.chatMessagesToday = 0;
    analytics.aiRequestsToday = 0;
    analytics.lastReset = today;
  }
}

// Helper to add log
function addLog(type, message) {
  analytics.logs.unshift({
    timestamp: new Date().toISOString(),
    type,
    message
  });
  // Keep only last 100 logs
  if (analytics.logs.length > 100) {
    analytics.logs = analytics.logs.slice(0, 100);
  }
}

// Initialize with default admin from .env
admins.set(ADMIN_EMAIL, {
  id: 'admin_1',
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
  name: 'Super Admin',
  role: 'super_admin',
  accessCode: ADMIN_CODE,
  createdAt: new Date().toISOString()
});

addLog('info', 'Server started');
addLog('info', `AI model loaded: ${aiModel}`);

// ===================== USER AUTHENTICATION =====================

// Initialize database tables for users
async function initUserTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        membership VARCHAR(50) DEFAULT 'free',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ User table ready');
    
    // Load existing users from database into memory
    await loadUsersFromDB();
  } catch (err) {
    console.warn('⚠️  Could not create user table:', err.message);
  }
}

// Load users from database into memory
async function loadUsersFromDB() {
  try {
    const result = await pool.query('SELECT * FROM app_users');
    result.rows.forEach(row => {
      appUsers.set(row.email, {
        id: row.id,
        email: row.email,
        password: row.password,
        name: row.name,
        membership: row.membership || 'free',
        status: row.status || 'active',
        createdAt: row.created_at,
        lastActive: row.last_active
      });
    });
    console.log(`✅ Loaded ${result.rows.length} users from database`);
  } catch (err) {
    console.warn('⚠️  Could not load users from database:', err.message);
  }
}

// Call on startup
initUserTable();

// User Signup - Save to Database
app.post('/api/user/signup', async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields required (name, email, password)' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  try {
    // Check if user exists in database
    const existingUser = await pool.query('SELECT id FROM app_users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    // Insert new user into database
    const result = await pool.query(
      `INSERT INTO app_users (email, password, name, membership, status, created_at, last_active)
       VALUES ($1, $2, $3, 'free', 'active', NOW(), NOW())
       RETURNING id, email, name, membership`,
      [email, password, name] // In production, hash password with bcrypt!
    );
    
    const user = result.rows[0];
    
    // Also store in memory for quick access
    appUsers.set(email, {
      id: user.id,
      email,
      password,
      name,
      membership: 'free',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });
    
    analytics.totalRegistrations++;
    addLog('success', `New user registered: ${email}`);
    
    res.status(201).json({
      message: 'Account created successfully',
      user: { id: user.id, email: user.email, name: user.name, membership: user.membership }
    });
  } catch (err) {
    console.error('Signup error:', err);
    // Fallback to in-memory if database fails
    if (appUsers.has(email)) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    const userId = `user_${Date.now()}`;
    appUsers.set(email, {
      id: userId,
      email,
      password,
      name,
      membership: 'free',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });
    
    analytics.totalRegistrations++;
    addLog('success', `New user registered (memory): ${email}`);
    
    res.status(201).json({
      message: 'Account created successfully',
      user: { id: userId, email, name, membership: 'free' }
    });
  }
});

// User Login - Check Database First
app.post('/api/user/login', async (req, res) => {
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  try {
    // Try database first
    const result = await pool.query(
      'SELECT id, email, password, name, membership, status FROM app_users WHERE email = $1',
      [email]
    );
    
    let user = result.rows[0];
    
    // If not in DB, check in-memory
    if (!user) {
      user = appUsers.get(email);
    }
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Account is deactivated. Contact support.' });
    }
    
    // Update last active in database
    await pool.query('UPDATE app_users SET last_active = NOW() WHERE email = $1', [email]);
    
    // Track analytics
    checkDailyReset();
    analytics.totalLogins++;
    analytics.activeUsersToday.add(email);
    addLog('info', `User logged in: ${email}`);
    
    const token = jwt.sign(
      { id: user.id, email, name: user.name, membership: user.membership },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        membership: user.membership
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    // Fallback to in-memory
    const user = appUsers.get(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    checkDailyReset();
    analytics.totalLogins++;
    analytics.activeUsersToday.add(email);
    
    const token = jwt.sign(
      { id: user.id, email, name: user.name, membership: user.membership },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        membership: user.membership
      }
    });
  }
});

// Middleware: Verify user token
const requireUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Track active user
    checkDailyReset();
    analytics.activeUsersToday.add(decoded.email);
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ===================== RAZORPAY PAYMENT GATEWAY =====================

// Store for orders (temporary) and payments cache
const orders = new Map();
const payments = new Map();

// Initialize payments table and load from database
async function initPaymentsTable() {
  try {
    await pool.query(`
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
      )
    `);
    console.log('✅ Payments table ready');
    
    // Load existing payments from database into memory
    await loadPaymentsFromDB();
  } catch (err) {
    console.warn('⚠️  Could not create payments table:', err.message);
  }
}

// Load payments from database into memory
async function loadPaymentsFromDB() {
  try {
    const result = await pool.query('SELECT * FROM payments ORDER BY created_at DESC');
    result.rows.forEach(row => {
      payments.set(row.payment_id, {
        id: row.payment_id,
        orderId: row.order_id,
        userEmail: row.user_email,
        amount: row.amount,
        currency: row.currency,
        planId: row.plan_id,
        planName: row.plan_name,
        status: row.status,
        createdAt: row.created_at
      });
    });
    console.log(`✅ Loaded ${result.rows.length} payments from database`);
  } catch (err) {
    console.warn('⚠️  Could not load payments from database:', err.message);
  }
}

// Save payment to database
async function savePaymentToDB(payment) {
  try {
    await pool.query(
      `INSERT INTO payments (payment_id, order_id, user_email, amount, currency, plan_id, plan_name, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (payment_id) DO NOTHING`,
      [payment.id, payment.orderId, payment.userEmail, payment.amount, payment.currency, payment.planId, payment.planName, payment.status, payment.createdAt]
    );
    console.log(`✅ Payment ${payment.id} saved to database`);
  } catch (err) {
    console.warn('⚠️  Could not save payment to database:', err.message);
  }
}

// Call on startup
initPaymentsTable();

// Subscription plans configuration
const PLANS = {
  pro: {
    monthly: { amount: 49900, currency: 'INR', name: 'Pro Monthly', duration: 30 },
    yearly: { amount: 499900, currency: 'INR', name: 'Pro Yearly', duration: 365 }
  },
  premium: {
    monthly: { amount: 99900, currency: 'INR', name: 'Premium Monthly', duration: 30 },
    yearly: { amount: 999900, currency: 'INR', name: 'Premium Yearly', duration: 365 }
  }
};

// Get Razorpay Key (public)
app.get('/api/payment/key', (req, res) => {
  res.json({ key: RAZORPAY_KEY_ID, testMode: RAZORPAY_KEY_ID.startsWith('rzp_test_') });
});

// Create Order using Razorpay API
app.post('/api/payment/create-order', requireUser, async (req, res) => {
  const { planId, billingCycle } = req.body;
  
  if (!planId || !billingCycle) {
    return res.status(400).json({ error: 'Plan ID and billing cycle required' });
  }
  
  const plan = PLANS[planId]?.[billingCycle];
  if (!plan) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }
  
  try {
    // Check if Razorpay is initialized
    if (!razorpayInstance) {
      return res.status(500).json({ error: 'Payment gateway not configured. Please add Razorpay keys to .env' });
    }
    
    // Create order using Razorpay API (works in test mode with test keys)
    const orderOptions = {
      amount: plan.amount, // amount in paise
      currency: plan.currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        planId: planId,
        billingCycle: billingCycle,
        userEmail: req.user.email
      }
    };
    
    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
    
    // Store order details for later verification
    const order = {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      status: razorpayOrder.status,
      planId,
      billingCycle,
      planName: plan.name,
      duration: plan.duration,
      userEmail: req.user.email,
      createdAt: new Date().toISOString()
    };
    
    orders.set(razorpayOrder.id, order);
    addLog('info', `Payment order created: ${razorpayOrder.id} for ${req.user.email} - ${plan.name}`);
    
    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      planName: order.planName,
      key: RAZORPAY_KEY_ID,
      testMode: RAZORPAY_KEY_ID.startsWith('rzp_test_')
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.error?.description || 'Failed to create order. Check Razorpay keys in .env' });
  }
});

// Verify Payment
app.post('/api/payment/verify', requireUser, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification data required' });
  }
  
  try {
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    
    const isValid = expectedSignature === razorpay_signature;
    
    if (!isValid) {
      addLog('error', `Payment verification failed for ${req.user.email}`);
      return res.status(400).json({ error: 'Payment verification failed' });
    }
    
    // Get order details
    const order = orders.get(razorpay_order_id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update user membership
    const user = appUsers.get(req.user.email);
    if (user) {
      user.membership = order.planId;
      user.membershipStart = new Date().toISOString();
      user.membershipEnd = new Date(Date.now() + order.duration * 24 * 60 * 60 * 1000).toISOString();
      appUsers.set(req.user.email, user);
    }
    
    // Store payment record
    const payment = {
      id: razorpay_payment_id,
      orderId: razorpay_order_id,
      userEmail: req.user.email,
      amount: order.amount,
      currency: order.currency,
      planId: order.planId,
      planName: order.planName,
      status: 'captured',
      createdAt: new Date().toISOString()
    };
    payments.set(razorpay_payment_id, payment);
    
    // Save payment to database
    await savePaymentToDB(payment);
    
    // Update user membership in database
    try {
      await pool.query(
        `UPDATE app_users SET membership = $1 WHERE email = $2`,
        [order.planId, req.user.email]
      );
    } catch (dbErr) {
      console.warn('Could not update membership in database:', dbErr.message);
    }
    
    // Update order status
    order.status = 'paid';
    order.paymentId = razorpay_payment_id;
    orders.set(razorpay_order_id, order);
    
    addLog('success', `Payment successful: ${razorpay_payment_id} - ${order.planName} for ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Payment verified successfully',
      membership: order.planId,
      expiresAt: user?.membershipEnd
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Get user's subscription status
app.get('/api/payment/subscription', requireUser, (req, res) => {
  const user = appUsers.get(req.user.email);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    membership: user.membership || 'free',
    membershipStart: user.membershipStart || null,
    membershipEnd: user.membershipEnd || null,
    isActive: user.membership !== 'free' && new Date(user.membershipEnd) > new Date()
  });
});

// Get payment history
app.get('/api/payment/history', requireUser, (req, res) => {
  const userPayments = Array.from(payments.values())
    .filter(p => p.userEmail === req.user.email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ payments: userPayments });
});

// Middleware: Verify admin token
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Admin: Get all payments
app.get('/api/admin/payments', requireAdmin, async (req, res) => {
  try {
    // Try to get from database first
    const result = await pool.query('SELECT * FROM payments ORDER BY created_at DESC');
    const allPayments = result.rows.map(row => ({
      id: row.payment_id,
      orderId: row.order_id,
      userEmail: row.user_email,
      amount: row.amount,
      currency: row.currency,
      planId: row.plan_id,
      planName: row.plan_name,
      status: row.status,
      createdAt: row.created_at
    }));
    
    const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount / 100), 0);
    
    res.json({ 
      payments: allPayments,
      total: allPayments.length,
      totalRevenue
    });
  } catch (err) {
    // Fallback to in-memory cache
    const allPayments = Array.from(payments.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount / 100), 0);
    
    res.json({ 
      payments: allPayments,
      total: allPayments.length,
      totalRevenue
    });
  }
});

// Admin: Add manual payment record (for existing premium users without payment records)
app.post('/api/admin/add-payment', requireAdmin, async (req, res) => {
  const { userEmail, amount, planId, planName } = req.body;
  
  if (!userEmail || !amount || !planId) {
    return res.status(400).json({ error: 'User email, amount, and plan ID required' });
  }
  
  try {
    const payment = {
      id: `manual_${Date.now()}`,
      orderId: `manual_order_${Date.now()}`,
      userEmail,
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      planId,
      planName: planName || (planId === 'premium' ? 'Premium Monthly' : 'Unknown'),
      status: 'captured',
      createdAt: new Date().toISOString()
    };
    
    await savePaymentToDB(payment);
    payments.set(payment.id, payment);
    
    addLog('success', `Manual payment added for ${userEmail} - Rs.${amount}`);
    res.json({ success: true, payment });
  } catch (err) {
    console.error('Add payment error:', err);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

// Admin Signup
app.post('/api/admin/signup', async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields required' });
  }
  
  if (admins.has(email)) {
    return res.status(409).json({ error: 'Admin already exists' });
  }
  
  const adminId = `admin_${Date.now()}`;
  const admin = {
    id: adminId,
    email,
    password, // In production, hash this!
    name,
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  
  admins.set(email, admin);
  
  const token = jwt.sign(
    { id: adminId, email, role: 'admin', name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.status(201).json({
    message: 'Admin account created',
    token,
    admin: { id: adminId, email, name, role: 'admin' }
  });
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  
  const admin = admins.get(email);
  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  const token = jwt.sign(
    { id: admin.id, email, role: admin.role, name: admin.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  adminSessions.set(token, { admin: admin.id, loginAt: new Date() });
  
  return res.json({
    token,
    role: admin.role,
    email,
    name: admin.name
  });
});

// Admin Logout
app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  adminSessions.delete(token);
  res.json({ message: 'Logged out successfully' });
});

// Get Admin Profile
app.get('/api/admin/profile', requireAdmin, (req, res) => {
  const admin = admins.get(req.admin.email);
  if (!admin) {
    return res.status(404).json({ error: 'Admin not found' });
  }
  res.json({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    createdAt: admin.createdAt
  });
});

// ===================== ADMIN DASHBOARD FEATURES =====================

// Get Dashboard Stats - Real data
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  checkDailyReset();
  
  // Calculate membership counts
  let freeUsers = 0;
  let proUsers = 0;
  let premiumUsers = 0;
  let activeUsers = 0;
  let inactiveUsers = 0;
  
  appUsers.forEach(user => {
    if (user.membership === 'premium') {
      premiumUsers++;
    } else if (user.membership === 'pro') {
      proUsers++;
    } else {
      freeUsers++;
    }
    if (user.status === 'active') {
      activeUsers++;
    } else {
      inactiveUsers++;
    }
  });
  
  // Calculate total revenue from payments
  let totalRevenue = 0;
  payments.forEach(payment => {
    if (payment.status === 'captured') {
      totalRevenue += payment.amount / 100;
    }
  });
  
  res.json({
    totalUsers: appUsers.size,
    totalRegistrations: analytics.totalRegistrations,
    totalLogins: analytics.totalLogins,
    freeUsers,
    proUsers,
    premiumUsers,
    activeUsers,
    inactiveUsers,
    activeUsersToday: analytics.activeUsersToday.size,
    totalAdmins: admins.size,
    totalMealPlans: mealPlans.size,
    totalPayments: payments.size,
    totalRevenue,
    aiStatus: ai ? 'online' : 'offline',
    aiModel: aiModel,
    analytics: {
      foodAnalysesToday: analytics.foodAnalysesToday,
      chatMessagesToday: analytics.chatMessagesToday,
      aiRequestsToday: analytics.aiRequestsToday,
      activeToday: analytics.activeUsersToday.size
    }
  });
});

// User Management
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    // Fetch from database
    const result = await pool.query(`
      SELECT id, email, name, membership, status, created_at, last_active 
      FROM app_users ORDER BY created_at DESC
    `);
    
    const users = result.rows.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      membership: u.membership || 'free',
      status: u.status || 'active',
      createdAt: u.created_at,
      lastActive: u.last_active,
      mealPlansCount: 0
    }));
    
    res.json({ users, total: users.length });
  } catch (err) {
    // Fallback to in-memory
    const users = Array.from(appUsers.values()).map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      membership: u.membership || 'free',
      status: u.status || 'active',
      createdAt: u.createdAt,
      lastActive: u.lastActive,
      mealPlansCount: u.mealPlans?.length || 0
    }));
    res.json({ users, total: users.length });
  }
});

// Create App User
app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const { email, name, age, weight, height, goals, membership } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name required' });
  }
  
  try {
    // Check if user exists in database
    const existing = await pool.query('SELECT id FROM app_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Insert into database
    const result = await pool.query(
      `INSERT INTO app_users (email, password, name, membership, status, created_at, last_active)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, created_at`,
      [email, 'changeme123', name, membership || 'free', 'active']
    );
    
    const user = {
      id: result.rows[0].id,
      email,
      password: 'changeme123',
      name,
      membership: membership || 'free',
      status: 'active',
      createdAt: result.rows[0].created_at,
      lastActive: result.rows[0].created_at
    };
    
    // Also add to in-memory map
    appUsers.set(email, user);
    analytics.totalRegistrations++;
    addLog('success', `Admin created user: ${email}`);
    
    // If age/weight/height provided, create user profile
    if (age || weight || height) {
      try {
        await pool.query(
          `INSERT INTO user_profiles (user_id, age, weight, height)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id) DO UPDATE SET age = $2, weight = $3, height = $4`,
          [result.rows[0].id, age || null, weight || null, height || null]
        );
      } catch (profileErr) {
        console.warn('Could not create user profile:', profileErr.message);
      }
    }
    
    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update User Status
app.patch('/api/admin/users/:email/status', requireAdmin, async (req, res) => {
  const { email } = req.params;
  const { status } = req.body;
  
  try {
    // Update in database
    const result = await pool.query(
      'UPDATE app_users SET status = $1 WHERE email = $2 RETURNING *',
      [status, email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update in-memory map
    if (appUsers.has(email)) {
      const user = appUsers.get(email);
      user.status = status;
      appUsers.set(email, user);
    }
    
    addLog('info', `User ${email} status changed to ${status}`);
    res.json({ message: 'User status updated', user: result.rows[0] });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Update User Membership
app.patch('/api/admin/users/:email/membership', requireAdmin, async (req, res) => {
  const { email } = req.params;
  const { membership } = req.body;
  
  try {
    // Get old membership for logging
    const oldResult = await pool.query('SELECT membership FROM app_users WHERE email = $1', [email]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const oldMembership = oldResult.rows[0].membership;
    
    // Update in database
    const result = await pool.query(
      'UPDATE app_users SET membership = $1 WHERE email = $2 RETURNING *',
      [membership, email]
    );
    
    // Update in-memory map
    if (appUsers.has(email)) {
      const user = appUsers.get(email);
      user.membership = membership;
      appUsers.set(email, user);
    }
    
    addLog('success', `User ${email} membership changed from ${oldMembership} to ${membership}`);
    res.json({ message: 'User membership updated', user: result.rows[0] });
  } catch (err) {
    console.error('Error updating membership:', err);
    res.status(500).json({ error: 'Failed to update membership' });
  }
});

// Delete User
app.delete('/api/admin/users/:email', requireAdmin, async (req, res) => {
  const { email } = req.params;
  
  try {
    // Delete from database
    const result = await pool.query(
      'DELETE FROM app_users WHERE email = $1 RETURNING id',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete from in-memory map
    appUsers.delete(email);
    addLog('warning', `User ${email} deleted by admin`);
    
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Meal Plan Management
app.get('/api/admin/meal-plans', requireAdmin, (req, res) => {
  const plans = Array.from(mealPlans.values());
  res.json({ plans, total: plans.length });
});

app.post('/api/admin/meal-plans', requireAdmin, async (req, res) => {
  const { name, description, targetCalories, targetProtein, meals, assignedTo } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Plan name required' });
  }
  
  const planId = `plan_${Date.now()}`;
  const plan = {
    id: planId,
    name,
    description: description || '',
    targetCalories: targetCalories || 2000,
    targetProtein: targetProtein || 100,
    meals: meals || [],
    assignedTo: assignedTo || [],
    createdBy: req.admin.email,
    createdAt: new Date().toISOString()
  };
  
  mealPlans.set(planId, plan);
  res.status(201).json({ message: 'Meal plan created', plan });
});

// Generate AI Meal Plan
app.post('/api/admin/generate-meal-plan', requireAdmin, requireAI, async (req, res) => {
  const { calories, protein, dietType, restrictions } = req.body;
  
  try {
    const prompt = `Create a detailed daily meal plan with these requirements:
- Target calories: ${calories || 2000} kcal
- Target protein: ${protein || 100}g
- Diet type: ${dietType || 'balanced'}
- Restrictions: ${restrictions?.join(', ') || 'none'}

Return a JSON object with this structure:
{
  "planName": "string",
  "totalCalories": number,
  "totalProtein": number,
  "meals": [
    {
      "name": "Breakfast/Lunch/Dinner/Snack",
      "time": "8:00 AM",
      "foods": ["food1", "food2"],
      "calories": number,
      "protein": number,
      "description": "brief description"
    }
  ],
  "tips": ["tip1", "tip2"]
}`;

    const response = await ai.generate(prompt);
    const mealPlan = ai.parseJSON(response);
    
    if (mealPlan) {
      const planId = `plan_${Date.now()}`;
      mealPlan.id = planId;
      mealPlan.createdBy = req.admin.email;
      mealPlan.createdAt = new Date().toISOString();
      mealPlan.aiGenerated = true;
      
      mealPlans.set(planId, mealPlan);
      res.json({ message: 'AI meal plan generated', plan: mealPlan });
    } else {
      res.status(500).json({ error: 'Failed to parse AI response' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate meal plan: ' + error.message });
  }
});

// Delete Meal Plan
app.delete('/api/admin/meal-plans/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  if (!mealPlans.has(id)) {
    return res.status(404).json({ error: 'Meal plan not found' });
  }
  mealPlans.delete(id);
  res.json({ message: 'Meal plan deleted' });
});

// AI Settings
app.get('/api/admin/ai-settings', requireAdmin, (req, res) => {
  res.json({
    provider: 'Groq',
    model: aiModel,
    status: ai ? 'active' : 'inactive',
    features: {
      chat: true,
      foodAnalysis: true,
      mealPlanning: true,
      nutritionLookup: true
    }
  });
});

// System Logs - Real logs
app.get('/api/admin/logs', requireAdmin, (req, res) => {
  addLog('info', `Admin viewed logs: ${req.admin.email}`);
  res.json({ logs: analytics.logs });
});

// ===================== GOOGLE FIT =====================

app.get('/api/google-fit/auth', (req, res) => {
  if (!oauth2Client) return res.status(500).json({ error: 'Google not configured' });
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.sleep.read',
      'https://www.googleapis.com/auth/fitness.location.read'
    ]
  });
  res.redirect(url);
});

app.get('/api/google-fit/callback', async (req, res) => {
  if (!oauth2Client || !req.query.code) {
    return res.status(400).send('Missing configuration or code');
  }
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    googleTokens = tokens;
    oauth2Client.setCredentials(tokens);
    
    // Save tokens for persistence across server restarts
    saveGoogleTokens(tokens);
    
    // Redirect directly to the client - the client will check connection status
    res.redirect(CLIENT_REDIRECT);
  } catch (err) {
    // Redirect with error parameter
    res.redirect(`${CLIENT_REDIRECT.split('?')[0]}?error=oauth_failed`);
  }
});

app.get('/api/google-fit/status', async (_req, res) => {
  // Try to refresh tokens if needed
  if (googleTokens) {
    await refreshGoogleTokensIfNeeded();
  }
  res.json({ connected: !!(oauth2Client && googleTokens) });
});

app.get('/api/google-fit/steps', async (req, res) => {
  if (!oauth2Client || !googleTokens) {
    return res.status(401).json({ error: 'Not connected to Google Fit' });
  }
  
  // Refresh tokens if needed
  const refreshed = await refreshGoogleTokensIfNeeded();
  if (!refreshed && !googleTokens) {
    return res.status(401).json({ error: 'Google Fit session expired. Please reconnect.' });
  }
  
  try {
    oauth2Client.setCredentials(googleTokens);
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    const period = req.query.period || 'day';
    const now = new Date();
    let startTime = new Date();
    
    // Set start time based on period
    if (period === 'week') {
      startTime.setDate(now.getDate() - 7);
      startTime.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startTime.setDate(now.getDate() - 30);
      startTime.setHours(0, 0, 0, 0);
    } else {
      // day - from midnight today
      startTime.setHours(0, 0, 0, 0);
    }
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime.getTime(),
        endTimeMillis: now.getTime()
      }
    });
    
    // Sum all steps from all buckets (each bucket is a day)
    let totalSteps = 0;
    const buckets = response.data.bucket || [];
    for (const bucket of buckets) {
      const points = bucket.dataset?.[0]?.point || [];
      for (const point of points) {
        totalSteps += point.value?.[0]?.intVal || 0;
      }
    }
    
    res.json({ steps: totalSteps, period });
  } catch (err) {
    // If token error, clear tokens
    if (err.code === 401 || err.message?.includes('invalid_grant')) {
      googleTokens = null;
      try { fs.unlinkSync(TOKENS_PATH); } catch {}
      return res.status(401).json({ error: 'Google Fit session expired. Please reconnect.' });
    }
    res.status(500).json({ error: 'Failed to fetch steps' });
  }
});

// Get steps comparison data for analysis
app.get('/api/google-fit/comparison', async (_req, res) => {
  if (!oauth2Client || !googleTokens) {
    return res.status(401).json({ error: 'Not connected to Google Fit' });
  }
  
  const refreshed = await refreshGoogleTokensIfNeeded();
  if (!refreshed && !googleTokens) {
    return res.status(401).json({ error: 'Google Fit session expired. Please reconnect.' });
  }
  
  try {
    oauth2Client.setCredentials(googleTokens);
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    const now = new Date();
    
    // Helper to fetch steps for a date range
    const fetchStepsForRange = async (startDate, endDate) => {
      const response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startDate.getTime(),
          endTimeMillis: endDate.getTime()
        }
      });
      
      let totalSteps = 0;
      const buckets = response.data.bucket || [];
      for (const bucket of buckets) {
        const points = bucket.dataset?.[0]?.point || [];
        for (const point of points) {
          totalSteps += point.value?.[0]?.intVal || 0;
        }
      }
      return totalSteps;
    };
    
    // Current week (last 7 days)
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    thisWeekStart.setHours(0, 0, 0, 0);
    
    // Last week (7-14 days ago)
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);
    lastWeekStart.setHours(0, 0, 0, 0);
    const lastWeekEnd = new Date(thisWeekStart);
    
    // Current month (last 30 days)
    const thisMonthStart = new Date(now);
    thisMonthStart.setDate(now.getDate() - 30);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    // Last month (30-60 days ago)
    const lastMonthStart = new Date(now);
    lastMonthStart.setDate(now.getDate() - 60);
    lastMonthStart.setHours(0, 0, 0, 0);
    const lastMonthEnd = new Date(thisMonthStart);
    
    // Fetch all data in parallel
    const [thisWeekSteps, lastWeekSteps, thisMonthSteps, lastMonthSteps] = await Promise.all([
      fetchStepsForRange(thisWeekStart, now),
      fetchStepsForRange(lastWeekStart, lastWeekEnd),
      fetchStepsForRange(thisMonthStart, now),
      fetchStepsForRange(lastMonthStart, lastMonthEnd)
    ]);
    
    // Calculate comparisons
    const weeklyChange = lastWeekSteps > 0 
      ? Math.round(((thisWeekSteps - lastWeekSteps) / lastWeekSteps) * 100) 
      : 0;
    const monthlyChange = lastMonthSteps > 0 
      ? Math.round(((thisMonthSteps - lastMonthSteps) / lastMonthSteps) * 100) 
      : 0;
    
    res.json({
      thisWeek: {
        steps: thisWeekSteps,
        avgPerDay: Math.round(thisWeekSteps / 7)
      },
      lastWeek: {
        steps: lastWeekSteps,
        avgPerDay: Math.round(lastWeekSteps / 7)
      },
      thisMonth: {
        steps: thisMonthSteps,
        avgPerDay: Math.round(thisMonthSteps / 30)
      },
      lastMonth: {
        steps: lastMonthSteps,
        avgPerDay: Math.round(lastMonthSteps / 30)
      },
      comparison: {
        weeklyChange,
        monthlyChange,
        weeklyTrend: weeklyChange > 0 ? 'up' : weeklyChange < 0 ? 'down' : 'same',
        monthlyTrend: monthlyChange > 0 ? 'up' : monthlyChange < 0 ? 'down' : 'same'
      }
    });
  } catch (err) {
    console.error('Comparison fetch error:', err.message);
    if (err.code === 401 || err.message?.includes('invalid_grant')) {
      googleTokens = null;
      try { fs.unlinkSync(TOKENS_PATH); } catch {}
      return res.status(401).json({ error: 'Google Fit session expired. Please reconnect.' });
    }
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

// Get comprehensive activity data
app.get('/api/google-fit/activities', async (_req, res) => {
  if (!oauth2Client || !googleTokens) {
    return res.status(401).json({ error: 'Not connected to Google Fit' });
  }
  
  // Refresh tokens if needed
  const refreshed = await refreshGoogleTokensIfNeeded();
  if (!refreshed && !googleTokens) {
    return res.status(401).json({ error: 'Google Fit session expired. Please reconnect.' });
  }
  
  try {
    oauth2Client.setCredentials(googleTokens);
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    const now = new Date();
    const midnight = new Date(); midnight.setHours(0,0,0,0);
    
    let steps = 0, distance = 0, calories = 0, activeMinutes = 0;
    
    // Fetch multiple data types - handle errors gracefully
    try {
      const response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [
            { dataTypeName: 'com.google.step_count.delta' },
            { dataTypeName: 'com.google.calories.expended' },
            { dataTypeName: 'com.google.active_minutes' }
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: midnight.getTime(),
          endTimeMillis: now.getTime()
        }
      });
      
      const bucket = response.data.bucket?.[0];
      steps = bucket?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
      calories = bucket?.dataset?.[1]?.point?.[0]?.value?.[0]?.fpVal || 0;
      activeMinutes = bucket?.dataset?.[2]?.point?.[0]?.value?.[0]?.intVal || 0;
      distance = steps * 0.0008; // Estimate distance from steps (0.8m per step)
    } catch (aggErr) {
      console.log('Aggregate data fetch partial failure:', aggErr.message);
    }
    
    // Fetch activity sessions (workouts)
    let activities = [];
    try {
      const sessionsResponse = await fitness.users.sessions.list({
        userId: 'me',
        startTime: midnight.toISOString(),
        endTime: now.toISOString()
      });
      
      // Map activity types to readable names
      const activityTypeMap = {
        7: 'Walking', 8: 'Running', 1: 'Biking', 9: 'Aerobics',
        10: 'Badminton', 11: 'Baseball', 12: 'Basketball', 13: 'Biathlon',
        14: 'Handbiking', 15: 'Mountain biking', 16: 'Road biking', 17: 'Spinning',
        18: 'Stationary biking', 19: 'Utility biking', 20: 'Boxing', 21: 'Calisthenics',
        22: 'Circuit training', 23: 'Cricket', 24: 'CrossFit', 25: 'Curling',
        26: 'Dancing', 27: 'Diving', 28: 'Elliptical', 29: 'Ergometer',
        30: 'Fencing', 31: 'Football (American)', 32: 'Football (Australian)',
        33: 'Football (Soccer)', 34: 'Frisbee', 35: 'Gardening', 36: 'Golf',
        37: 'Gymnastics', 38: 'Handball', 39: 'Hiking', 40: 'Hockey',
        41: 'Horse riding', 42: 'Housework', 43: 'Ice skating', 44: 'Interval training',
        45: 'Jumping rope', 46: 'Kayaking', 47: 'Kettlebell', 48: 'Kickboxing',
        49: 'Kitesurfing', 50: 'Martial arts', 51: 'Meditation', 52: 'MMA',
        53: 'P90X', 54: 'Paragliding', 55: 'Pilates', 56: 'Polo',
        57: 'Racquetball', 58: 'Rock climbing', 59: 'Rowing', 60: 'Rowing machine',
        61: 'Rugby', 62: 'Running (jogging)', 63: 'Running (sand)', 64: 'Running (treadmill)',
        65: 'Sailing', 66: 'Scuba diving', 67: 'Skateboarding', 68: 'Skating',
        69: 'Skiing', 70: 'Sledding', 71: 'Snowboarding', 72: 'Snowmobile',
        73: 'Snowshoeing', 74: 'Softball', 75: 'Squash', 76: 'Stair climbing',
        77: 'Stand-up paddleboarding', 78: 'Strength training', 79: 'Stretching', 80: 'Surfing',
        81: 'Swimming', 82: 'Table tennis', 83: 'Team sports', 84: 'Tennis',
        85: 'Treadmill', 86: 'Volleyball', 87: 'Walking (fitness)', 88: 'Walking (nordic)',
        89: 'Water polo', 90: 'Weightlifting', 91: 'Wheelchair', 92: 'Yoga', 93: 'Zumba',
        108: 'HIIT', 113: 'Stair climbing machine', 114: 'Weight machine', 115: 'Dumbbell training'
      };
      
      activities = (sessionsResponse.data.session || []).map(session => {
        const startMs = parseInt(session.startTimeMillis);
        const endMs = parseInt(session.endTimeMillis);
        const durationMin = Math.round((endMs - startMs) / 60000);
        return {
          name: session.name || activityTypeMap[session.activityType] || 'Workout',
          type: activityTypeMap[session.activityType] || 'Exercise',
          duration: durationMin,
          startTime: new Date(startMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
      });
    } catch (sessErr) {
      console.log('Sessions fetch failed:', sessErr.message);
    }
    
    res.json({
      steps,
      distance: Math.round(distance * 100) / 100, // km with 2 decimals
      calories: Math.round(calories),
      activeMinutes,
      activities
    });
  } catch (err) {
    console.error('Activities fetch error:', err.message);
    // Return partial data instead of error
    res.json({
      steps: 0,
      distance: 0,
      calories: 0,
      activeMinutes: 0,
      activities: [],
      error: 'Some data unavailable. Try reconnecting Google Fit.'
    });
  }
});

// Get comprehensive health data (heart rate, sleep, weight, etc.)
app.get('/api/google-fit/health', async (req, res) => {
  if (!oauth2Client || !googleTokens) {
    return res.status(401).json({ error: 'Not connected to Google Fit' });
  }
  
  const refreshed = await refreshGoogleTokensIfNeeded();
  if (!refreshed && !googleTokens) {
    return res.status(401).json({ error: 'Google Fit session expired. Please reconnect.' });
  }
  
  try {
    oauth2Client.setCredentials(googleTokens);
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    const now = new Date();
    const midnight = new Date(); midnight.setHours(0,0,0,0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const result = {
      heartRate: null,
      restingHeartRate: null,
      sleep: null,
      weight: null,
      heartPoints: null,
      moveMinutes: null,
      speed: null,
      hydration: null
    };
    
    // Fetch today's aggregated data
    try {
      const response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [
            { dataTypeName: 'com.google.heart_rate.bpm' },
            { dataTypeName: 'com.google.heart_minutes' },
            { dataTypeName: 'com.google.active_minutes' },
            { dataTypeName: 'com.google.speed' }
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: midnight.getTime(),
          endTimeMillis: now.getTime()
        }
      });
      
      const bucket = response.data.bucket?.[0];
      
      // Heart rate (average and range)
      const hrPoints = bucket?.dataset?.[0]?.point || [];
      if (hrPoints.length > 0) {
        const hrValues = hrPoints.map(p => p.value?.[0]?.fpVal).filter(v => v);
        if (hrValues.length > 0) {
          result.heartRate = {
            avg: Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length),
            min: Math.round(Math.min(...hrValues)),
            max: Math.round(Math.max(...hrValues)),
            readings: hrValues.length
          };
        }
      }
      
      // Heart points (cardio points)
      const heartPointsData = bucket?.dataset?.[1]?.point?.[0];
      if (heartPointsData) {
        result.heartPoints = Math.round(heartPointsData.value?.[0]?.fpVal || 0);
      }
      
      // Move minutes
      const moveMinData = bucket?.dataset?.[2]?.point?.[0];
      if (moveMinData) {
        result.moveMinutes = moveMinData.value?.[0]?.intVal || 0;
      }
      
      // Speed (average in m/s, convert to km/h)
      const speedData = bucket?.dataset?.[3]?.point || [];
      if (speedData.length > 0) {
        const avgSpeed = speedData.reduce((sum, p) => sum + (p.value?.[0]?.fpVal || 0), 0) / speedData.length;
        result.speed = {
          avg: Math.round(avgSpeed * 3.6 * 10) / 10, // m/s to km/h
          unit: 'km/h'
        };
      }
    } catch (err) {
      console.log('Aggregated health data fetch error:', err.message);
    }
    
    // Fetch weight (last 7 days)
    try {
      const weightResponse = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{ dataTypeName: 'com.google.weight' }],
          bucketByTime: { durationMillis: 7 * 86400000 },
          startTimeMillis: weekAgo.getTime(),
          endTimeMillis: now.getTime()
        }
      });
      
      const weightPoints = weightResponse.data.bucket?.[0]?.dataset?.[0]?.point || [];
      if (weightPoints.length > 0) {
        const lastWeight = weightPoints[weightPoints.length - 1];
        result.weight = {
          current: Math.round(lastWeight.value?.[0]?.fpVal * 10) / 10,
          unit: 'kg',
          lastUpdated: new Date(parseInt(lastWeight.endTimeNanos) / 1000000).toLocaleDateString()
        };
      }
    } catch (err) {
      console.log('Weight fetch error:', err.message);
    }
    
    // Fetch sleep data (last night)
    try {
      const yesterday = new Date(midnight);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(18, 0, 0, 0); // 6 PM yesterday
      
      const sleepResponse = await fitness.users.sessions.list({
        userId: 'me',
        startTime: yesterday.toISOString(),
        endTime: now.toISOString(),
        activityType: 72 // Sleep activity type
      });
      
      const sleepSessions = sleepResponse.data.session || [];
      if (sleepSessions.length > 0) {
        let totalSleepMs = 0;
        let sleepStart = null;
        let sleepEnd = null;
        
        sleepSessions.forEach(session => {
          const start = parseInt(session.startTimeMillis);
          const end = parseInt(session.endTimeMillis);
          totalSleepMs += (end - start);
          if (!sleepStart || start < sleepStart) sleepStart = start;
          if (!sleepEnd || end > sleepEnd) sleepEnd = end;
        });
        
        const hours = Math.floor(totalSleepMs / 3600000);
        const minutes = Math.round((totalSleepMs % 3600000) / 60000);
        
        result.sleep = {
          duration: `${hours}h ${minutes}m`,
          totalMinutes: Math.round(totalSleepMs / 60000),
          bedTime: sleepStart ? new Date(sleepStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
          wakeTime: sleepEnd ? new Date(sleepEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
          quality: totalSleepMs >= 7 * 3600000 ? 'Good' : totalSleepMs >= 6 * 3600000 ? 'Fair' : 'Poor'
        };
      }
    } catch (err) {
      console.log('Sleep fetch error:', err.message);
    }
    
    // Fetch hydration (if tracked)
    try {
      const hydrationResponse = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{ dataTypeName: 'com.google.hydration' }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: midnight.getTime(),
          endTimeMillis: now.getTime()
        }
      });
      
      const hydrationPoints = hydrationResponse.data.bucket?.[0]?.dataset?.[0]?.point || [];
      if (hydrationPoints.length > 0) {
        const totalLiters = hydrationPoints.reduce((sum, p) => sum + (p.value?.[0]?.fpVal || 0), 0);
        result.hydration = {
          total: Math.round(totalLiters * 1000), // Convert to ml
          unit: 'ml',
          glasses: Math.round(totalLiters * 1000 / 250) // Assuming 250ml per glass
        };
      }
    } catch (err) {
      console.log('Hydration fetch error:', err.message);
    }
    
    res.json(result);
  } catch (err) {
    console.error('Health data fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch health data' });
  }
});

// Get weekly trends
app.get('/api/google-fit/trends', async (req, res) => {
  if (!oauth2Client || !googleTokens) {
    return res.status(401).json({ error: 'Not connected to Google Fit' });
  }
  
  const refreshed = await refreshGoogleTokensIfNeeded();
  if (!refreshed && !googleTokens) {
    return res.status(401).json({ error: 'Google Fit session expired. Please reconnect.' });
  }
  
  try {
    oauth2Client.setCredentials(googleTokens);
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    weekAgo.setHours(0, 0, 0, 0);
    
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.calories.expended' },
          { dataTypeName: 'com.google.distance.delta' },
          { dataTypeName: 'com.google.active_minutes' }
        ],
        bucketByTime: { durationMillis: 86400000 }, // Daily buckets
        startTimeMillis: weekAgo.getTime(),
        endTimeMillis: now.getTime()
      }
    });
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trends = (response.data.bucket || []).map((bucket, idx) => {
      const date = new Date(parseInt(bucket.startTimeMillis));
      return {
        day: days[date.getDay()],
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        steps: bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0,
        calories: Math.round(bucket.dataset?.[1]?.point?.[0]?.value?.[0]?.fpVal || 0),
        distance: Math.round((bucket.dataset?.[2]?.point?.[0]?.value?.[0]?.fpVal || 0) / 100) / 10, // km
        activeMinutes: bucket.dataset?.[3]?.point?.[0]?.value?.[0]?.intVal || 0
      };
    });
    
    // Calculate averages
    const totals = trends.reduce((acc, day) => ({
      steps: acc.steps + day.steps,
      calories: acc.calories + day.calories,
      distance: acc.distance + day.distance,
      activeMinutes: acc.activeMinutes + day.activeMinutes
    }), { steps: 0, calories: 0, distance: 0, activeMinutes: 0 });
    
    const avgDays = trends.length || 1;
    
    res.json({
      daily: trends,
      averages: {
        steps: Math.round(totals.steps / avgDays),
        calories: Math.round(totals.calories / avgDays),
        distance: Math.round(totals.distance / avgDays * 10) / 10,
        activeMinutes: Math.round(totals.activeMinutes / avgDays)
      },
      totals: {
        steps: totals.steps,
        calories: totals.calories,
        distance: Math.round(totals.distance * 10) / 10,
        activeMinutes: totals.activeMinutes
      }
    });
  } catch (err) {
    console.error('Trends fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// ===================== GROQ AI =====================

// Chat
app.post('/api/ai/chat', requireAI, async (req, res) => {
  const { message, sessionId, userProfile } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    let systemPrompt = `You are Yellow Apple AI Coach - a friendly nutrition and fitness expert. 
Provide helpful advice on diet, nutrition, calories, meal planning, and fitness.
Keep responses concise. Recommend seeing a doctor for medical concerns.`;

    // Add user profile context if available
    if (userProfile) {
      systemPrompt += `\n\nUser Profile:
- Name: ${userProfile.name}
- Age: ${userProfile.age} years
- Height: ${userProfile.height} cm
- Weight: ${userProfile.weight} kg

Use this information to provide personalized advice when relevant. Address the user by name occasionally.`;
    }

    const response = await ai.chat(sessionId || 'default', message, systemPrompt);
    
    // Track analytics
    checkDailyReset();
    analytics.chatMessagesToday++;
    analytics.aiRequestsToday++;
    
    res.json({ response, model: aiModel });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ error: 'AI request failed: ' + error.message });
  }
});

// Clear chat
app.post('/api/ai/clear-chat', requireAI, (req, res) => {
  ai.clearSession(req.body.sessionId || 'default');
  res.json({ success: true });
});

// Analyze food ingredients
app.post('/api/analyze-ingredients', requireAI, async (req, res) => {
  const { foodName } = req.body;
  if (!foodName) return res.status(400).json({ error: 'Food name required' });
  
  // Track analytics
  checkDailyReset();
  analytics.foodAnalysesToday++;
  analytics.aiRequestsToday++;

  try {
    console.log('🍎 Analyzing:', foodName);
    const info = await ai.analyzeFood(foodName);
    
    if (!info) {
      return res.status(500).json({ error: 'AI analysis failed - no data returned' });
    }

    res.json({
      foodName,
      isBranded: info.isBranded,
      brandName: info.brandName,
      productType: info.productType,
      unit: info.unit,
      standardServing: info.standardServing,
      servingDescription: info.servingDescription,
      ingredients: info.ingredients,
      aiModel: aiModel
    });
  } catch (error) {
    console.error('Analyze error:', error.message);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

// Analyze custom recipe
app.post('/api/analyze-custom-recipe', requireAI, async (req, res) => {
  const { recipeName, ingredients } = req.body;
  if (!ingredients?.length) return res.status(400).json({ error: 'Ingredients required' });

  try {
    console.log('🍳 Analyzing recipe:', recipeName);
    const data = await ai.analyzeRecipe(recipeName, ingredients);
    
    if (!data) {
      return res.status(500).json({ error: 'AI recipe analysis failed - no data returned' });
    }

    // Calculate total weight from user input
    const unitToGrams = { g: 1, ml: 1, cup: 240, tbsp: 15, tsp: 5, piece: 50, slice: 30 };
    let totalWeight = ingredients.reduce((sum, ing) => {
      return sum + (parseFloat(ing.amount) || 0) * (unitToGrams[ing.unit] || 1);
    }, 0);

    res.json({
      foodName: recipeName || 'Custom Recipe',
      portionSize: Math.round(totalWeight),
      unit: 'g',
      isCustomRecipe: true,
      aiModel: aiModel,
      nutrition: {
        calories: data.totalCalories,
        protein: data.totalProtein,
        carbohydrates: data.totalCarbs,
        fat: data.totalFat,
        fiber: data.totalFiber,
        sugar: data.totalSugar,
        sodium: data.totalSodium
      },
      ingredientBreakdown: data.ingredients,
      recommendation: data.healthTip
    });
  } catch (error) {
    console.error('Recipe error:', error.message);
    res.status(500).json({ error: 'Recipe analysis failed: ' + error.message });
  }
});

// Get nutrition
app.post('/api/analyze-nutrition', requireAI, async (req, res) => {
  const { foodName, ingredients, portionSize, unit, isBranded } = req.body;
  if (!foodName) return res.status(400).json({ error: 'Food name required' });

  const portion = portionSize || 100;
  const portionUnit = unit || 'g';

  try {
    console.log('🥗 Nutrition for:', foodName, `${portion}${portionUnit}`);
    const data = await ai.getNutrition(foodName, ingredients, portion, portionUnit, isBranded);
    
    if (!data) {
      return res.status(500).json({ error: 'AI nutrition lookup failed - no data returned' });
    }

    // Get AI recommendation
    let recommendation = null;
    try { 
      recommendation = await ai.getRecommendation(foodName); 
    } catch(e) {
      console.log('Recommendation fetch failed:', e.message);
    }

    res.json({
      foodName,
      portionSize: portion,
      unit: portionUnit,
      aiModel: aiModel,
      nutrition: {
        calories: data.calories,
        protein: data.protein,
        carbohydrates: data.carbohydrates,
        fat: data.fat,
        fiber: data.fiber,
        sugar: data.sugar,
        sodium: data.sodium,
        cholesterol: data.cholesterol
      },
      recommendation
    });
  } catch (error) {
    console.error('Nutrition error:', error.message);
    res.status(500).json({ error: 'Nutrition analysis failed: ' + error.message });
  }
});

// Healthier alternative
app.post('/api/healthier-alternative', requireAI, async (req, res) => {
  const { foodName, ingredients } = req.body;
  if (!foodName) return res.status(400).json({ error: 'Food name required' });

  try {
    const data = await ai.getHealthierAlternative(foodName, ingredients);
    
    if (!data) {
      return res.status(500).json({ error: 'AI failed to generate healthier alternative' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Healthier alternative error:', error.message);
    res.status(500).json({ error: 'Failed to get healthier alternative: ' + error.message });
  }
});

// ===================== CLIENT MEAL PLAN GENERATOR =====================

app.post('/api/generate-meal-plan', requireAI, async (req, res) => {
  const { calories, protein, fat, goal, dietType, meals, restrictions, customPrompt, portionSize } = req.body;
  
  try {
    console.log('🥗 Generating meal plan:', { calories, protein, fat, goal, dietType, portionSize });
    
    const goalDescriptions = {
      'lose': 'weight loss with a calorie deficit',
      'maintain': 'weight maintenance',
      'gain': 'muscle gain with calorie surplus',
      'health': 'general health and balanced nutrition'
    };

    const portionDescriptions = {
      'small': 'smaller, lighter portions suitable for those with smaller appetites',
      'medium': 'standard, balanced portions for average needs',
      'large': 'larger, more filling portions for bigger appetites or active individuals'
    };
    
    const targetFat = fat || Math.round((calories || 2000) * 0.30 / 9);
    
    const prompt = `You are a professional nutritionist. Create a personalized daily meal plan with these specifications:

REQUIREMENTS:
- Daily calories target: ${calories || 2000} kcal
- Daily protein target: ${protein || 100}g
- Daily fat target: ${targetFat}g
- Goal: ${goalDescriptions[goal] || 'balanced nutrition'}
- Diet type: ${dietType || 'balanced'}
- Number of meals: ${meals || 4}
- Portion size preference: ${portionDescriptions[portionSize] || portionDescriptions['medium']}
- Dietary restrictions: ${restrictions?.length > 0 ? restrictions.join(', ') : 'none'}
${customPrompt ? `- Additional preferences: ${customPrompt}` : ''}

CRITICAL REQUIREMENTS:
- Ensure total calories, protein, and fat add up to the targets
- Include variety in food choices
- Make meals practical and easy to prepare
- Include specific portion sizes with units (e.g., "1 cup", "200g", "2 slices") for EVERY food item
- EVERY meal MUST include ALL macros: calories, protein, carbs, AND fat (fat is required for all meals including snacks)

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "planName": "descriptive name for this meal plan",
  "totalCalories": ${calories || 2000},
  "totalProtein": ${protein || 100},
  "totalFat": ${targetFat},
  "goal": "${goal || 'maintain'}",
  "dietType": "${dietType || 'balanced'}",
  "portionSize": "${portionSize || 'medium'}",
  "meals": [
    {
      "name": "Breakfast",
      "time": "8:00 AM",
      "foods": ["1 cup oatmeal", "200g Greek yogurt", "1 medium banana"],
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "description": "brief description of the meal"
    }
  ],
  "tips": ["practical tip 1", "practical tip 2", "practical tip 3"]
}

REMINDER: Every meal object MUST have non-zero values for calories, protein, carbs, AND fat fields.`;

    const response = await ai.generate(prompt);
    const mealPlan = ai.parseJSON(response);
    
    if (mealPlan && mealPlan.meals) {
      console.log('✅ Meal plan generated:', mealPlan.planName);
      res.json({ 
        success: true, 
        plan: mealPlan,
        model: aiModel 
      });
    } else {
      console.error('Failed to parse meal plan response:', response?.substring(0, 200));
      res.status(500).json({ error: 'Failed to generate valid meal plan. Please try again.' });
    }
  } catch (error) {
    console.error('Meal plan generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate meal plan: ' + error.message });
  }
});

// Analyze food image with AI Vision
app.post('/api/analyze-food', requireAI, upload.single('image'), async (req, res) => {
  // Track analytics
  checkDailyReset();
  analytics.foodAnalysesToday++;
  analytics.aiRequestsToday++;
  
  try {
    const foodDescription = req.body.foodDescription;
    const imageFile = req.file;

    // If image is uploaded, use vision analysis
    if (imageFile) {
      console.log('📸 Analyzing food image with vision AI...');
      
      const base64Image = imageFile.buffer.toString('base64');
      const mimeType = imageFile.mimetype || 'image/jpeg';
      
      try {
        const visionResult = await ai.analyzeImageFood(base64Image, mimeType);
        
        if (visionResult && visionResult.identified) {
          console.log('✅ Food identified:', visionResult.mainDish);
          
          res.json({
            message: "Food image analyzed successfully",
            isImageAnalysis: true,
            visionAnalysis: visionResult,
            foodAnalysis: {
              'Food Item': visionResult.mainDish,
              'Foods Detected': visionResult.foodItems,
              'Calories': visionResult.estimatedCalories,
              'Protein': visionResult.estimatedProtein + 'g',
              'Carbohydrates': visionResult.estimatedCarbs + 'g',
              'Total Fat': visionResult.estimatedFat + 'g',
              'Health Score': visionResult.healthScore + '/10',
              'Confidence': visionResult.confidence
            },
            recommendation: { 
              recommendation: visionResult.suggestions?.join('. ') || 'Enjoy your meal in moderation!' 
            },
            aiModel: 'llama-3.2-90b-vision-preview'
          });
          return;
        } else {
          // Vision couldn't identify - fall back to description
          console.log('⚠️ Vision could not identify food clearly');
        }
      } catch (visionError) {
        console.error('Vision analysis failed:', visionError.message);
        // Fall back to text description if vision fails
      }
    }

    // Text-based analysis (fallback or no image)
    if (!foodDescription) {
      return res.status(400).json({ 
        error: 'Please provide a food description or upload a clearer image' 
      });
    }

    const data = await ai.getNutrition(foodDescription, [], 100, 'g', false);
    
    if (!data) {
      return res.status(500).json({ error: 'AI nutrition analysis failed' });
    }

    let recommendation = null;
    try { 
      recommendation = await ai.getRecommendation(foodDescription); 
    } catch(e) {
      console.log('Recommendation fetch failed:', e.message);
    }

    res.json({
      message: "Food analyzed",
      isImageAnalysis: false,
      foodAnalysis: {
        'Food Item': foodDescription,
        'Calories': data.calories,
        'Total Fat': data.fat,
        'Carbohydrates': data.carbohydrates,
        'Protein': data.protein,
        'Fiber': data.fiber,
        'Sugar': data.sugar,
        'Sodium': data.sodium
      },
      recommendation: { recommendation },
      aiModel: aiModel
    });
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

// User profile (optional DB feature)
app.post('/api/users', async (req, res) => {
  const { age, height, weight, caloric_target, protein_target, dietary_preferences, complications } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO users (age, height, weight, caloric_target, protein_target, dietary_preferences, complications)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [age, height, weight, caloric_target, protein_target, dietary_preferences?.join(',') || '', complications?.join(',') || '']
    );
    res.status(201).json({ message: "User created", userId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// Calculate exercise/activity calories with AI
app.post('/api/calculate-exercise-calories', requireAI, async (req, res) => {
  try {
    const { 
      exercise, 
      duration, 
      intensity, 
      weight, 
      type, 
      bodyPart, 
      category, 
      baseMet,
      // Gym specific
      sets,
      reps,
      restTime,
      estimatedDuration,
      // Activity specific
      distance,
      needsDistance
    } = req.body;

    if (!exercise || !intensity || !weight) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const intensityMultipliers = {
      light: 0.75,
      moderate: 1.0,
      intense: 1.25,
      extreme: 1.5,
    };

    let workoutDuration = duration || estimatedDuration || 30;
    let baseCalories;
    let workoutDetails = '';

    if (type === 'gym' && sets && reps) {
      // Gym exercise calculation based on sets × reps
      const adjustedMet = baseMet * (intensityMultipliers[intensity] || 1.0);
      // Calculate total work time: sets × reps × time per rep + rest time between sets
      const totalVolume = sets * reps;
      workoutDuration = estimatedDuration || Math.ceil((totalVolume * 3 + (sets - 1) * (restTime || 60)) / 60);
      baseCalories = Math.round((adjustedMet * weight * workoutDuration) / 60);
      workoutDetails = `Sets: ${sets}, Reps: ${reps}, Rest: ${restTime || 60}s, Estimated duration: ~${workoutDuration} min`;
    } else if (type === 'activity' && needsDistance && distance) {
      // Activity with distance - calculate based on distance covered
      const adjustedMet = baseMet * (intensityMultipliers[intensity] || 1.0);
      // For distance-based activities, use both duration and distance for more accurate calculation
      // Speed = distance / (duration in hours)
      const durationHours = workoutDuration / 60;
      const speed = distance / durationHours; // km/h
      
      // Adjust MET based on speed for running/cycling
      let speedAdjustedMet = adjustedMet;
      if (exercise.toLowerCase().includes('running') || exercise.toLowerCase().includes('sprinting')) {
        // Running: ~0.75 kcal per km per kg for jogging, increases with speed
        speedAdjustedMet = Math.max(adjustedMet, speed * 0.8);
      } else if (exercise.toLowerCase().includes('cycling') || exercise.toLowerCase().includes('biking')) {
        // Cycling: varies by speed
        speedAdjustedMet = Math.max(adjustedMet, speed * 0.4);
      }
      
      baseCalories = Math.round((speedAdjustedMet * weight * workoutDuration) / 60);
      workoutDetails = `Distance: ${distance} km, Duration: ${workoutDuration} min, Avg Speed: ${speed.toFixed(1)} km/h`;
    } else {
      // Standard duration-based calculation
      const adjustedMet = baseMet * (intensityMultipliers[intensity] || 1.0);
      baseCalories = Math.round((adjustedMet * weight * workoutDuration) / 60);
      workoutDetails = `Duration: ${workoutDuration} min`;
    }

    // Use AI to provide personalized tips and refined calculation
    const prompt = `As a fitness expert, provide a brief analysis for this workout:

Exercise: ${exercise}
Type: ${type === 'gym' ? `Gym - ${bodyPart}` : `Activity - ${category}`}
Workout Details: ${workoutDetails}
Intensity: ${intensity}
User weight: ${weight} kg
Base calorie calculation: ${baseCalories} kcal

${type === 'gym' && sets && reps ? `
For this strength exercise with ${sets} sets of ${reps} reps:
- Consider the compound vs isolation nature of the movement
- Account for the effort during rest periods
- Factor in the metabolic demand of the exercise
` : ''}

${needsDistance && distance ? `
For this ${distance} km ${exercise} session:
- Consider terrain and effort variations
- Account for warm-up and cool-down phases
- Factor in the consistent effort required
` : ''}

Provide:
1. A refined calorie estimate if the base calculation seems off (within ±20% of base)
2. ONE specific tip for this exercise (max 20 words)

Return ONLY valid JSON:
{
  "calories": <number - refined calorie estimate>,
  "tip": "your single exercise-specific tip here"
}`;

    try {
      const response = await ai.generate(prompt);
      const result = ai.parseJSON(response);
      
      if (result) {
        res.json({
          calories: result.calories || baseCalories,
          exercise,
          duration: workoutDuration,
          intensity,
          sets: sets || null,
          reps: reps || null,
          distance: distance || null,
          tips: result.tip || 'Stay hydrated and maintain proper form throughout your workout.',
          model: aiModel
        });
      } else {
        // Fallback if AI response fails to parse
        res.json({
          calories: baseCalories,
          exercise,
          duration: workoutDuration,
          intensity,
          sets: sets || null,
          reps: reps || null,
          distance: distance || null,
          tips: 'Stay hydrated and maintain proper form throughout your workout.',
          model: aiModel
        });
      }
    } catch (aiError) {
      console.log('AI tip generation failed, using fallback:', aiError.message);
      res.json({
        calories: baseCalories,
        exercise,
        duration: workoutDuration,
        intensity,
        sets: sets || null,
        reps: reps || null,
        distance: distance || null,
        tips: 'Stay hydrated and maintain proper form throughout your workout.',
        model: aiModel
      });
    }
  } catch (error) {
    console.error('Exercise calorie calculation error:', error.message);
    res.status(500).json({ error: 'Failed to calculate calories: ' + error.message });
  }
});

// Calculate custom activity calories with AI
app.post('/api/calculate-custom-calories', requireAI, async (req, res) => {
  try {
    const {
      activityDescription,
      activityType,
      sets,
      reps,
      restTime,
      duration,
      distance,
      intensity,
      weight,
      height,
      age
    } = req.body;

    if (!activityDescription || !intensity || !weight) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const intensityMultipliers = {
      light: 0.75,
      moderate: 1.0,
      intense: 1.25,
      extreme: 1.5,
    };

    // Calculate base duration for gym activities
    let workoutDuration = duration;
    if (activityType === 'gym' && sets && reps) {
      const totalVolume = sets * reps;
      workoutDuration = Math.ceil((totalVolume * 3 + (sets - 1) * (restTime || 60)) / 60);
    }

    // Build AI prompt for custom activity analysis
    const prompt = `As a fitness and exercise physiology expert, analyze this custom activity and calculate calories burned:

ACTIVITY: "${activityDescription}"
TYPE: ${activityType} (gym/strength, cardio, or other activity)

USER PROFILE:
- Weight: ${weight} kg
- Height: ${height || 'Not provided'} cm
- Age: ${age || 'Not provided'} years

PARAMETERS PROVIDED:
${activityType === 'gym' ? `
- Sets: ${sets || 'Not specified'}
- Reps per set: ${reps || 'Not specified'}
- Rest between sets: ${restTime || 60} seconds
- Calculated duration: ~${workoutDuration} minutes
- Intensity: ${intensity}
` : `
- Duration: ${duration || 30} minutes
- Distance: ${distance || 'Not specified'}
- Intensity: ${intensity}
`}

Based on scientific MET values and exercise physiology:
1. Identify what type of activity this most closely resembles
2. Assign an appropriate MET value (1-15 range)
3. Calculate calories using: Calories = MET × weight(kg) × duration(hours) × intensity multiplier
4. Intensity multipliers: light=0.75, moderate=1.0, intense=1.25, extreme=1.5

Provide your analysis as JSON ONLY:
{
  "met": <number - estimated MET value>,
  "calories": <number - calculated calories burned>,
  "duration": <number - duration in minutes>,
  "category": "<string - what category this activity fits>",
  "tip": "<string - one brief exercise tip, max 25 words>",
  "reasoning": "<string - brief explanation of MET assignment, max 30 words>"
}`;

    try {
      const response = await ai.generate(prompt);
      const result = ai.parseJSON(response);
      
      if (result && result.calories) {
        res.json({
          calories: Math.round(result.calories),
          exercise: activityDescription,
          duration: result.duration || workoutDuration || duration || 30,
          intensity,
          sets: activityType === 'gym' ? sets : null,
          reps: activityType === 'gym' ? reps : null,
          distance: distance || null,
          met: result.met,
          category: result.category,
          tips: result.tip || 'Great job staying active!',
          reasoning: result.reasoning,
          model: aiModel,
          isCustom: true
        });
      } else {
        // Fallback calculation
        const baseMet = activityType === 'gym' ? 5.0 : activityType === 'cardio' ? 7.0 : 4.5;
        const adjustedMet = baseMet * intensityMultipliers[intensity];
        const calcDuration = workoutDuration || duration || 30;
        const calories = Math.round((adjustedMet * weight * calcDuration) / 60);
        
        res.json({
          calories,
          exercise: activityDescription,
          duration: calcDuration,
          intensity,
          sets: activityType === 'gym' ? sets : null,
          reps: activityType === 'gym' ? reps : null,
          distance: distance || null,
          met: baseMet,
          tips: 'Estimated based on activity type. Great job staying active!',
          model: aiModel,
          isCustom: true
        });
      }
    } catch (aiError) {
      console.log('Custom AI calculation failed, using fallback:', aiError.message);
      const baseMet = activityType === 'gym' ? 5.0 : activityType === 'cardio' ? 7.0 : 4.5;
      const adjustedMet = baseMet * intensityMultipliers[intensity];
      const calcDuration = workoutDuration || duration || 30;
      const calories = Math.round((adjustedMet * weight * calcDuration) / 60);
      
      res.json({
        calories,
        exercise: activityDescription,
        duration: calcDuration,
        intensity,
        sets: activityType === 'gym' ? sets : null,
        reps: activityType === 'gym' ? reps : null,
        distance: distance || null,
        tips: 'Activity logged successfully!',
        isCustom: true
      });
    }
  } catch (error) {
    console.error('Custom calorie calculation error:', error.message);
    res.status(500).json({ error: 'Failed to calculate calories: ' + error.message });
  }
});

// ===================== DATABASE SYNC API ENDPOINTS =====================

// Initialize all database tables
async function initDatabaseTables() {
  try {
    // Check if tables exist, if not provide guidance
    const tableCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_profiles'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('⚠️  Database tables not found. Run setup_db.sql to create them.');
      console.log('   psql -U postgres -d nutrition_db -f setup_db.sql');
    } else {
      console.log('✅ Database tables verified');
    }
  } catch (err) {
    console.warn('⚠️  Database check failed:', err.message);
  }
}

// ===================== USER PROFILE ENDPOINTS =====================

// Get user profile
app.get('/api/user/profile', requireUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT up.*, au.email, au.name, au.membership 
      FROM user_profiles up
      JOIN app_users au ON up.user_id = au.id
      WHERE au.email = $1
    `, [req.user.email]);
    
    if (result.rows.length === 0) {
      // Return basic user info if no profile exists
      return res.json({ 
        profile: null, 
        user: { email: req.user.email, name: req.user.name } 
      });
    }
    
    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Create or update user profile
app.post('/api/user/profile', requireUser, async (req, res) => {
  const { 
    age, gender, height, weight, activity_level,
    caloric_target, protein_target, carbs_target, fat_target, water_target, step_goal,
    diet_type, dietary_restrictions, allergies, health_conditions
  } = req.body;
  
  try {
    // Get user ID
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userResult.rows[0].id;
    
    // Calculate BMI, BMR, TDEE
    const h = height / 100; // cm to m
    const bmi = weight && height ? (weight / (h * h)).toFixed(1) : null;
    
    // Mifflin-St Jeor
    let bmr = null;
    if (weight && height && age) {
      bmr = gender === 'female' 
        ? (10 * weight + 6.25 * height - 5 * age - 161)
        : (10 * weight + 6.25 * height - 5 * age + 5);
    }
    
    const activityFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const tdee = bmr ? Math.round(bmr * (activityFactors[activity_level] || 1.55)) : null;
    
    // Upsert profile
    const result = await pool.query(`
      INSERT INTO user_profiles (
        user_id, age, gender, height, weight, bmi, bmr, tdee, activity_level,
        caloric_target, protein_target, carbs_target, fat_target, water_target, step_goal,
        diet_type, dietary_restrictions, allergies, health_conditions, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        age = EXCLUDED.age, gender = EXCLUDED.gender, height = EXCLUDED.height,
        weight = EXCLUDED.weight, bmi = EXCLUDED.bmi, bmr = EXCLUDED.bmr, tdee = EXCLUDED.tdee,
        activity_level = EXCLUDED.activity_level, caloric_target = EXCLUDED.caloric_target,
        protein_target = EXCLUDED.protein_target, carbs_target = EXCLUDED.carbs_target,
        fat_target = EXCLUDED.fat_target, water_target = EXCLUDED.water_target,
        step_goal = EXCLUDED.step_goal, diet_type = EXCLUDED.diet_type,
        dietary_restrictions = EXCLUDED.dietary_restrictions, allergies = EXCLUDED.allergies,
        health_conditions = EXCLUDED.health_conditions, updated_at = NOW()
      RETURNING *
    `, [userId, age, gender, height, weight, bmi, bmr, tdee, activity_level,
        caloric_target || 2000, protein_target || 100, carbs_target || 250, 
        fat_target || 65, water_target || 8, step_goal || 10000,
        diet_type || 'balanced', dietary_restrictions || [], allergies || [], health_conditions || []]);
    
    addLog('info', `Profile updated: ${req.user.email}`);
    res.json({ profile: result.rows[0], message: 'Profile saved' });
  } catch (err) {
    console.error('Save profile error:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// ===================== WATER TRACKING ENDPOINTS =====================

// Get today's water tracking
app.get('/api/tracking/water', requireUser, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(
      'SELECT * FROM water_tracking WHERE user_id = $1 AND date = $2',
      [userId, date]
    );
    
    res.json({ tracking: result.rows[0] || null, date });
  } catch (err) {
    console.error('Get water tracking error:', err);
    res.status(500).json({ error: 'Failed to fetch water tracking' });
  }
});

// Save water tracking
app.post('/api/tracking/water', requireUser, async (req, res) => {
  const { glasses_consumed, target_glasses, glass_size_ml, intake_log } = req.body;
  const date = req.body.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const total_ml = glasses_consumed * glass_size_ml;
    const goal_achieved = glasses_consumed >= target_glasses;
    
    const result = await pool.query(`
      INSERT INTO water_tracking (user_id, date, glasses_consumed, target_glasses, glass_size_ml, total_ml, intake_log, goal_achieved)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, date) DO UPDATE SET
        glasses_consumed = EXCLUDED.glasses_consumed,
        target_glasses = EXCLUDED.target_glasses,
        glass_size_ml = EXCLUDED.glass_size_ml,
        total_ml = EXCLUDED.total_ml,
        intake_log = EXCLUDED.intake_log,
        goal_achieved = EXCLUDED.goal_achieved,
        updated_at = NOW()
      RETURNING *
    `, [userId, date, glasses_consumed, target_glasses, glass_size_ml, total_ml, JSON.stringify(intake_log || []), goal_achieved]);
    
    res.json({ tracking: result.rows[0], message: 'Water tracking saved' });
  } catch (err) {
    console.error('Save water tracking error:', err);
    res.status(500).json({ error: 'Failed to save water tracking' });
  }
});

// ===================== FOOD/MACRO TRACKING ENDPOINTS =====================

// Get today's food tracking
app.get('/api/tracking/food', requireUser, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    // Get daily totals
    const trackingResult = await pool.query(
      'SELECT * FROM food_tracking WHERE user_id = $1 AND date = $2',
      [userId, date]
    );
    
    // Get individual food entries
    const entriesResult = await pool.query(
      'SELECT * FROM food_log_entries WHERE user_id = $1 AND date = $2 ORDER BY logged_at DESC',
      [userId, date]
    );
    
    res.json({ 
      tracking: trackingResult.rows[0] || null, 
      entries: entriesResult.rows,
      date 
    });
  } catch (err) {
    console.error('Get food tracking error:', err);
    res.status(500).json({ error: 'Failed to fetch food tracking' });
  }
});

// Save daily food totals
app.post('/api/tracking/food', requireUser, async (req, res) => {
  const { 
    calorie_target, protein_target, carbs_target, fat_target,
    calories_consumed, protein_consumed, carbs_consumed, fat_consumed
  } = req.body;
  const date = req.body.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const calorie_progress = calorie_target ? (calories_consumed / calorie_target * 100) : 0;
    const protein_progress = protein_target ? (protein_consumed / protein_target * 100) : 0;
    
    const result = await pool.query(`
      INSERT INTO food_tracking (user_id, date, calorie_target, protein_target, carbs_target, fat_target,
        calories_consumed, protein_consumed, carbs_consumed, fat_consumed, calorie_progress, protein_progress)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id, date) DO UPDATE SET
        calorie_target = EXCLUDED.calorie_target, protein_target = EXCLUDED.protein_target,
        carbs_target = EXCLUDED.carbs_target, fat_target = EXCLUDED.fat_target,
        calories_consumed = EXCLUDED.calories_consumed, protein_consumed = EXCLUDED.protein_consumed,
        carbs_consumed = EXCLUDED.carbs_consumed, fat_consumed = EXCLUDED.fat_consumed,
        calorie_progress = EXCLUDED.calorie_progress, protein_progress = EXCLUDED.protein_progress,
        updated_at = NOW()
      RETURNING *
    `, [userId, date, calorie_target, protein_target, carbs_target, fat_target,
        calories_consumed, protein_consumed, carbs_consumed, fat_consumed, calorie_progress, protein_progress]);
    
    res.json({ tracking: result.rows[0], message: 'Food tracking saved' });
  } catch (err) {
    console.error('Save food tracking error:', err);
    res.status(500).json({ error: 'Failed to save food tracking' });
  }
});

// Add a food entry
app.post('/api/tracking/food/entry', requireUser, async (req, res) => {
  const { 
    food_name, meal_type, serving_size, quantity,
    calories, protein, carbs, fat, fiber, sugar, notes
  } = req.body;
  const date = req.body.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    // Get or create tracking record for the day
    let trackingResult = await pool.query(
      'SELECT id FROM food_tracking WHERE user_id = $1 AND date = $2',
      [userId, date]
    );
    
    if (trackingResult.rows.length === 0) {
      trackingResult = await pool.query(`
        INSERT INTO food_tracking (user_id, date) VALUES ($1, $2) RETURNING id
      `, [userId, date]);
    }
    const trackingId = trackingResult.rows[0].id;
    
    // Add food entry
    const entryResult = await pool.query(`
      INSERT INTO food_log_entries (user_id, tracking_id, date, food_name, meal_type, serving_size, quantity,
        calories, protein, carbs, fat, fiber, sugar, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [userId, trackingId, date, food_name, meal_type, serving_size, quantity || 1,
        calories || 0, protein || 0, carbs || 0, fat || 0, fiber || 0, sugar || 0, notes]);
    
    // Update daily totals
    await pool.query(`
      UPDATE food_tracking SET
        calories_consumed = calories_consumed + $1,
        protein_consumed = protein_consumed + $2,
        carbs_consumed = carbs_consumed + $3,
        fat_consumed = fat_consumed + $4,
        updated_at = NOW()
      WHERE id = $5
    `, [calories || 0, protein || 0, carbs || 0, fat || 0, trackingId]);
    
    analytics.foodAnalysesToday++;
    res.json({ entry: entryResult.rows[0], message: 'Food entry added' });
  } catch (err) {
    console.error('Add food entry error:', err);
    res.status(500).json({ error: 'Failed to add food entry' });
  }
});

// Delete a food entry
app.delete('/api/tracking/food/entry/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    // Get entry to subtract from totals
    const entryResult = await pool.query(
      'SELECT * FROM food_log_entries WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const entry = entryResult.rows[0];
    
    // Update daily totals
    await pool.query(`
      UPDATE food_tracking SET
        calories_consumed = calories_consumed - $1,
        protein_consumed = protein_consumed - $2,
        carbs_consumed = carbs_consumed - $3,
        fat_consumed = fat_consumed - $4,
        updated_at = NOW()
      WHERE id = $5
    `, [entry.calories, entry.protein, entry.carbs, entry.fat, entry.tracking_id]);
    
    // Delete entry
    await pool.query('DELETE FROM food_log_entries WHERE id = $1', [id]);
    
    res.json({ message: 'Food entry deleted' });
  } catch (err) {
    console.error('Delete food entry error:', err);
    res.status(500).json({ error: 'Failed to delete food entry' });
  }
});

// ===================== MICRONUTRIENT TRACKING ENDPOINTS =====================

// Get weekly micronutrient tracking
app.get('/api/tracking/micros', requireUser, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    // Get current week start (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff)).toISOString().split('T')[0];
    
    const result = await pool.query(
      'SELECT * FROM micronutrient_tracking WHERE user_id = $1 AND week_start = $2',
      [userId, weekStart]
    );
    
    res.json({ tracking: result.rows[0] || null, week_start: weekStart });
  } catch (err) {
    console.error('Get micro tracking error:', err);
    res.status(500).json({ error: 'Failed to fetch micronutrient tracking' });
  }
});

// Save micronutrient tracking
app.post('/api/tracking/micros', requireUser, async (req, res) => {
  const { 
    vitamin_a_days, vitamin_c_days, vitamin_d_days, vitamin_b12_days,
    iron_days, calcium_days, zinc_days, omega3_days, daily_log
  } = req.body;
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    // Get current week start
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff)).toISOString().split('T')[0];
    
    const result = await pool.query(`
      INSERT INTO micronutrient_tracking (user_id, week_start, vitamin_a_days, vitamin_c_days, vitamin_d_days, 
        vitamin_b12_days, iron_days, calcium_days, zinc_days, omega3_days, daily_log)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id, week_start) DO UPDATE SET
        vitamin_a_days = EXCLUDED.vitamin_a_days, vitamin_c_days = EXCLUDED.vitamin_c_days,
        vitamin_d_days = EXCLUDED.vitamin_d_days, vitamin_b12_days = EXCLUDED.vitamin_b12_days,
        iron_days = EXCLUDED.iron_days, calcium_days = EXCLUDED.calcium_days,
        zinc_days = EXCLUDED.zinc_days, omega3_days = EXCLUDED.omega3_days,
        daily_log = EXCLUDED.daily_log, updated_at = NOW()
      RETURNING *
    `, [userId, weekStart, vitamin_a_days || 0, vitamin_c_days || 0, vitamin_d_days || 0,
        vitamin_b12_days || 0, iron_days || 0, calcium_days || 0, zinc_days || 0, omega3_days || 0,
        JSON.stringify(daily_log || {})]);
    
    res.json({ tracking: result.rows[0], message: 'Micronutrient tracking saved' });
  } catch (err) {
    console.error('Save micro tracking error:', err);
    res.status(500).json({ error: 'Failed to save micronutrient tracking' });
  }
});

// ===================== WORKOUT LOG ENDPOINTS =====================

// Get workouts for a date
app.get('/api/tracking/workouts', requireUser, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(
      'SELECT * FROM workout_log WHERE user_id = $1 AND date = $2 ORDER BY logged_at DESC',
      [userId, date]
    );
    
    // Calculate total calories burned
    const totalBurned = result.rows.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
    
    res.json({ workouts: result.rows, total_burned: totalBurned, date });
  } catch (err) {
    console.error('Get workouts error:', err);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Add a workout
app.post('/api/tracking/workouts', requireUser, async (req, res) => {
  const {
    exercise_name, exercise_type, duration_minutes, intensity,
    calories_burned, sets, reps, weight_kg, distance_km, notes, source
  } = req.body;
  const date = req.body.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(`
      INSERT INTO workout_log (user_id, date, exercise_name, exercise_type, duration_minutes, intensity,
        calories_burned, sets, reps, weight_kg, distance_km, notes, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [userId, date, exercise_name, exercise_type, duration_minutes, intensity,
        calories_burned || 0, sets, reps, weight_kg, distance_km, notes, source || 'manual']);
    
    // Update daily fitness summary
    await pool.query(`
      INSERT INTO daily_fitness (user_id, date, calories_burned, active_minutes, workouts_count)
      VALUES ($1, $2, $3, $4, 1)
      ON CONFLICT (user_id, date) DO UPDATE SET
        calories_burned = daily_fitness.calories_burned + EXCLUDED.calories_burned,
        workouts_count = daily_fitness.workouts_count + 1,
        active_minutes = daily_fitness.active_minutes + EXCLUDED.active_minutes
    `, [userId, date, calories_burned || 0, duration_minutes || 0]);
    
    res.json({ workout: result.rows[0], message: 'Workout logged' });
  } catch (err) {
    console.error('Add workout error:', err);
    res.status(500).json({ error: 'Failed to add workout' });
  }
});

// Delete a workout
app.delete('/api/tracking/workouts/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    // Get workout to subtract from summary
    const workoutResult = await pool.query(
      'SELECT * FROM workout_log WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (workoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    const workout = workoutResult.rows[0];
    
    // Update daily summary
    await pool.query(`
      UPDATE daily_fitness SET
        calories_burned = GREATEST(0, calories_burned - $1),
        workouts_count = GREATEST(0, workouts_count - 1),
        active_minutes = GREATEST(0, active_minutes - $2)
      WHERE user_id = $3 AND date = $4
    `, [workout.calories_burned || 0, workout.duration_minutes || 0, userId, workout.date]);
    
    // Delete workout
    await pool.query('DELETE FROM workout_log WHERE id = $1', [id]);
    
    res.json({ message: 'Workout deleted' });
  } catch (err) {
    console.error('Delete workout error:', err);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// ===================== DAILY FITNESS SUMMARY ENDPOINTS =====================

// Get daily fitness summary
app.get('/api/tracking/fitness-summary', requireUser, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(
      'SELECT * FROM daily_fitness WHERE user_id = $1 AND date = $2',
      [userId, date]
    );
    
    res.json({ summary: result.rows[0] || null, date });
  } catch (err) {
    console.error('Get fitness summary error:', err);
    res.status(500).json({ error: 'Failed to fetch fitness summary' });
  }
});

// Get workouts by period (day/week/month)
app.get('/api/tracking/workouts/period', requireUser, async (req, res) => {
  const period = req.query.period || 'day'; // day, week, month
  const dateParam = req.query.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    let startDate, endDate;
    const currentDate = new Date(dateParam);
    
    if (period === 'day') {
      startDate = dateParam;
      endDate = dateParam;
    } else if (period === 'week') {
      // Start from Sunday of current week
      const dayOfWeek = currentDate.getDay();
      const sunday = new Date(currentDate);
      sunday.setDate(currentDate.getDate() - dayOfWeek);
      startDate = sunday.toISOString().split('T')[0];
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      endDate = saturday.toISOString().split('T')[0];
    } else if (period === 'month') {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    
    // Get all workouts for the period
    const workoutsResult = await pool.query(
      `SELECT * FROM workout_log 
       WHERE user_id = $1 AND date >= $2 AND date <= $3 
       ORDER BY date DESC, logged_at DESC`,
      [userId, startDate, endDate]
    );
    
    // Get daily fitness summaries for the period
    const fitnessResult = await pool.query(
      `SELECT * FROM daily_fitness 
       WHERE user_id = $1 AND date >= $2 AND date <= $3 
       ORDER BY date DESC`,
      [userId, startDate, endDate]
    );
    
    // Calculate totals
    const totalCaloriesBurned = workoutsResult.rows.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
    const totalWorkouts = workoutsResult.rows.length;
    const totalDuration = workoutsResult.rows.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
    const totalSteps = fitnessResult.rows.reduce((sum, f) => sum + (f.steps || 0), 0);
    
    // Group workouts by date
    const workoutsByDate = workoutsResult.rows.reduce((acc, w) => {
      const date = w.date.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(w);
      return acc;
    }, {});
    
    res.json({
      period,
      startDate,
      endDate,
      workouts: workoutsResult.rows,
      workoutsByDate,
      fitnessSummaries: fitnessResult.rows,
      totals: {
        calories_burned: totalCaloriesBurned,
        workouts_count: totalWorkouts,
        duration_minutes: totalDuration,
        steps: totalSteps,
        active_days: Object.keys(workoutsByDate).length
      }
    });
  } catch (err) {
    console.error('Get period workouts error:', err);
    res.status(500).json({ error: 'Failed to fetch workout data' });
  }
});

// Update daily fitness summary (steps, etc.)
app.post('/api/tracking/fitness-summary', requireUser, async (req, res) => {
  const { steps, distance_km, calories_burned, active_minutes } = req.body;
  const date = req.body.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    // Get step goal from profile
    const profileResult = await pool.query('SELECT step_goal FROM user_profiles WHERE user_id = $1', [userId]);
    const stepGoal = profileResult.rows[0]?.step_goal || 10000;
    
    const result = await pool.query(`
      INSERT INTO daily_fitness (user_id, date, steps, step_goal, calories_burned, active_minutes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, date) DO UPDATE SET
        steps = COALESCE(EXCLUDED.steps, daily_fitness.steps),
        calories_burned = COALESCE(EXCLUDED.calories_burned, daily_fitness.calories_burned),
        active_minutes = COALESCE(EXCLUDED.active_minutes, daily_fitness.active_minutes),
        step_goal = EXCLUDED.step_goal
      RETURNING *
    `, [userId, date, steps, stepGoal, calories_burned, active_minutes]);
    
    res.json({ summary: result.rows[0], message: 'Fitness summary updated' });
  } catch (err) {
    console.error('Update fitness summary error:', err);
    res.status(500).json({ error: 'Failed to update fitness summary' });
  }
});

// ===================== MEAL PLAN ENDPOINTS =====================

// Get saved meal plans
app.get('/api/meal-plans', requireUser, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(
      'SELECT * FROM saved_meal_plans WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({ plans: result.rows });
  } catch (err) {
    console.error('Get meal plans error:', err);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

// Save a meal plan
app.post('/api/meal-plans', requireUser, async (req, res) => {
  const {
    plan_name, description, calories, protein, goal, diet_type, 
    meals_per_day, portion_size, restrictions, plan_data,
    total_calories, total_protein, total_carbs, total_fat
  } = req.body;
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(`
      INSERT INTO saved_meal_plans (user_id, plan_name, description, calories, protein, goal, diet_type,
        meals_per_day, portion_size, restrictions, plan_data, total_calories, total_protein, total_carbs, total_fat)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [userId, plan_name, description, calories, protein, goal, diet_type,
        meals_per_day || 4, portion_size || 'medium', restrictions || [],
        JSON.stringify(plan_data), total_calories, total_protein, total_carbs, total_fat]);
    
    res.json({ plan: result.rows[0], message: 'Meal plan saved' });
  } catch (err) {
    console.error('Save meal plan error:', err);
    res.status(500).json({ error: 'Failed to save meal plan' });
  }
});

// Set active meal plan
app.patch('/api/meal-plans/:id/activate', requireUser, async (req, res) => {
  const { id } = req.params;
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    // Deactivate all other plans
    await pool.query('UPDATE saved_meal_plans SET is_active = FALSE WHERE user_id = $1', [userId]);
    
    // Activate selected plan
    const result = await pool.query(
      'UPDATE saved_meal_plans SET is_active = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }
    
    res.json({ plan: result.rows[0], message: 'Meal plan activated' });
  } catch (err) {
    console.error('Activate meal plan error:', err);
    res.status(500).json({ error: 'Failed to activate meal plan' });
  }
});

// Delete a meal plan
app.delete('/api/meal-plans/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(
      'DELETE FROM saved_meal_plans WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }
    
    res.json({ message: 'Meal plan deleted' });
  } catch (err) {
    console.error('Delete meal plan error:', err);
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});

// ===================== AI CHAT HISTORY ENDPOINTS =====================

// Get chat history
app.get('/api/chat/history', requireUser, async (req, res) => {
  const { session_id, chat_type, limit = 50 } = req.query;
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    let query = 'SELECT * FROM ai_chat_history WHERE user_id = $1';
    const params = [userId];
    
    if (session_id) {
      query += ' AND session_id = $' + (params.length + 1);
      params.push(session_id);
    }
    if (chat_type) {
      query += ' AND chat_type = $' + (params.length + 1);
      params.push(chat_type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({ messages: result.rows.reverse() });
  } catch (err) {
    console.error('Get chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Save chat message
app.post('/api/chat/history', requireUser, async (req, res) => {
  const { session_id, role, content, chat_type, tokens_used, model_used } = req.body;
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(`
      INSERT INTO ai_chat_history (user_id, session_id, role, content, chat_type, tokens_used, model_used)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [userId, session_id, role, content, chat_type, tokens_used, model_used]);
    
    analytics.chatMessagesToday++;
    res.json({ message: result.rows[0] });
  } catch (err) {
    console.error('Save chat message error:', err);
    res.status(500).json({ error: 'Failed to save chat message' });
  }
});

// ===================== WEIGHT HISTORY ENDPOINTS =====================

// Get weight history
app.get('/api/tracking/weight', requireUser, async (req, res) => {
  const { days = 30 } = req.query;
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(`
      SELECT * FROM weight_history WHERE user_id = $1 AND date >= CURRENT_DATE - $2::interval
      ORDER BY date DESC
    `, [userId, `${days} days`]);
    
    res.json({ history: result.rows });
  } catch (err) {
    console.error('Get weight history error:', err);
    res.status(500).json({ error: 'Failed to fetch weight history' });
  }
});

// Log weight
app.post('/api/tracking/weight', requireUser, async (req, res) => {
  const { weight, body_fat_percentage, muscle_mass, notes } = req.body;
  const date = req.body.date || new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(`
      INSERT INTO weight_history (user_id, date, weight, body_fat_percentage, muscle_mass, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, date) DO UPDATE SET
        weight = EXCLUDED.weight,
        body_fat_percentage = EXCLUDED.body_fat_percentage,
        muscle_mass = EXCLUDED.muscle_mass,
        notes = EXCLUDED.notes
      RETURNING *
    `, [userId, date, weight, body_fat_percentage, muscle_mass, notes]);
    
    // Also update profile weight
    await pool.query('UPDATE user_profiles SET weight = $1, updated_at = NOW() WHERE user_id = $2', [weight, userId]);
    
    res.json({ entry: result.rows[0], message: 'Weight logged' });
  } catch (err) {
    console.error('Log weight error:', err);
    res.status(500).json({ error: 'Failed to log weight' });
  }
});

// ===================== USER SETTINGS ENDPOINTS =====================

// Get user settings
app.get('/api/user/settings', requireUser, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
    
    res.json({ settings: result.rows[0] || null });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Save user settings
app.post('/api/user/settings', requireUser, async (req, res) => {
  const {
    theme, units, language,
    notifications_enabled, daily_reminder_time,
    water_reminders, meal_reminders, workout_reminders,
    profile_public, share_progress,
    default_meal_plan_calories, show_micronutrients, auto_sync_fitness
  } = req.body;
  
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(`
      INSERT INTO user_settings (user_id, theme, units, language, notifications_enabled, daily_reminder_time,
        water_reminders, meal_reminders, workout_reminders, profile_public, share_progress,
        default_meal_plan_calories, show_micronutrients, auto_sync_fitness)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (user_id) DO UPDATE SET
        theme = COALESCE(EXCLUDED.theme, user_settings.theme),
        units = COALESCE(EXCLUDED.units, user_settings.units),
        language = COALESCE(EXCLUDED.language, user_settings.language),
        notifications_enabled = COALESCE(EXCLUDED.notifications_enabled, user_settings.notifications_enabled),
        daily_reminder_time = COALESCE(EXCLUDED.daily_reminder_time, user_settings.daily_reminder_time),
        water_reminders = COALESCE(EXCLUDED.water_reminders, user_settings.water_reminders),
        meal_reminders = COALESCE(EXCLUDED.meal_reminders, user_settings.meal_reminders),
        workout_reminders = COALESCE(EXCLUDED.workout_reminders, user_settings.workout_reminders),
        profile_public = COALESCE(EXCLUDED.profile_public, user_settings.profile_public),
        share_progress = COALESCE(EXCLUDED.share_progress, user_settings.share_progress),
        default_meal_plan_calories = COALESCE(EXCLUDED.default_meal_plan_calories, user_settings.default_meal_plan_calories),
        show_micronutrients = COALESCE(EXCLUDED.show_micronutrients, user_settings.show_micronutrients),
        auto_sync_fitness = COALESCE(EXCLUDED.auto_sync_fitness, user_settings.auto_sync_fitness),
        updated_at = NOW()
      RETURNING *
    `, [userId, theme, units, language, notifications_enabled, daily_reminder_time,
        water_reminders, meal_reminders, workout_reminders, profile_public, share_progress,
        default_meal_plan_calories, show_micronutrients, auto_sync_fitness]);
    
    res.json({ settings: result.rows[0], message: 'Settings saved' });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ===================== USER STREAKS & ACHIEVEMENTS =====================

// Get user streaks
app.get('/api/user/streaks', requireUser, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query('SELECT * FROM user_streaks WHERE user_id = $1', [userId]);
    
    res.json({ streaks: result.rows[0] || null });
  } catch (err) {
    console.error('Get streaks error:', err);
    res.status(500).json({ error: 'Failed to fetch streaks' });
  }
});

// Get user achievements
app.get('/api/user/achievements', requireUser, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(
      'SELECT * FROM user_achievements WHERE user_id = $1 ORDER BY earned_at DESC',
      [userId]
    );
    
    res.json({ achievements: result.rows });
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// ===================== SYNC ALL DATA ENDPOINT =====================

// Get all user data for syncing (useful for initial load)
app.get('/api/user/sync', requireUser, async (req, res) => {
  const date = new Date().toISOString().split('T')[0];
  
  try {
    const userResult = await pool.query('SELECT id, email, name, membership FROM app_users WHERE email = $1', [req.user.email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;
    const user = userResult.rows[0];
    
    // Fetch all data in parallel
    const [profile, water, food, foodEntries, micros, workouts, fitness, settings, streaks, activePlan] = await Promise.all([
      pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM water_tracking WHERE user_id = $1 AND date = $2', [userId, date]),
      pool.query('SELECT * FROM food_tracking WHERE user_id = $1 AND date = $2', [userId, date]),
      pool.query('SELECT * FROM food_log_entries WHERE user_id = $1 AND date = $2 ORDER BY logged_at DESC', [userId, date]),
      pool.query(`SELECT * FROM micronutrient_tracking WHERE user_id = $1 AND week_start = (
        SELECT DATE_TRUNC('week', CURRENT_DATE)::date
      )`, [userId]),
      pool.query('SELECT * FROM workout_log WHERE user_id = $1 AND date = $2 ORDER BY logged_at DESC', [userId, date]),
      pool.query('SELECT * FROM daily_fitness_summary WHERE user_id = $1 AND date = $2', [userId, date]),
      pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM user_streaks WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM saved_meal_plans WHERE user_id = $1 AND is_active = TRUE', [userId])
    ]);
    
    res.json({
      user,
      profile: profile.rows[0] || null,
      today: {
        water: water.rows[0] || null,
        food: food.rows[0] || null,
        food_entries: foodEntries.rows,
        workouts: workouts.rows,
        fitness: fitness.rows[0] || null
      },
      micros: micros.rows[0] || null,
      settings: settings.rows[0] || null,
      streaks: streaks.rows[0] || null,
      active_meal_plan: activePlan.rows[0] || null,
      synced_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// ===================== START SERVER =====================

async function start() {
  await initAI();
  await initDatabaseTables();
  
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🍎 Yellow Apple Server Started 🍎                ║
╠═══════════════════════════════════════════════════════════╣
║  URL:  http://localhost:${PORT}                             ║
║  AI:   ${ai ? `✅ ${aiModel}` : '❌ Not configured'}
║  Fit:  ${oauth2Client ? '✅ Google Fit ready' : '⚠️  Not configured'}
║  DB:   ✅ PostgreSQL connected                             ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

start();
