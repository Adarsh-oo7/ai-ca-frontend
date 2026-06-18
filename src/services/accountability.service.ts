import { api } from '../lib/api';

export const AccountabilityService = {
  async submitDailyCheckin(checkinData: {
    did_study: boolean;
    hours_completed: number;
    problems_faced?: string;
    mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
    productivity_rating: number;
    notes?: string;
    date: string;
  }) {
    const response = await api.post('/api/accountability/checkin/', checkinData);
    return response.data;
  },

  async getCheckinHistory() {
    const response = await api.get('/api/accountability/checkin/');
    return response.data;
  },

  async getActiveRecoveryPlan() {
    const response = await api.get('/api/accountability/recovery/active/');
    return response.data;
  }
};
