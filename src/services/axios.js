import axios from 'axios';

const BASE_URL = process.env.SERVER_URL || 'http://localhost:8080';

// Create axios instance for authenticated requests
export const apiRequest = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Create axios instance for auth requests (no token required)
export const authRequest = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // For refresh token cookie
});

// Request interceptor to add auth token
apiRequest.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response interceptor to handle token refresh
apiRequest.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, add to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiRequest(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const response = await authRequest.post('/auth/refresh');
        const { accessToken } = response.data;

        // Update token in localStorage
        localStorage.setItem('auth_token', accessToken);

        // Update Authorization header for future requests
        apiRequest.defaults.headers.Authorization = `Bearer ${accessToken}`;

        // Process any queued requests
        processQueue(null, accessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiRequest(originalRequest);

      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        processQueue(refreshError, null);
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('company');
        localStorage.removeItem('warehouses');
        localStorage.removeItem('stores');
        localStorage.removeItem('permissions');
        localStorage.removeItem('selected_warehouse_id');
        localStorage.removeItem('selected_store_id');

        // In Electron, we need to reload the app to go to login
        window.location.reload();
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      console.error('Network error:', error);
      // Could show a notification here
    }

    return Promise.reject(error);
  }
);

// Helper functions for common API calls
export const api = {
  // GET request
  get: (url, config = {}) => apiRequest.get(url, config),
  
  // POST request
  post: (url, data = {}, config = {}) => apiRequest.post(url, data, config),
  
  // PUT request
  put: (url, data = {}, config = {}) => apiRequest.put(url, data, config),
  
  // PATCH request
  patch: (url, data = {}, config = {}) => apiRequest.patch(url, data, config),
  
  // DELETE request
  delete: (url, config = {}) => apiRequest.delete(url, config),
  
  // File upload
  upload: (url, formData, config = {}) => {
    return apiRequest.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers,
      },
    });
  },
};

// Auth specific API calls
export const authAPI = {
  login: (credentials) => authRequest.post('/auth/login', credentials),
  refresh: () => authRequest.post('/auth/refresh'),
  logout: () => authRequest.post('/auth/logout'),
  getMe: () => apiRequest.get('/auth/getMe'),
};

export default api;
