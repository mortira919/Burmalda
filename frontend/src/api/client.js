import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const projectsApi = {
  getAll: () => api.get('/projects'),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  patch: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  addPayment: (id, data) => api.post(`/projects/${id}/payments`, data),
  patchPayment: (id, paymentId, data) => api.patch(`/projects/${id}/payments/${paymentId}`, data),
  deletePayment: (id, paymentId) => api.delete(`/projects/${id}/payments/${paymentId}`),
};

export const clientsApi = {
  getAll: () => api.get('/clients'),
  getOne: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

export const leadsApi = {
  getAll: () => api.get('/leads'),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  convert: (id) => api.post(`/leads/${id}/convert`),
  delete: (id) => api.delete(`/leads/${id}`),
};

export const employeesApi = {
  getAll: () => api.get('/employees'),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  addSalaryPayment: (data) => api.post('/employees/salary-payments', data),
  deleteSalaryPayment: (id) => api.delete(`/employees/salary-payments/${id}`),
};

export const financeApi = {
  getTransactions: (params) => api.get('/finance/transactions', { params }),
  createTransaction: (data) => api.post('/finance/transactions', data),
  deleteTransaction: (id) => api.delete(`/finance/transactions/${id}`),
  getExpenses: (params) => api.get('/finance/expenses', { params }),
  createExpense: (data) => api.post('/finance/expenses', data),
  deleteExpense: (id) => api.delete(`/finance/expenses/${id}`),
  getSalary: (projectId) => api.get(`/finance/salary/${projectId}`),
  getTaxes: () => api.get('/finance/taxes'),
  generateTax: (data) => api.post('/finance/taxes/generate', data),
  createTax: (data) => api.post('/finance/taxes', data),
  patchTax: (id, data) => api.patch(`/finance/taxes/${id}`, data),
  deleteTax: (id) => api.delete(`/finance/taxes/${id}`),
};

export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getMonthly: (year, month) => api.get('/analytics/monthly', { params: { year, month } }),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export const recordingsApi = {
  getAll: () => api.get('/recordings'),
  upload: (formData) => api.post('/recordings/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadFile: (formData) => api.post('/recordings/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  analyze: (id, transcript) => api.post(`/recordings/analyze/${id}`, { transcript }),
  patch: (id, data) => api.patch(`/recordings/${id}`, data),
  delete: (id) => api.delete(`/recordings/${id}`),
  fileUrl: (filename) => `/api/recordings/file/${filename}`,
};

export default api;
