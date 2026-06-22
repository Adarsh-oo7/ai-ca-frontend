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

  async getChatSessions(type?: string) {
    const response = await api.get('/api/ai/chat/sessions/', {
      params: type ? { type } : {}
    });
    return response.data;
  },

  async deleteSession(sessionId: string) {
    const response = await api.delete(`/api/ai/chat/sessions/${sessionId}/`);
    return response.data;
  },

  async speak(text: string, voiceName: string) {
    const response = await api.post('/api/ai/chat/speak/', {
      text,
      voice_name: voiceName
    }, {
      responseType: 'blob'
    });
    return response.data;
  },

  async getApiKey() {
    const response = await api.get('/api/ai/chat/get_api_key/');
    return response.data.api_key;
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

  async updateSettings(data: Record<string, unknown>) {
    const response = await api.put('/api/ai/settings/1/', data);
    return response.data;
  }
};
