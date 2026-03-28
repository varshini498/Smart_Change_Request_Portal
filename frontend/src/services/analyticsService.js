import API from '../api/axios';

export const analyticsService = {
  getEmployeeAnalytics: (params = {}) => API.get('/analytics/employee', { params }),
  getOverviewAnalytics: (params = {}) => API.get('/analytics/overview', { params }),
};

export default analyticsService;
