import { api } from '../lib/api';

export const AnalyticsService = {
  async getDashboardStats() {
    const response = await api.get('/api/analytics/dashboard-stats/dashboard/');
    return response.data;
  },

  async getStudyHoursHistory(startDate?: string, endDate?: string) {
    let url = '/api/analytics/dashboard-stats/study_hours/';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const response = await api.get(url);
    return response.data;
  }
};
