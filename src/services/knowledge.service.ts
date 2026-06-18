import { api } from '../lib/api';

export const KnowledgeService = {
  async getDocuments() {
    const response = await api.get('/api/knowledge/documents/');
    return response.data;
  },

  async uploadDocument(formData: FormData) {
    const response = await api.post('/api/knowledge/documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async search(query: string, subjectId?: string, chapterId?: string) {
    let url = `/api/knowledge/search/query/?q=${encodeURIComponent(query)}`;
    if (subjectId) url += `&subject=${subjectId}`;
    if (chapterId) url += `&chapter=${chapterId}`;
    
    const response = await api.get(url);
    return response.data;
  },

  async getSummaries(chapterId?: string) {
    const url = chapterId ? `/api/knowledge/summaries/?chapter=${chapterId}` : '/api/knowledge/summaries/';
    const response = await api.get(url);
    return response.data;
  }
};
