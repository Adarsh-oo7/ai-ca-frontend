import { api } from '../lib/api';

export const NotificationService = {
  async getNotifications() {
    const response = await api.get('/api/notifications/feed/');
    return response.data;
  },

  async markAllRead() {
    const response = await api.post('/api/notifications/feed/mark_all_read/');
    return response.data;
  },

  async markRead(notificationId: string) {
    const response = await api.post(`/api/notifications/feed/${notificationId}/mark_read/`);
    return response.data;
  },

  async getUnreadCount() {
    const response = await api.get('/api/notifications/feed/unread_count/');
    return response.data;
  }
};
