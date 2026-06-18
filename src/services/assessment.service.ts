import { api } from '../lib/api';

export const AssessmentService = {
  async getMockTests(subjectId?: string) {
    const url = subjectId ? `/api/assessment/tests/?subject=${subjectId}` : '/api/assessment/tests/';
    const response = await api.get(url);
    return response.data;
  },

  async getMockTestDetails(testId: string) {
    const response = await api.get(`/api/assessment/tests/${testId}/`);
    return response.data;
  },

  async generatePracticeTest(topicId: number | string, difficulty = 'medium', count = 5) {
    const response = await api.post('/api/assessment/tests/generate_practice/', {
      topic: topicId,
      difficulty,
      count
    });
    return response.data;
  },

  async startTest(testId: string) {
    const response = await api.post(`/api/assessment/tests/${testId}/start_test/`);
    return response.data; // Returns MockResult with result_id and started_at
  },

  async submitTest(testId: string, resultId: string, answers: Record<string, string>) {
    const response = await api.post(`/api/assessment/tests/${testId}/submit_test/`, {
      result_id: resultId,
      answers
    });
    return response.data;
  },

  async getMockResults() {
    const response = await api.get('/api/assessment/results/');
    return response.data;
  },

  async getMockResultReview(resultId: string) {
    const response = await api.get(`/api/assessment/results/${resultId}/review/`);
    return response.data;
  }
};
