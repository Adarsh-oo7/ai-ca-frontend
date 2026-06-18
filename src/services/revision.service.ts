import { api } from '../lib/api';

export const RevisionService = {
  async getDueTasks() {
    const response = await api.get('/api/revision/tasks/due/');
    return response.data;
  },

  async submitRecallScore(taskId: string, qualityScore: number, timeSpentMinutes = 5) {
    const response = await api.post(`/api/revision/tasks/${taskId}/submit_score/`, {
      quality_score: qualityScore,
      time_spent_minutes: timeSpentMinutes
    });
    return response.data;
  },

  async getAllRevisionTasks() {
    const response = await api.get('/api/revision/tasks/');
    return response.data;
  }
};
