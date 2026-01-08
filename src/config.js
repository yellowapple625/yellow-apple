// API Configuration for deployment
// In production, the backend URL comes from environment variables
// In development, it defaults to localhost

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5174';
