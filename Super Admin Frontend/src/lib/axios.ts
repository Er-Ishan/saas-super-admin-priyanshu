import axios from 'axios';

export const BACKEND_URL = 'https://testback.bookstanstedparking.co.uk';
export const IMAGE_BASE_URL = BACKEND_URL;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `${BACKEND_URL}/api/superadmin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('super_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
