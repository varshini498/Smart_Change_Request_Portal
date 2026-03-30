import axios from 'axios';

// Use environment variable for backend URL
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api', // Vite example
});

// Automatically attach token to requests
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;