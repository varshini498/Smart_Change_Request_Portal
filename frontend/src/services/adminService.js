import api from './api';

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getAnalytics: () => api.get('/admin/analytics'),
  getActivity: () => api.get('/admin/activity'),
  getUsers: () => api.get('/admin/users'),
  createUser: (payload) => api.post('/admin/users', payload),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  updateUserStatus: (id, is_active) => api.put(`/admin/users/${id}/status`, { is_active }),
  resetUserPassword: (id, newPassword) => api.put(`/admin/users/${id}/reset-password`, { newPassword }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  getRequests: (params) => api.get('/admin/requests', { params }),
  overrideRequest: (id, payload) => api.put(`/admin/requests/${id}/override`, payload),
  escalateRequest: (id) => api.put(`/admin/requests/${id}/escalate`),
  bulkAction: (payload) => api.put('/admin/requests/bulk', payload),
  deleteRequest: (id) => api.delete(`/admin/requests/${id}`),

  getAuditLogs: (params) => api.get('/admin/audit', { params }),

  getSettings: () => api.get('/admin/settings'),
  upsertSetting: (payload) => api.put('/admin/settings', payload),
  deleteSetting: (key) => api.delete(`/admin/settings/${encodeURIComponent(key)}`),

  getCategories: () => api.get('/admin/categories'),
  createCategory: (payload) => api.post('/admin/categories', payload),
  updateCategory: (id, payload) => api.put(`/admin/categories/${id}`, payload),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
};
