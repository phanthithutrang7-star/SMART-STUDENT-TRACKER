import {
  User,
  Subject,
  ClassGroup,
  Student,
  Assignment,
  AssignmentSubmission,
  Assessment,
  AssessmentResult,
  Alert,
  SystemSettings,
  AuditLog,
  DashboardMetrics,
  StudentAnalytics,
} from '../types/index.ts';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `Lỗi hệ thống (${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error) errorMsg = errorData.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  getUsers: () => request<{ users: User[]; currentUser: User }>('/auth/users'),
  switchUser: (userId: string) =>
    request<{ success: boolean; currentUser: User }>('/auth/switch', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  // Classes
  getClasses: () => request<ClassGroup[]>('/classes'),
  createClass: (cls: Partial<ClassGroup>) =>
    request<ClassGroup>('/classes', { method: 'POST', body: JSON.stringify(cls) }),
  updateClass: (id: string, cls: Partial<ClassGroup>) =>
    request<ClassGroup>(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(cls) }),

  // Students
  getStudents: (params?: { classId?: string; search?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Student[]>(`/students${query ? `?${query}` : ''}`);
  },
  getStudentDetail: (id: string) =>
    request<{
      student: Student;
      analytics: StudentAnalytics;
      submissions: AssignmentSubmission[];
      results: AssessmentResult[];
      alerts: Alert[];
    }>(`/students/${id}`),
  createStudent: (student: Partial<Student>) =>
    request<Student>('/students', { method: 'POST', body: JSON.stringify(student) }),
  updateStudent: (id: string, student: Partial<Student>) =>
    request<Student>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(student) }),
  transferStudent: (id: string, toClassId: string, reason: string) =>
    request<Student>(`/students/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ toClassId, reason }),
    }),

  // Subjects
  getSubjects: () => request<Subject[]>('/subjects'),

  // Assignments
  getAssignments: (params?: { classId?: string; subjectId?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Assignment[]>(`/assignments${query ? `?${query}` : ''}`);
  },
  createAssignment: (asg: Partial<Assignment>) =>
    request<Assignment>('/assignments', { method: 'POST', body: JSON.stringify(asg) }),
  updateAssignment: (id: string, asg: Partial<Assignment>) =>
    request<Assignment>(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(asg) }),

  // Submissions
  getSubmissions: (params?: { assignmentId?: string; studentId?: string; classId?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<AssignmentSubmission[]>(`/submissions${query ? `?${query}` : ''}`);
  },
  updateSubmission: (id: string, updates: any) =>
    request<AssignmentSubmission>(`/submissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  batchUpdateSubmissions: (submissionIds: string[], status: string, feedback?: string) =>
    request<{ updatedCount: number; submissions: AssignmentSubmission[] }>('/submissions/batch-update', {
      method: 'POST',
      body: JSON.stringify({ submissionIds, status, feedback }),
    }),

  // Assessments
  getAssessments: (params?: { classId?: string; subjectId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Assessment[]>(`/assessments${query ? `?${query}` : ''}`);
  },
  createAssessment: (asm: Partial<Assessment>) =>
    request<Assessment>('/assessments', { method: 'POST', body: JSON.stringify(asm) }),
  getAssessmentResults: (params?: { assessmentId?: string; studentId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<AssessmentResult[]>(`/assessments/results${query ? `?${query}` : ''}`);
  },
  updateAssessmentResult: (id: string, score: number | null, reason: string) =>
    request<AssessmentResult>(`/assessments/results/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ score, reason }),
    }),
  previewImportScores: (assessmentId: string, rawRows: any[]) =>
    request<{
      totalRows: number;
      validCount: number;
      errorCount: number;
      rows: any[];
      assessmentTitle: string;
    }>('/assessments/preview-import-scores', {
      method: 'POST',
      body: JSON.stringify({ assessmentId, rawRows }),
    }),
  executeImportScores: (assessmentId: string, rows: any[]) =>
    request<{ success: boolean; successCount: number; errorCount: number; errors: string[] }>(
      '/assessments/import-scores',
      {
        method: 'POST',
        body: JSON.stringify({ assessmentId, rows }),
      }
    ),

  // Analytics & Dashboard
  getDashboardMetrics: (classId?: string) => {
    const query = classId ? `?classId=${classId}` : '';
    return request<DashboardMetrics>(`/analytics/dashboard${query}`);
  },
  getStudentAnalytics: (id: string, subjectId?: string) =>
    request<StudentAnalytics>(`/analytics/student/${id}${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getClassSummaries: () => request<{ class: ClassGroup; metrics: DashboardMetrics }[]>('/analytics/classes'),

  // Alerts
  getAlerts: (params?: { classId?: string; priority?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Alert[]>(`/alerts${query ? `?${query}` : ''}`);
  },
  updateAlert: (id: string, updates: { status?: Alert['status']; note?: string; actionPlan?: string }) =>
    request<Alert>(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  evaluateAlerts: () => request<{ success: boolean; alerts: Alert[] }>('/alerts/evaluate', { method: 'POST' }),

  // AI Assistant
  postAiTask: (data: {
    action: string;
    classId?: string;
    studentId?: string;
    query?: string;
    academicPeriod?: string;
  }) =>
    request<{
      success: boolean;
      isAiGenerated: boolean;
      model: string;
      result: string;
      dataContextSummary: any;
    }>('/ai/task', { method: 'POST', body: JSON.stringify(data) }),

  // Import / Export
  previewImport: (rawRows: any[]) =>
    request<{ totalRows: number; validCount: number; errorCount: number; rows: any[] }>('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ rawRows }),
    }),
  executeImport: (rows: any[]) =>
    request<{ success: boolean; count: number; students: Student[] }>('/import/execute', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),
  getExportUrl: (type: 'students' | 'submissions' | 'analytics', classId?: string) => {
    return `/api/export/csv?type=${type}${classId ? `&classId=${classId}` : ''}`;
  },

  // Admin
  getSettings: () => request<SystemSettings>('/admin/settings'),
  updateSettings: (settings: Partial<SystemSettings>) =>
    request<SystemSettings>('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getAuditLogs: () => request<AuditLog[]>('/admin/audit-logs'),
  resetSeed: () => request<{ success: boolean; message: string }>('/admin/reset-seed', { method: 'POST' }),
};
