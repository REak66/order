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

// Automatically handle token expiration or unauthorized responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const hasToken = localStorage.getItem('token');
            if (hasToken) {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                // Redirect user to login only if not already on login routes
                if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/admin-login')) {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
