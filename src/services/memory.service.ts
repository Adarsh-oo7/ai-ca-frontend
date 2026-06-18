import { api } from '../lib/api';

export const MemoryService = {
  async getPreferences() {
    const response = await api.get('/api/memory/preferences/');
    // Since it's user-based, if it returns list, get first item
    return Array.isArray(response.data) ? response.data[0] : response.data;
  },

  async updatePreferences(id: string, data: any) {
    const response = await api.patch(`/api/memory/preferences/${id}/`, data);
    return response.data;
  },

  async getBehaviorProfile() {
    const response = await api.get('/api/memory/behavior/');
    return Array.isArray(response.data) ? response.data[0] : response.data;
  },

  async getSubjectMemories() {
    const response = await api.get('/api/memory/subjects/');
    return response.data;
  },

  async getChapterMemories() {
    const response = await api.get('/api/memory/chapters/');
    return response.data;
  },

  async getConceptMemories(chapterId?: string) {
    const url = chapterId ? `/api/memory/concepts/?topic__chapter=${chapterId}` : '/api/memory/concepts/';
    const response = await api.get(url);
    return response.data;
  },

  async getMistakes(isResolved = false) {
    const response = await api.get(`/api/memory/mistakes/?is_resolved=${isResolved}`);
    return response.data;
  },

  async resolveMistake(mistakeId: string) {
    const response = await api.post(`/api/memory/mistakes/${mistakeId}/resolve/`);
    return response.data;
  },

  async getSummaries() {
    const response = await api.get('/api/memory/summaries/');
    return response.data;
  },

  async generateSummary(period = 'weekly') {
    const response = await api.post('/api/memory/summaries/generate/', { period });
    return response.data;
  }
};
