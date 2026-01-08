import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import FoodAnalyzerPage from './pages/FoodAnalyzerPage';
import AiCoachPage from './pages/AiCoachPage';
import BmrPage from './pages/BmrPage';
import FitnessPage from './pages/FitnessPage';
import MealPlanPage from './pages/MealPlanPage';
import DailyTrackerPage from './pages/DailyTrackerPage';
import ReportPage from './pages/ReportPage';
import SubscriptionPage from './pages/SubscriptionPage';
import NotesPage from './pages/NotesPage';
import AdminAuthPage from './pages/AdminAuthPage';
import AdminDashboard from './pages/AdminDashboard';

const CLIENT_KEY = 'ya_client_token';
const ADMIN_KEY = 'ya_admin_token';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem(CLIENT_KEY);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem(ADMIN_KEY);
  if (!token) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/food-analyzer"
        element={
          <ProtectedRoute>
            <FoodAnalyzerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/ai-coach"
        element={
          <ProtectedRoute>
            <AiCoachPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/bmr"
        element={
          <ProtectedRoute>
            <BmrPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/activity"
        element={
          <ProtectedRoute>
            <FitnessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/meal-plans"
        element={
          <ProtectedRoute>
            <MealPlanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/daily-tracker"
        element={
          <ProtectedRoute>
            <DailyTrackerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/reports"
        element={
          <ProtectedRoute>
            <ReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/subscription"
        element={
          <ProtectedRoute>
            <SubscriptionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/notes"
        element={
          <ProtectedRoute>
            <NotesPage />
          </ProtectedRoute>
        }
      />
      {/* Admin Routes */}
      <Route path="/admin" element={<Navigate to="/login" replace />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
