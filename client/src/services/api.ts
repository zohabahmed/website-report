import { WebsiteReport, MaintenanceTask, AuthUser, WordPressUser } from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wmr_auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errData = await res.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async register(name: string, email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: AuthUser }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Reports
  async getDefaultTasks(): Promise<{ tasks: MaintenanceTask[] }> {
    const res = await fetch(`${API_BASE}/reports/defaults`);
    return handleResponse(res);
  },

  async previewSummary(websiteUrl: string, reportDate: string, tasks: MaintenanceTask[]) {
    const res = await fetch(`${API_BASE}/reports/preview-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websiteUrl, reportDate, tasks }),
    });
    return handleResponse<{
      totalTasks: number;
      completedTasks: number;
      incompleteTasks: number;
      completionPercentage: number;
      executiveSummary: string;
      finalSummary: string;
    }>(res);
  },

  async getReports(search?: string, sortBy?: string, sortOrder?: string): Promise<{ reports: WebsiteReport[] }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);

    const res = await fetch(`${API_BASE}/reports?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getReportById(id: string): Promise<{ report: WebsiteReport }> {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createReport(data: {
    websiteUrl: string;
    websiteName?: string;
    clientName?: string;
    reportDate?: string;
    preparedBy?: string;
    tasks: MaintenanceTask[];
    wordpressUsers: WordPressUser[];
    executiveSummary?: string;
    finalSummary?: string;
  }): Promise<{ report: WebsiteReport }> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateReport(id: string, data: Partial<WebsiteReport>): Promise<{ report: WebsiteReport }> {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async duplicateReport(id: string): Promise<{ report: WebsiteReport }> {
    const res = await fetch(`${API_BASE}/reports/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async deleteReport(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/reports/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async downloadPdf(id: string, filename: string): Promise<void> {
    const token = localStorage.getItem('wmr_auth_token');
    const res = await fetch(`${API_BASE}/reports/${id}/pdf`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to generate or download server PDF.');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `report-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadMasterExcel(month?: string): Promise<void> {
    const token = localStorage.getItem('wmr_auth_token');
    const urlParam = month ? `?month=${encodeURIComponent(month)}` : '';
    const res = await fetch(`${API_BASE}/reports/export/excel${urlParam}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to export Excel report.');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = month ? `monthly-website-maintenance-${month}.xlsx` : 'all-websites-maintenance-master.xlsx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadReportExcel(id: string, filename?: string): Promise<void> {
    const token = localStorage.getItem('wmr_auth_token');
    const res = await fetch(`${API_BASE}/reports/${id}/excel`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to export report to Excel.');
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `report-${id}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
