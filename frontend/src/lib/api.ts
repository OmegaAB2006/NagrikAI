const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; full_name?: string }) =>
    apiRequest('/auth/register', { method: 'POST', body: data }),
  
  login: (data: { email: string; password: string }) =>
    apiRequest('/auth/login', { method: 'POST', body: data }),
  
  guestLogin: () =>
    apiRequest('/auth/guest', { method: 'POST' }),
  
  getMe: (token: string) =>
    apiRequest('/auth/me', { token }),
  
  getProfile: (token: string) =>
    apiRequest('/auth/profile', { token }),
  
  updateProfile: (data: Record<string, unknown>, token: string) =>
    apiRequest('/auth/profile', { method: 'PUT', body: data, token }),
  
  // Chat
  chat: (data: { message: string; language?: string; context?: Record<string, unknown>; history?: {role:string;content:string}[] }, token?: string | null) =>
    apiRequest('/chat', { method: 'POST', body: data, token }),
  
  // Applications
  getApplications: (token: string) =>
    apiRequest('/applications', { token }),
  
  createApplication: (data: { scheme_name: string; scheme_id?: string; notes?: string }, token: string) =>
    apiRequest('/applications', { method: 'POST', body: data, token }),
  
  updateApplicationStatus: (id: string, status: string, token: string) =>
    apiRequest(`/applications/${id}/status?status=${status}`, { method: 'PUT', token }),
  
  // Admin
  getOverview: (token: string) =>
    apiRequest('/admin/overview', { token }),
  
  getAgents: (token: string) =>
    apiRequest('/admin/agents', { token }),
  
  getGuardrails: (token: string) =>
    apiRequest('/admin/guardrails', { token }),
  
  getTraces: (token: string) =>
    apiRequest('/admin/traces', { token }),
  
  getCostAnalytics: (token: string) =>
    apiRequest('/admin/cost-analytics', { token }),
  
  getApprovals: (token: string) =>
    apiRequest('/admin/approvals', { token }),
  
  approveRequest: (id: string, token: string) =>
    apiRequest(`/admin/approvals/${id}/approve`, { method: 'POST', token }),
  
  rejectRequest: (id: string, token: string) =>
    apiRequest(`/admin/approvals/${id}/reject`, { method: 'POST', token }),
  
  getAuditLogs: (token: string) =>
    apiRequest('/admin/audit-logs', { token }),
  
  // Evaluation
  runEvaluation: (token: string) =>
    apiRequest('/evaluation/run', { method: 'POST', token }),
  
  getEvaluationMetrics: (token: string) =>
    apiRequest('/evaluation/metrics', { token }),
  
  getSafetyMetrics: (token: string) =>
    apiRequest('/evaluation/safety-metrics', { token }),
};
