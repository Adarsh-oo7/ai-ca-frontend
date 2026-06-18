import { api } from '../lib/api';

export const ScheduleService = {
  async getTasks(dateStr?: string) {
    const url = dateStr ? `/api/schedule/tasks/?scheduled_date=${dateStr}` : '/api/schedule/tasks/';
    const response = await api.get(url);
    return response.data;
  },

  async getTodaySchedule() {
    const response = await api.get('/api/schedule/daily/today/');
    return response.data;
  },

  async getDailySchedule(dateStr: string) {
    const response = await api.get(`/api/schedule/daily/?date=${dateStr}`);
    return response.data;
  },

  async generateDailyPlan(dateStr?: string) {
    const response = await api.post('/api/schedule/daily/generate/', { date: dateStr });
    return response.data;
  },

  async createTask(taskData: any) {
    const response = await api.post('/api/schedule/tasks/', taskData);
    return response.data;
  },

  async updateTask(taskId: string, taskData: any) {
    const response = await api.patch(`/api/schedule/tasks/${taskId}/`, taskData);
    return response.data;
  },

  async deleteTask(taskId: string) {
    const response = await api.delete(`/api/schedule/tasks/${taskId}/`);
    return response.data;
  },

  async completeTask(taskId: string, actualDurationMinutes?: number) {
    const response = await api.post(`/api/schedule/tasks/${taskId}/complete/`, {
      actual_duration: actualDurationMinutes
    });
    return response.data;
  },

  async checkIn() {
    const response = await api.post('/api/schedule/attendance/check_in/');
    return response.data;
  },

  async checkOut() {
    const response = await api.post('/api/schedule/attendance/check_out/');
    return response.data;
  },

  async getAttendanceRecords() {
    const response = await api.get('/api/schedule/attendance/');
    return response.data;
  }
};
