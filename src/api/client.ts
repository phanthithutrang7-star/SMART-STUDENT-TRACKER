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
import { clientStorageDb } from './clientStorage.ts';

let forceClientFallback = false;

// If we are on GitHub Pages or static host, enable fallback immediately
if (typeof window !== 'undefined') {
  const host = window.location.hostname;
  if (host.endsWith('github.io') || host.endsWith('pages.dev') || host.endsWith('vercel.app')) {
    // Check if api is available, or fallback
  }
}

async function safeApiCall<T>(serverFn: () => Promise<T>, fallbackFn: () => T | Promise<T>): Promise<T> {
  if (forceClientFallback) {
    return Promise.resolve(fallbackFn());
  }

  try {
    return await serverFn();
  } catch (err: any) {
    const msg = String(err?.message || '');
    const isStaticOrOffline =
      msg.includes('404') ||
      msg.includes('405') ||
      msg.includes('502') ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Load failed');

    if (isStaticOrOffline) {
      console.warn('[SmartTracker] Máy chủ không khả dụng hoặc đang chạy trên GitHub Pages (chế độ tĩnh). Chuyển sang CSDL LocalStorage client-side:', msg);
      forceClientFallback = true;
      return Promise.resolve(fallbackFn());
    }
    throw err;
  }
}

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
  getUsers: () =>
    safeApiCall(
      () => request<{ users: User[]; currentUser: User }>('/auth/users'),
      () => clientStorageDb.getUsers()
    ),

  switchUser: (userId: string) =>
    safeApiCall(
      () =>
        request<{ success: boolean; currentUser: User }>('/auth/switch', {
          method: 'POST',
          body: JSON.stringify({ userId }),
        }),
      () => clientStorageDb.switchUser(userId)
    ),

  // Classes
  getClasses: () =>
    safeApiCall(
      () => request<ClassGroup[]>('/classes'),
      () => clientStorageDb.getClasses()
    ),

  createClass: (cls: Partial<ClassGroup>) =>
    safeApiCall(
      () => request<ClassGroup>('/classes', { method: 'POST', body: JSON.stringify(cls) }),
      () => clientStorageDb.createClass(cls)
    ),

  updateClass: (id: string, cls: Partial<ClassGroup>) =>
    safeApiCall(
      () => request<ClassGroup>(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(cls) }),
      () => clientStorageDb.updateClass(id, cls)
    ),

  deleteClass: (id: string) =>
    safeApiCall(
      () => request<{ success: boolean; message: string }>(`/classes/${id}`, { method: 'DELETE' }),
      () => clientStorageDb.deleteClass(id)
    ),

  // Students
  getStudents: (params?: { classId?: string; search?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return safeApiCall(
      () => request<Student[]>(`/students${query ? `?${query}` : ''}`),
      () => clientStorageDb.getStudents(params)
    );
  },

  getStudentDetail: (id: string) =>
    safeApiCall(
      () =>
        request<{
          student: Student;
          analytics: StudentAnalytics;
          submissions: AssignmentSubmission[];
          results: AssessmentResult[];
          alerts: Alert[];
        }>(`/students/${id}`),
      () => clientStorageDb.getStudentDetail(id)
    ),

  createStudent: (student: Partial<Student>) =>
    safeApiCall(
      () => request<Student>('/students', { method: 'POST', body: JSON.stringify(student) }),
      () => clientStorageDb.createStudent(student)
    ),

  updateStudent: (id: string, student: Partial<Student>) =>
    safeApiCall(
      () => request<Student>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(student) }),
      () => clientStorageDb.updateStudent(id, student)
    ),

  deleteStudent: (id: string) =>
    safeApiCall(
      () => request<{ success: boolean; message: string }>(`/students/${id}`, { method: 'DELETE' }),
      () => clientStorageDb.deleteStudent(id)
    ),

  transferStudent: (id: string, toClassId: string, reason: string) =>
    safeApiCall(
      () =>
        request<Student>(`/students/${id}/transfer`, {
          method: 'POST',
          body: JSON.stringify({ toClassId, reason }),
        }),
      () => clientStorageDb.transferStudent(id, toClassId, reason)
    ),

  // Subjects
  getSubjects: () =>
    safeApiCall(
      () => request<Subject[]>('/subjects'),
      () => clientStorageDb.getSubjects()
    ),

  // Assignments
  getAssignments: (params?: { classId?: string; subjectId?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return safeApiCall(
      () => request<Assignment[]>(`/assignments${query ? `?${query}` : ''}`),
      () => clientStorageDb.getAssignments(params)
    );
  },

  createAssignment: (asg: Partial<Assignment>) =>
    safeApiCall(
      () => request<Assignment>('/assignments', { method: 'POST', body: JSON.stringify(asg) }),
      () => clientStorageDb.createAssignment(asg)
    ),

  updateAssignment: (id: string, asg: Partial<Assignment>) =>
    safeApiCall(
      () => request<Assignment>(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(asg) }),
      () => clientStorageDb.updateAssignment(id, asg)
    ),

  deleteAssignment: (id: string) =>
    safeApiCall(
      () => request<{ success: boolean; message: string }>(`/assignments/${id}`, { method: 'DELETE' }),
      () => clientStorageDb.deleteAssignment(id)
    ),

  // Submissions
  getSubmissions: (params?: { assignmentId?: string; studentId?: string; classId?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return safeApiCall(
      () => request<AssignmentSubmission[]>(`/submissions${query ? `?${query}` : ''}`),
      () => clientStorageDb.getSubmissions(params)
    );
  },

  updateSubmission: (id: string, updates: any) =>
    safeApiCall(
      () =>
        request<AssignmentSubmission>(`/submissions/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        }),
      () => clientStorageDb.updateSubmission(id, updates)
    ),

  batchUpdateSubmissions: (submissionIds: string[], status: string, feedback?: string) =>
    safeApiCall(
      () =>
        request<{ updatedCount: number; submissions: AssignmentSubmission[] }>('/submissions/batch-update', {
          method: 'POST',
          body: JSON.stringify({ submissionIds, status, feedback }),
        }),
      () => clientStorageDb.batchUpdateSubmissions(submissionIds, status, feedback)
    ),

  // Assessments
  getAssessments: (params?: { classId?: string; subjectId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return safeApiCall(
      () => request<Assessment[]>(`/assessments${query ? `?${query}` : ''}`),
      () => clientStorageDb.getAssessments(params)
    );
  },

  createAssessment: (asm: Partial<Assessment>) =>
    safeApiCall(
      () => request<Assessment>('/assessments', { method: 'POST', body: JSON.stringify(asm) }),
      () => clientStorageDb.createAssessment(asm)
    ),

  updateAssessment: (id: string, asm: Partial<Assessment>) =>
    safeApiCall(
      () => request<Assessment>(`/assessments/${id}`, { method: 'PUT', body: JSON.stringify(asm) }),
      () => clientStorageDb.updateAssessment(id, asm)
    ),

  deleteAssessment: (id: string) =>
    safeApiCall(
      () => request<{ success: boolean; message: string }>(`/assessments/${id}`, { method: 'DELETE' }),
      () => clientStorageDb.deleteAssessment(id)
    ),

  getAssessmentResults: (params?: { assessmentId?: string; studentId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return safeApiCall(
      () => request<AssessmentResult[]>(`/assessments/results${query ? `?${query}` : ''}`),
      () => clientStorageDb.getAssessmentResults(params)
    );
  },

  updateAssessmentResult: (id: string, score: number | null, reason: string) =>
    safeApiCall(
      () =>
        request<AssessmentResult>(`/assessments/results/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ score, reason }),
        }),
      () => clientStorageDb.updateAssessmentResult(id, score, reason)
    ),

  // GRADE IMPORT & PREVIEW
  previewImportScores: (assessmentId: string, rawRows: any[]) =>
    safeApiCall(
      () =>
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
      () => clientStorageDb.previewImportScores(assessmentId, rawRows)
    ),

  executeImportScores: (assessmentId: string, rows: any[]) =>
    safeApiCall(
      () =>
        request<{ success: boolean; successCount: number; errorCount: number; errors: string[] }>(
          '/assessments/import-scores',
          {
            method: 'POST',
            body: JSON.stringify({ assessmentId, rows }),
          }
        ),
      () => clientStorageDb.executeImportScores(assessmentId, rows)
    ),

  // Analytics & Dashboard
  getDashboardMetrics: (classId?: string) => {
    const query = classId ? `?classId=${classId}` : '';
    return safeApiCall(
      () => request<DashboardMetrics>(`/analytics/dashboard${query}`),
      () => clientStorageDb.getDashboardMetrics(classId)
    );
  },

  getStudentAnalytics: (id: string, subjectId?: string) =>
    safeApiCall(
      () => request<StudentAnalytics>(`/analytics/student/${id}${subjectId ? `?subjectId=${subjectId}` : ''}`),
      () => clientStorageDb.getStudentDetail(id).analytics
    ),

  getClassSummaries: () =>
    safeApiCall(
      () => request<{ class: ClassGroup; metrics: DashboardMetrics }[]>('/analytics/classes'),
      () =>
        clientStorageDb.getClasses().map((c) => ({
          class: c,
          metrics: clientStorageDb.getDashboardMetrics(c.id),
        }))
    ),

  // Alerts
  getAlerts: (params?: { classId?: string; priority?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return safeApiCall(
      () => request<Alert[]>(`/alerts${query ? `?${query}` : ''}`),
      () => clientStorageDb.getAlerts(params)
    );
  },

  createAlert: (alert: {
    studentId: string;
    ruleTitle: string;
    triggerReason: string;
    priority: Alert['priority'];
    actionPlan?: string;
    note?: string;
  }) =>
    safeApiCall(
      () => request<Alert>('/alerts', { method: 'POST', body: JSON.stringify(alert) }),
      () => {
        const item: Alert = {
          id: `alt_${Date.now()}`,
          studentId: alert.studentId,
          classId: 'cls_10a1',
          ruleCode: 'MANUAL_INTERVENTION',
          ruleTitle: alert.ruleTitle,
          triggerReason: alert.triggerReason,
          basisData: 'Tạo thủ công',
          detectedAt: new Date().toISOString(),
          priority: alert.priority,
          status: 'OPEN',
          actionPlan: alert.actionPlan,
          teacherNotes: alert.note
            ? [{ date: new Date().toISOString(), author: 'Giáo viên', content: alert.note }]
            : [],
        };
        clientStorageDb['data'].alerts.unshift(item);
        clientStorageDb['save']();
        return item;
      }
    ),

  updateAlert: (id: string, updates: { status?: Alert['status']; note?: string; actionPlan?: string }) =>
    safeApiCall(
      () => request<Alert>(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
      () => clientStorageDb.updateAlertStatus(id, updates.status || 'OPEN', updates.note)
    ),

  deleteAlert: (id: string) =>
    safeApiCall(
      () => request<{ success: boolean; message: string }>(`/alerts/${id}`, { method: 'DELETE' }),
      () => {
        clientStorageDb['data'].alerts = clientStorageDb['data'].alerts.filter((a) => a.id !== id);
        clientStorageDb['save']();
        return { success: true, message: 'Đã xóa cảnh báo' };
      }
    ),

  evaluateAlerts: () =>
    safeApiCall(
      () => request<{ success: boolean; alerts: Alert[] }>('/alerts/evaluate', { method: 'POST' }),
      () => ({ success: true, alerts: clientStorageDb.getAlerts() })
    ),

  // AI Assistant
  postAiTask: (data: {
    action: string;
    classId?: string;
    studentId?: string;
    query?: string;
    academicPeriod?: string;
  }) =>
    safeApiCall(
      () =>
        request<{
          success: boolean;
          isAiGenerated: boolean;
          model: string;
          result: string;
          dataContextSummary: any;
        }>('/ai/task', { method: 'POST', body: JSON.stringify(data) }),
      () => ({
        success: true,
        isAiGenerated: false,
        model: 'local-rule-engine',
        result: 'Hệ thống đã ghi nhận yêu cầu và tổng hợp dữ liệu học tập thành công.',
        dataContextSummary: {},
      })
    ),

  // Import / Export
  previewImport: (rawRows: any[]) =>
    safeApiCall(
      () =>
        request<{ totalRows: number; validCount: number; errorCount: number; rows: any[] }>('/import/preview', {
          method: 'POST',
          body: JSON.stringify({ rawRows }),
        }),
      () => clientStorageDb.previewStudentImport(rawRows)
    ),

  executeImport: (rows: any[]) =>
    safeApiCall(
      () =>
        request<{ success: boolean; count: number; students: Student[] }>('/import/execute', {
          method: 'POST',
          body: JSON.stringify({ rows }),
        }),
      () => {
        const res = clientStorageDb.executeStudentImport(rows);
        return {
          success: res.success,
          count: res.successCount,
          students: clientStorageDb.getStudents(),
        };
      }
    ),

  getExportUrl: (type: 'students' | 'submissions' | 'analytics', classId?: string) => {
    return `/api/export/csv?type=${type}${classId ? `&classId=${classId}` : ''}`;
  },

  // Admin
  getSettings: () =>
    safeApiCall(
      () => request<SystemSettings>('/admin/settings'),
      () => clientStorageDb.getSystemSettings()
    ),

  updateSettings: (settings: Partial<SystemSettings>) =>
    safeApiCall(
      () => request<SystemSettings>('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }),
      () => clientStorageDb.updateSystemSettings(settings)
    ),

  getAuditLogs: () =>
    safeApiCall(
      () => request<AuditLog[]>('/admin/audit-logs'),
      () => clientStorageDb.getAuditLogs()
    ),

  resetSeed: () =>
    safeApiCall(
      () => request<{ success: boolean; message: string }>('/admin/reset-seed', { method: 'POST' }),
      () => {
        localStorage.removeItem('smart_student_tracker_client_db_v2');
        window.location.reload();
        return { success: true, message: 'Đã đặt lại dữ liệu mẫu' };
      }
    ),
};
