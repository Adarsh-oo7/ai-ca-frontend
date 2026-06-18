import { api } from '../lib/api';

export const CurriculumService = {
  async getSubjects() {
    const response = await api.get('/api/curriculum/subjects/');
    return response.data; // paginated by default or list
  },

  async getSubjectDetails(subjectId: string) {
    const response = await api.get(`/api/curriculum/subjects/${subjectId}/`);
    return response.data;
  },

  async getChapters(subjectId: string) {
    const response = await api.get(`/api/curriculum/chapters/?subject=${subjectId}`);
    return response.data;
  },

  async getChapterDetails(chapterId: string) {
    const response = await api.get(`/api/curriculum/chapters/${chapterId}/`);
    return response.data;
  },

  async getTopics(chapterId: string) {
    const response = await api.get(`/api/curriculum/topics/?chapter=${chapterId}`);
    return response.data;
  }
};
