import { createContext, useContext, useState, useEffect } from 'react';

const UserProfileContext = createContext();

const DEFAULT_PROFILE = {
  name: '',
  age: '',
  height: '',
  weight: '',
  gender: 'male',
};

export function UserProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('ya_user_profile');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    localStorage.setItem('ya_user_profile', JSON.stringify(profile));
    // Check if profile has all required fields
    const complete = profile.name && profile.age && profile.height && profile.weight;
    setIsProfileComplete(!!complete);
  }, [profile]);

  const updateProfile = (updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const clearProfile = () => {
    setProfile(DEFAULT_PROFILE);
    localStorage.removeItem('ya_user_profile');
  };

  return (
    <UserProfileContext.Provider value={{ 
      profile, 
      updateProfile, 
      clearProfile,
      isProfileComplete 
    }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
