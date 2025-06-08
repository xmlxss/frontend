import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const projectAPI = {
  getAll: () => api.get('/projects/'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects/', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

export const jiraAPI = {
  searchIdeas: (query) => api.get('/jira/ideas', { params: { query } }),
  searchEpics: (query) => api.get('/jira/epics', { params: { query } }),
};

export const confluenceAPI = {
  searchPages: (query) => api.get('/confluence/pages', { params: { query } }),
};

export const teamsAPI = {
  getMembers: () => api.get('/teams/members'),
};

export default api;