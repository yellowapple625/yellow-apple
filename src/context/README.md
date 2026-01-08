# 🎯 Context Directory

React Context providers for global state management.

## Files

| File | Purpose |
|------|---------|
| `UserProfileContext.jsx` | Global user profile & settings state |

## UserProfileContext

Provides global access to user profile data across all components.

### Data Stored
```javascript
{
  profile: {
    name: string,
    email: string,
    age: number,
    gender: string,
    height: number,
    weight: number,
    activityLevel: string,
    // Calculated values
    bmi: number,
    bmr: number,
    tdee: number,
    // Targets
    calorieTarget: number,
    proteinTarget: number,
    carbsTarget: number,
    fatTarget: number,
    waterTarget: number,
    stepGoal: number
  },
  membership: string,  // 'free' | 'premium'
  loading: boolean,
  error: string | null
}
```

### Usage in Components
```jsx
import { useUserProfile } from '../context/UserProfileContext';

function MyComponent() {
  const { profile, membership, updateProfile } = useUserProfile();
  
  return (
    <div>
      <p>Hello, {profile.name}!</p>
      <p>Plan: {membership}</p>
    </div>
  );
}
```

### Wrapped Components
All pages inside `<ProtectedRoute>` have access to this context:
- Home.jsx
- BmrPage.jsx
- FitnessPage.jsx
- AiCoachPage.jsx
- ReportPage.jsx
- Sidebar.jsx
