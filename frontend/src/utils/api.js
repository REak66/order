import axios from 'axios';

// In production (Vercel), VITE_API_URL points to the deployed backend.
// In development, it's empty so Vite's proxy handles /api/* → localhost:5002.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
