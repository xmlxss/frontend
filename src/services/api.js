import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for better error handling
api.interceptors.request.use(
  config => {
    // Add any auth tokens here if needed
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const projectAPI = {
  getAll: () => api.get('/projects/'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects/', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  syncProgress: (id) => api.post(`/projects/${id}/sync-progress`),
  syncAllProgress: () => api.post('/projects/sync-all-progress'),
};

export const jiraAPI = {
  // Enhanced search with more parameters
  searchIdeas: (query, options = {}) => {
    const params = {
      query,
      maxResults: options.maxResults || 50,
      startAt: options.startAt || 0,
      project: 'DPO',
      orderBy: options.orderBy || 'created',
      // Include all statuses by default
      status: options.status || 'all',
      // Search in summary, description, and comments
      fields: 'summary,description,comment',
      expand: 'renderedFields'
    };
    
    return api.get('/jira/ideas', { params });
  },
  
  searchEpics: (query, options = {}) => {
    const params = {
      query,
      maxResults: options.maxResults || 50,
      startAt: options.startAt || 0,
      project: 'DFS',
      orderBy: options.orderBy || 'created',
      status: options.status || 'all',
      fields: 'summary,description,progress,duedate',
      expand: 'renderedFields'
    };
    
    return api.get('/jira/epics', { params });
  },
  
  // Get all ideas without search filter
  getAllIdeas: (options = {}) => {
    return api.get('/jira/ideas/all', { 
      params: {
        maxResults: options.maxResults || 100,
        startAt: options.startAt || 0,
        project: 'DPO'
      }
    });
  },
  
  // Get all epics without search filter
  getAllEpics: (options = {}) => {
    return api.get('/jira/epics/all', { 
      params: {
        maxResults: options.maxResults || 100,
        startAt: options.startAt || 0,
        project: 'DFS'
      }
    });
  },
  
  // Get idea/epic by key
  getIdeaByKey: (key) => api.get(`/jira/ideas/${key}`),
  getEpicByKey: (key) => api.get(`/jira/epics/${key}`),
  
  // Sync endpoints
  syncIdeas: () => api.post('/jira/sync/ideas'),
  syncEpics: () => api.post('/jira/sync/epics'),
  syncAll: () => api.post('/jira/sync/all'),
  getSyncStatus: () => api.get('/jira/sync/status'),
};

export const confluenceAPI = {
  // Enhanced search with more parameters
  searchPages: (query, options = {}) => {
    const params = {
      query,
      maxResults: options.maxResults || 50,
      start: options.start || 0,
      space: 'FD',
      type: options.type || 'page'
    };
    
    // If we have a specific CQL query, pass it
    if (query && options.useCQL) {
      params.cql = `space=FD AND type=page AND (title ~ "${query}*" OR text ~ "${query}*")`;
    }
    
    return api.get('/confluence/pages', { params });
  },
  
  // Get all pages without search filter
  getAllPages: (options = {}) => {
    return api.get('/confluence/pages/all', { 
      params: {
        maxResults: options.maxResults || 100,
        start: options.start || 0,
        space: 'FD'
      }
    });
  },
  
  // Get recently updated pages
  getRecentPages: (options = {}) => {
    return api.get('/confluence/pages/recent', { 
      params: {
        maxResults: options.maxResults || 20,
        space: 'FD'
      }
    });
  },
  
  // Get page by ID
  getPageById: (id) => api.get(`/confluence/pages/${id}`),
  
  // Sync endpoints
  syncPages: (spaceKey = 'FD') => api.post('/confluence/sync/pages', { spaceKey }),
  getSyncStatus: () => api.get('/confluence/sync/status'),
};

export const teamsAPI = {
  // Use cached endpoint for better performance
  getMembers: () => api.get('/teams/members/cached'),
  
  // Search team members (also uses cached data)
  searchMembers: (query) => {
    return api.get('/teams/members/search', { 
      params: { 
        query,
        fields: 'name,email,teams'
      } 
    });
  },
  
  // Get member by ID
  getMemberById: (id) => api.get(`/teams/members/${id}`),
  
  // Get members by team
  getMembersByTeam: (team) => {
    return api.get('/teams/members/cached', { 
      params: { team } 
    });
  },
  
  // Get all teams
  getTeams: () => api.get('/teams/teams'),
};

// Debounce function for search inputs
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default api;