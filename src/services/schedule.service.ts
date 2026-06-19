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

  async autoScheduleWeek(startDate: string, endDate: string) {
    const response = await api.post('/api/schedule/daily/auto_schedule/', {
      start_date: startDate,
      end_date: endDate
    });
    return response.data;
  },

  async rescheduleMissed() {
    const response = await api.post('/api/schedule/daily/reschedule_missed/');
    return response.data;
  },

  async createTask(taskData: Record<string, unknown>) {
    const response = await api.post('/api/schedule/tasks/', taskData);
    return response.data;
  },

  async updateTask(taskId: string, taskData: Record<string, unknown>) {
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
  },

  // Google Calendar Integration
  async getCalendarStatus() {
    const response = await api.get('/api/schedule/calendar/status/');
    return response.data;
  },

  async connectCalendar() {
    const response = await api.get('/api/schedule/calendar/connect/');
    return response.data;
  },

  async calendarCallback(code: string) {
    const response = await api.post('/api/schedule/calendar/callback/', { code });
    return response.data;
  },

  async disconnectCalendar() {
    const response = await api.post('/api/schedule/calendar/disconnect/');
    return response.data;
  },

  async syncToCalendar(dateStr?: string) {
    const response = await api.post('/api/schedule/calendar/sync/', { date: dateStr });
    return response.data;
  }
};
