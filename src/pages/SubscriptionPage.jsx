import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  Crown, Check, X, Sparkles, Zap, Star, Shield, 
  Clock, Infinity, MessageSquare, Brain, ChefHat,
  TrendingUp, Award, CreditCard, Loader, CheckCircle,
  AlertCircle, Receipt, Calendar
} from 'lucide-react';
import { BACKEND_URL } from '../config';

export default function SubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchSubscription();
    fetchPaymentHistory();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const fetchSubscription = async () => {
    const token = localStorage.getItem('ya_client_token');
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/payment/subscription`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        setCurrentPlan(data.membership || 'free');
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    }
  };

  const fetchPaymentHistory = async () => {
    const token = localStorage.getItem('ya_client_token');
    if (!token) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/payment/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data.payments || []);
      }
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
    }
  };

  const handlePayment = async (planId) => {
    if (planId === 'free') {
      setCurrentPlan('free');
      localStorage.setItem('ya_subscription', 'free');
      return;
    }

    const token = localStorage.getItem('ya_client_token');
    if (!token) {
      setPaymentStatus({ type: 'error', message: 'Please login to subscribe' });
      return;
    }

    setLoading(true);
    setPaymentStatus(null);

    try {
      // Create order
      const orderRes = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId, billingCycle })
      });

      if (!orderRes.ok) {
        const errorData = await orderRes.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderRes.json();

      // Show test mode warning
      if (orderData.testMode) {
        console.log('🧪 Running in Razorpay Test Mode');
        console.log('Test Card: 4111 1111 1111 1111, Expiry: Any future date, CVV: Any 3 digits');
      }

      // Get user info
      const userName = localStorage.getItem('userName') || 'User';
      const userEmail = localStorage.getItem('userEmail') || '';

      // Initialize Razorpay
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'YELLOW APPLE',
        description: orderData.planName,
        order_id: orderData.orderId,
        image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMCIgZmlsbD0iI0ZGRDcwMCIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+8J+NjjwvdGV4dD48L3N2Zz4=',
        prefill: {
          name: userName,
          email: userEmail
        },
        theme: {
          color: '#FFD700'
        },
        handler: async function(response) {
          // Verify payment
          try {
            const verifyRes = await fetch(`${BACKEND_URL}/api/payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              setCurrentPlan(planId);
              localStorage.setItem('ya_subscription', planId);
              localStorage.setItem('userMembership', planId);
              setPaymentStatus({ 
                type: 'success', 
                message: `Successfully upgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)}!` 
              });
              fetchSubscription();
              fetchPaymentHistory();
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err) {
            setPaymentStatus({ type: 'error', message: 'Payment verification failed' });
          }
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setPaymentStatus({ type: 'info', message: 'Payment cancelled' });
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setLoading(false);

    } catch (err) {
      console.error('Payment error:', err);
      setPaymentStatus({ type: 'error', message: err.message || 'Payment failed' });
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Basic',
      icon: Star,
      price: { monthly: 0, yearly: 0 },
      description: 'Essential nutrition tracking without AI',
      color: '#888',
      features: [
        { text: 'Manual food logging', included: true },
        { text: 'Water tracking', included: true },
        { text: 'Basic BMR calculator', included: true },
        { text: 'Daily macro tracking', included: true },
        { text: 'Google Fit integration', included: true },
        { text: 'AI Food Analyzer', included: false },
        { text: 'AI Meal Planner', included: false },
        { text: 'AI Nutrition Coach', included: false },
        { text: 'Unlimited AI queries', included: false },
        { text: 'Priority support', included: false },
      ],
      limitations: [
        'No AI-powered features',
        'Manual entry only',
        'Basic reports'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: Crown,
      price: { monthly: 999, yearly: 9999 },
      description: 'Unlimited AI with premium features',
      color: '#fbbf24',
      features: [
        { text: 'Manual food logging', included: true },
        { text: 'Water tracking', included: true },
        { text: 'Basic BMR calculator', included: true },
        { text: 'Daily macro tracking', included: true },
        { text: 'Google Fit integration', included: true },
        { text: 'AI Food Analyzer', included: true },
        { text: 'AI Meal Planner', included: true },
        { text: 'AI Nutrition Coach', included: true },
        { text: 'Unlimited AI queries', included: true },
        { text: 'Priority support', included: true },
      ],
      limitations: []
    }
  ];

  const aiFeatures = [
    {
      icon: Brain,
      title: 'AI Food Analyzer',
      description: 'Instantly analyze any food, meal, or recipe with Llama 3.3 AI for accurate nutritional breakdown.'
    },
    {
      icon: ChefHat,
      title: 'AI Meal Planner',
      description: 'Get personalized meal plans generated based on your calorie goals, diet preferences, and restrictions.'
    },
    {
      icon: MessageSquare,
      title: 'AI Nutrition Coach',
      description: 'Chat with your personal AI coach for diet advice, meal suggestions, and nutritional guidance.'
    }
  ];

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="subscription-page">
          <div className="subscription-header">
            <div className="header-content">
              <Crown size={32} className="header-icon" />
              <div>
                <h1>Subscription Plans</h1>
                <p>Choose the plan that fits your nutrition journey</p>
              </div>
            </div>
            
            {/* Billing Toggle */}
            <div className="billing-toggle">
              <button 
                className={billingCycle === 'monthly' ? 'active' : ''}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button 
                className={billingCycle === 'yearly' ? 'active' : ''}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly
                <span className="save-badge">Save 17%</span>
              </button>
            </div>
          </div>

          {/* Payment Status */}
          {paymentStatus && (
            <div className={`payment-status ${paymentStatus.type}`}>
              {paymentStatus.type === 'success' && <CheckCircle size={20} />}
              {paymentStatus.type === 'error' && <AlertCircle size={20} />}
              {paymentStatus.type === 'info' && <AlertCircle size={20} />}
              <span>{paymentStatus.message}</span>
              <button onClick={() => setPaymentStatus(null)}>×</button>
            </div>
          )}

          {/* Current Plan Badge */}
          <div className="current-plan-badge">
            <Shield size={16} />
            <span>Current Plan: <strong>{plans.find(p => p.id === currentPlan)?.name || 'Basic'}</strong></span>
            {subscription?.membershipEnd && currentPlan !== 'free' && (
              <span className="expiry">
                <Calendar size={14} />
                Expires: {new Date(subscription.membershipEnd).toLocaleDateString()}
              </span>
            )}
            <button className="history-btn" onClick={() => setShowHistory(!showHistory)}>
              <Receipt size={14} />
              {showHistory ? 'Hide History' : 'Payment History'}
            </button>
          </div>

          {/* Payment History */}
          {showHistory && (
            <div className="payment-history">
              <h3><Receipt size={18} /> Payment History</h3>
              {paymentHistory.length === 0 ? (
                <p className="no-history">No payment history yet</p>
              ) : (
                <div className="history-list">
                  {paymentHistory.map((payment, idx) => (
                    <div key={idx} className="history-item">
                      <div className="history-info">
                        <span className="history-plan">{payment.planName}</span>
                        <span className="history-date">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="history-amount">
                        ₹{(payment.amount / 100).toFixed(2)}
                        <span className={`history-status ${payment.status}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plans Grid */}
          <div className="plans-grid">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = currentPlan === plan.id;
              
              return (
                <div 
                  key={plan.id} 
                  className={`plan-card ${isCurrentPlan ? 'current' : ''}`}
                  style={{ '--plan-color': plan.color }}
                >
                  <div className="plan-header">
                    <div className="plan-icon">
                      <Icon size={24} />
                    </div>
                    <h3>{plan.name}</h3>
                    <p className="plan-description">{plan.description}</p>
                  </div>
                  
                  <div className="plan-price">
                    <span className="currency">₹</span>
                    <span className="amount">
                      {billingCycle === 'monthly' 
                        ? plan.price.monthly 
                        : Math.round(plan.price.yearly / 12)}
                    </span>
                    <span className="period">/month</span>
                  </div>
                  
                  {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                    <p className="yearly-total">
                      Billed ₹{plan.price.yearly}/year
                    </p>
                  )}
                  
                  <ul className="plan-features">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className={feature.included ? 'included' : 'excluded'}>
                        {feature.included ? (
                          <Check size={16} className="check" />
                        ) : (
                          <X size={16} className="x" />
                        )}
                        <span>{feature.text}</span>
                        {feature.note && <span className="feature-note">{feature.note}</span>}
                      </li>
                    ))}
                  </ul>
                  
                  {plan.limitations.length > 0 && (
                    <div className="plan-limitations">
                      <Clock size={14} />
                      <span>{plan.limitations[0]}</span>
                    </div>
                  )}
                  
                  <button 
                    className={`plan-btn ${isCurrentPlan ? 'current' : ''}`}
                    onClick={() => handlePayment(plan.id)}
                    disabled={isCurrentPlan || loading}
                  >
                    {loading ? (
                      <><Loader size={16} className="spin" /> Processing...</>
                    ) : isCurrentPlan ? (
                      <>
                        <Check size={16} /> Current Plan
                      </>
                    ) : plan.id === 'free' ? (
                      'Downgrade to Free'
                    ) : (
                      <>
                        <CreditCard size={16} /> Pay ₹{billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Razorpay Badge */}
          <div className="payment-badge">
            <img src="https://badges.razorpay.com/badge-dark.png" alt="Razorpay" style={{ height: '40px' }} />
            <span>Secure payments powered by Razorpay</span>
          </div>

          {/* AI Features Section */}
          <div className="ai-features-section">
            <div className="section-header">
              <Sparkles size={24} />
              <h2>AI-Powered Features</h2>
              <p>Unlock the power of Llama 3.3 70B AI for your nutrition</p>
            </div>
            
            <div className="ai-features-grid">
              {aiFeatures.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="ai-feature-card">
                    <div className="feature-icon">
                      <Icon size={24} />
                    </div>
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
