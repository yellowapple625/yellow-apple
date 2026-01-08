import { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Sparkles, Send, Trash2, Bot, User, Zap, Apple, Dumbbell, Salad, Scale, Moon, Sun } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';
import '../components/AiCoachChat.css';
import { BACKEND_URL } from '../config';

export default function AiCoachPage() {
  const { profile, isProfileComplete } = useUserProfile();
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}`);
  const [aiStatus, setAiStatus] = useState({ available: false, model: null });
  const chatBoxRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('ya_client_token');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  // Check AI status on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/ai/status`)
      .then(res => res.json())
      .then(data => setAiStatus(data))
      .catch(() => setAiStatus({ available: false }));
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setChatLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          sessionId,
          userProfile: isProfileComplete ? {
            name: profile.name,
            age: profile.age,
            height: profile.height,
            weight: profile.weight
          } : null
        }),
      });
      const data = await response.json();
      
      if (data.error) {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: data.error,
          isError: true 
        }]);
      } else {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: data.response || 'Sorry, I couldn\'t process that.'
        }]);
      }
    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Connection error. Please check if the server is running.',
        isError: true
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Clear chat history
  const clearChat = async () => {
    setChatHistory([]);
    try {
      await fetch(`${BACKEND_URL}/api/ai/clear-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (e) {
      // Ignore
    }
    setSessionId(`session_${Date.now()}`);
  };

  // Quick action buttons with categories
  const quickActions = [
    { label: 'Meal Plan', prompt: 'Create a healthy meal plan for weight loss for one day', icon: Salad },
    { label: 'Protein Sources', prompt: 'What are the best vegetarian protein sources?', icon: Dumbbell },
    { label: 'Calorie Deficit', prompt: 'How many calories should I eat to lose weight safely?', icon: Scale },
    { label: 'Pre-Workout', prompt: 'What should I eat before a workout?', icon: Zap },
    { label: 'Post-Workout', prompt: 'What should I eat after a workout for muscle recovery?', icon: Apple },
    { label: 'Better Sleep', prompt: 'What foods help improve sleep quality?', icon: Moon },
  ];

  const handleQuickAction = (prompt) => {
    setChatMessage(prompt);
  };

  // Format message content with markdown-like styling
  const formatMessage = (content) => {
    if (!content) return '';
    
    // Split by newlines and handle lists
    return content.split('\n').map((line, i) => {
      // Handle bullet points
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return <li key={i} className="ml-4">{line.replace(/^[\*\-]\s*/, '')}</li>;
      }
      // Handle numbered lists
      if (/^\d+\.\s/.test(line.trim())) {
        return <li key={i} className="ml-4">{line.replace(/^\d+\.\s*/, '')}</li>;
      }
      // Handle bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="mb-2">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
          </p>
        );
      }
      // Regular paragraph
      return line.trim() ? <p key={i} className="mb-2">{line}</p> : null;
    });
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="page-header-with-badge">
          <div>
            <h2>
              <Bot className="header-icon" size={28} />
              AI Nutrition Coach
            </h2>
            <p className="subtitle">Get personalized nutrition advice powered by Llama 3.3</p>
          </div>
          <div className="ai-model-badge">
            <Sparkles size={14} />
            <span>Llama 3.3 70B (Groq)</span>
          </div>
        </div>
        
        <div className="coach-container">
          <div className="ai-card coach-card llama-card">
            {/* Quick Actions */}
            <div className="quick-actions">
              <h4>
                <Zap size={16} />
                Quick Questions
              </h4>
              <div className="quick-btns">
                {quickActions.map((action, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleQuickAction(action.prompt)}
                    className="quick-btn"
                  >
                    <action.icon size={14} />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Box */}
            <div className="chat-box-large" ref={chatBoxRef}>
              {chatHistory.length === 0 && (
                <div className="chat-welcome llama-welcome">
                  <div className="llama-logo">
                    <Bot size={48} />
                  </div>
                  <h3>Welcome to Your AI Nutrition Coach</h3>
                  <p className="llama-badge">Powered by Llama 3.3 70B via Groq</p>
                  <div className="welcome-features">
                    <div className="feature-item">
                      <Salad size={20} />
                      <span>Personalized diet & meal planning</span>
                    </div>
                    <div className="feature-item">
                      <Apple size={20} />
                      <span>Understanding nutrition & calories</span>
                    </div>
                    <div className="feature-item">
                      <Dumbbell size={20} />
                      <span>Sports nutrition guidance</span>
                    </div>
                    <div className="feature-item">
                      <Scale size={20} />
                      <span>Weight management advice</span>
                    </div>
                  </div>
                  <p className="hint">Try one of the quick questions above or type your own below!</p>
                </div>
              )}
              
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`chat-msg ${msg.role} ${msg.isError ? 'error' : ''}`}>
                  <div className="msg-avatar">
                    {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                  </div>
                  <div className="msg-content-wrapper">
                    <div className="msg-header">
                      <span className="msg-sender">
                        {msg.role === 'user' ? 'You' : 'Llama AI'}
                      </span>
                      {msg.role === 'assistant' && !msg.isError && (
                        <span className="ai-badge">
                          <Sparkles size={10} />
                        </span>
                      )}
                    </div>
                    <div className="msg-content">{formatMessage(msg.content)}</div>
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="chat-msg assistant">
                  <div className="msg-avatar">
                    <Bot size={18} />
                  </div>
                  <div className="msg-content-wrapper">
                    <div className="msg-header">
                      <span className="msg-sender">Llama AI</span>
                    </div>
                    <div className="msg-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Input Area */}
            <div className="chat-input-area">
              {chatHistory.length > 0 && (
                <button onClick={clearChat} className="clear-btn" title="Clear chat">
                  <Trash2 size={16} />
                  Clear
                </button>
              )}
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={aiStatus.available 
                    ? "Ask me anything about nutrition, diet, or healthy eating..." 
                    : "AI not available - check server configuration"}
                  disabled={chatLoading || !aiStatus.available}
                  className="chat-input-full"
                />
                <button 
                  onClick={sendChatMessage} 
                  disabled={chatLoading || !chatMessage.trim() || !aiStatus.available}
                  className="send-btn"
                >
                  {chatLoading ? (
                    <div className="spinner-small"></div>
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Tips Sidebar */}
          <div className="coach-tips">
            <div className="tip-card llama-tip">
              <div className="tip-icon">
                <Sparkles size={20} />
              </div>
              <h4>AI-Powered</h4>
              <p>Get instant, personalized nutrition advice powered by Llama 3.3 70B via Groq.</p>
            </div>
            <div className="tip-card">
              <div className="tip-icon">
                <Salad size={20} />
              </div>
              <h4>Nutrition Tip</h4>
              <p>Drink at least 8 glasses of water daily for optimal digestion and energy.</p>
            </div>
            <div className="tip-card">
              <div className="tip-icon">
                <Dumbbell size={20} />
              </div>
              <h4>Did You Know?</h4>
              <p>Protein with every meal helps maintain muscle mass and keeps you full longer.</p>
            </div>
          </div>
        </div>
        
        {!aiStatus.available && (
          <div className="ai-setup-notice">
            <h4>⚠️ AI Features Disabled</h4>
            <p>To enable AI, add your Groq API key to the server .env file:</p>
            <code>GROQ_API_KEY=your_api_key_here</code>
            <p>Get your free API key at: <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Groq Console</a></p>
          </div>
        )}
      </main>
    </div>
  );
}
