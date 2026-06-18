import { api } from '../lib/api';

export const AuthService = {
  async login(email: string, password: string, device: string = 'web') {
    const response = await api.post('/api/auth/login/', { email, password, device });
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
    }
    return response.data;
  },

  async logout() {
    try {
      await api.post('/api/auth/logout/');
    } finally {
      localStorage.removeItem('access_token');
    }
  },

  async getProfile() {
    const response = await api.get('/api/auth/profile/');
    return response.data;
  },

  async updateProfile(data: any) {
    const response = await api.patch('/api/auth/profile/', data);
    return response.data;
  },

  async completeOnboarding(data: any) {
    const response = await api.post('/api/auth/onboarding/', data);
    return response.data;
  },

  async getPreferences() {
    const response = await api.get('/api/auth/preferences/');
    return response.data;
  },

  async updatePreferences(data: any) {
    const response = await api.patch('/api/auth/preferences/', data);
    return response.data;
  },

  async getActivityLogs() {
    const response = await api.get('/api/auth/activity/');
    return response.data;
  }
};
