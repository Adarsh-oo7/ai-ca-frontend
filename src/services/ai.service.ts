import { api } from '../lib/api';

export const AIService = {
  async sendMessage(message: string, subjectId?: string, chapterId?: string, sessionId?: string) {
    const response = await api.post('/api/ai/chat/send_message/', {
      message,
      subject: subjectId,
      chapter: chapterId,
      session_id: sessionId
    });
    return response.data;
  },

  async getChatHistory(sessionId?: string) {
    const response = await api.get('/api/ai/chat/history/', {
      params: { session_id: sessionId }
    });
    return response.data;
  },

  async teachConcept(topicId: number | string, sessionId: string, message?: string) {
    const response = await api.post('/api/ai/teach/teach_concept/', {
      topic: topicId,
      session_id: sessionId,
      message
    });
    return response.data;
  },

  async getPredictions() {
    const response = await api.get('/api/ai/predictions/');
    return response.data;
  },

  async getSettings() {
    const response = await api.get('/api/ai/settings/');
    return response.data;
  },

  async updateSettings(data: any) {
    const response = await api.put('/api/ai/settings/1/', data);
    return response.data;
  }
};
