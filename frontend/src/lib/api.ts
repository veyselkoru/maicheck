// src/lib/api.ts v3.1 — complete
import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('maicheck_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('maicheck_token');
    localStorage.removeItem('maicheck_user');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});
export default api;

export const authApi = {
  login: (e: string, p: string) => api.post('/auth/login', { email: e, password: p }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
};
export const subApi = {
  list: () => api.get('/subcontractors').then(r => r.data),
  get: (id: string) => api.get(`/subcontractors/${id}`).then(r => r.data),
  create: (d: object) => api.post('/subcontractors', d).then(r => r.data),
  update: (id: string, d: object) => api.patch(`/subcontractors/${id}`, d).then(r => r.data),
  delete: (id: string) => api.delete(`/subcontractors/${id}`).then(r => r.data),
  uploadLogo: (id: string, f: File) => { const fd=new FormData(); fd.append('logo',f); return api.post(`/subcontractors/${id}/logo`,fd).then(r=>r.data); },
};
export const templatesApi = {
  list: () => api.get('/templates').then(r=>r.data),
  get: (id: string) => api.get(`/templates/${id}`).then(r=>r.data),
  create: (d: object) => api.post('/templates',d).then(r=>r.data),
  update: (id: string, d: object) => api.patch(`/templates/${id}`,d).then(r=>r.data),
  clone: (id: string, name?: string) => api.post(`/templates/${id}/clone`,{name}).then(r=>r.data),
  delete: (id: string) => api.delete(`/templates/${id}`).then(r=>r.data),
  getItems: (id: string) => api.get(`/templates/${id}/items`).then(r=>r.data),
  addItem: (id: string, d: object) => api.post(`/templates/${id}/items`,d).then(r=>r.data),
  updateItem: (tid: string, iid: string, d: object) => api.patch(`/templates/${tid}/items/${iid}`,d).then(r=>r.data),
  deleteItem: (tid: string, iid: string) => api.delete(`/templates/${tid}/items/${iid}`).then(r=>r.data),
};
export const docTypesApi = {
  list: () => api.get('/document-types').then(r=>r.data),
  create: (d: object) => api.post('/document-types',d).then(r=>r.data),
  update: (id: string, d: object) => api.patch(`/document-types/${id}`,d).then(r=>r.data),
};
export const auditsApi = {
  list: (p?: object) => api.get('/audits',{params:p}).then(r=>r.data),
  get: (id: string) => api.get(`/audits/${id}`).then(r=>r.data),
  summary: (id: string) => api.get(`/audits/${id}/summary`).then(r=>r.data),
  create: (d: object) => api.post('/audits',d).then(r=>r.data),
  update: (id: string, d: object) => api.patch(`/audits/${id}`,d).then(r=>r.data),
  lock: (id: string) => api.post(`/audits/${id}/lock`).then(r=>r.data),
  unlock: (id: string) => api.post(`/audits/${id}/unlock`).then(r=>r.data),
};
export const auditItemsApi = {
  list: (aid: string, p?: object) => api.get(`/audit-items/audit/${aid}`,{params:p}).then(r=>r.data),
  update: (id: string, d: object) => api.patch(`/audit-items/${id}`,d).then(r=>r.data),
};
export const evidenceApi = {
  list: (p?: object) => api.get('/evidence',{params:p}).then(r=>r.data),
  archive: (p?: object) => api.get('/evidence/archive',{params:p}).then(r=>r.data),
  upload: (fd: FormData, onProgress?: (pct: number) => void) =>
    api.post('/evidence/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => { if (onProgress && e.total) onProgress(Math.round((e.loaded/e.total)*100)); },
    }).then(r=>r.data),
  delete: (id: string) => api.delete(`/evidence/${id}`).then(r=>r.data),
  downloadUrl: (id: string) => `/api/evidence/${id}/download?token=${localStorage.getItem('maicheck_token')}`,
};
export const findingsApi = {
  list: (p?: object) => api.get('/findings',{params:p}).then(r=>r.data),
  get: (id: string) => api.get(`/findings/${id}`).then(r=>r.data),
  create: (d: object) => api.post('/findings',d).then(r=>r.data),
  update: (id: string, d: object) => api.patch(`/findings/${id}`,d).then(r=>r.data),
  delete: (id: string) => api.delete(`/findings/${id}`).then(r=>r.data),
};
export const actionsApi = {
  list: (p?: object) => api.get('/actions',{params:p}).then(r=>r.data),
  update: (id: string, d: object) => api.patch(`/actions/${id}`,d).then(r=>r.data),
  create: (d: object) => api.post('/actions',d).then(r=>r.data),
};
export const reportsApi = {
  list: () => api.get('/reports').then(r=>r.data),
  listByAudit: (aid: string) => api.get(`/reports/audit/${aid}`).then(r=>r.data),
  generate: (d: {auditId:string;reportType:string;notes?:string[]}) => api.post('/reports/generate',d).then(r=>r.data),
  addNote: (id: string, d: object) => api.post(`/reports/${id}/notes`,d).then(r=>r.data),
  htmlUrl: (id: string) => `/api/reports/${id}/html?token=${localStorage.getItem('maicheck_token')}`,
  docxUrl: (id: string) => `/api/reports/${id}/docx?token=${localStorage.getItem('maicheck_token')}`,
};
export const dashboardApi = { get: () => api.get('/dashboard').then(r=>r.data) };
export const impactApi = {
  list: (p?: object) => api.get('/impact',{params:p}).then(r=>r.data),
  create: (d: object) => api.post('/impact',d).then(r=>r.data),
  update: (id: string, d: object) => api.patch(`/impact/${id}`,d).then(r=>r.data),
  delete: (id: string) => api.delete(`/impact/${id}`).then(r=>r.data),
  calculate: (d: object) => api.post('/impact/calculate',d).then(r=>r.data),
};
export const commApi = {
  contacts: (p?: object) => api.get('/communication/contacts',{params:p}).then(r=>r.data),
  createContact: (d: object) => api.post('/communication/contacts',d).then(r=>r.data),
  updateContact: (id: string, d: object) => api.patch(`/communication/contacts/${id}`,d).then(r=>r.data),
  deleteContact: (id: string) => api.delete(`/communication/contacts/${id}`).then(r=>r.data),
  generateDraft: (d: object) => api.post('/communication/generate-draft',d).then(r=>r.data),
  drafts: (p?: object) => api.get('/communication/drafts',{params:p}).then(r=>r.data),
  updateDraft: (id: string, d: object) => api.patch(`/communication/drafts/${id}`,d).then(r=>r.data),
  deleteDraft: (id: string) => api.delete(`/communication/drafts/${id}`).then(r=>r.data),
};
export const companiesApi = {
  me: () => api.get('/companies/me').then(r=>r.data),
  updateMe: (d: object) => api.patch('/companies/me',d).then(r=>r.data),
  uploadLogo: (f: File) => { const fd=new FormData(); fd.append('logo',f); return api.post('/companies/me/logo',fd).then(r=>r.data); },
};
