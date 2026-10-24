export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'SCHOOL_MANAGER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedClassIds: string[];
  studentId?: string; // If role is STUDENT
}

export interface Subject {
  id: string;
  code: string;
  name: string;
}

export type ClassStatus = 'ACTIVE' | 'ARCHIVED';

export interface ClassGroup {
  id: string;
  code: string; // e.g. "10A1"
  name: string;
  gradeLevel: number;
  homeroomTeacher: string;
  academicYear: string;
  status: ClassStatus;
  studentCount?: number;
}

export type StudentStatus = 'ACTIVE' | 'TRANSFERRED' | 'DROPPED' | 'GRADUATED';

export interface StudentTransferRecord {
  id: string;
  date: string;
  fromClassId: string;
  toClassId: string;
  reason: string;
  performedBy: string;
}

export interface Student {
  id: string;
  studentCode: string; // Stable unique ID e.g. HS2025-001
  fullName: string;
  gender: 'Nam' | 'Nữ';
  birthDate: string;
  classId: string;
  email: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  status: StudentStatus;
  transferHistory?: StudentTransferRecord[];
  createdAt: string;
  updatedAt: string;
}

export type AssignmentStatus = 'ACTIVE' | 'CLOSED' | 'CANCELLED';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  classIds: string[];
  assignedDate: string;
  dueDate: string;
  maxScore: number;
  attachments?: { name: string; url: string }[];
  status: AssignmentStatus;
  createdBy: string;
  createdAt: string;
}

export type SubmissionStatus =
  | 'NOT_STARTED'
  | 'SUBMITTED'
  | 'LATE_SUBMITTED'
  | 'COMPLETED'
  | 'NEEDS_REVISION'
  | 'EXEMPT'
  | 'UNKNOWN';

export interface SubmissionHistory {
  changedAt: string;
  changedBy: string;
  oldStatus: SubmissionStatus;
  newStatus: SubmissionStatus;
  note?: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  classId: string;
  submissionStatus: SubmissionStatus;
  submittedAt?: string;
  score?: number | null; // null means not graded yet, 0 is a real 0 score
  feedback?: string;
  history: SubmissionHistory[];
  updatedAt: string;
}

export type AssessmentType = '15_MIN' | 'ONE_PERIOD' | 'MIDTERM' | 'FINAL' | 'PROJECT';

export interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  subjectId: string;
  classId: string;
  date: string;
  maxScore: number;
  weight: number; // e.g. 1 for 15-min, 2 for 1-period, 3 for midterm, etc.
}

export interface ScoreAdjustmentRecord {
  changedAt: string;
  changedBy: string;
  oldScore: number | null;
  newScore: number | null;
  reason: string;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  studentId: string;
  score: number | null; // 0 is real zero, null is not evaluated
  note?: string;
  adjustmentHistory: ScoreAdjustmentRecord[];
  updatedAt: string;
}

export type AlertPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'OPEN' | 'REVIEWING' | 'ACTION_PLANNED' | 'RESOLVED' | 'DISMISSED';

export interface Alert {
  id: string;
  studentId: string;
  studentName?: string;
  studentCode?: string;
  classId: string;
  className?: string;
  ruleCode: 'OVERDUE_ASSIGNMENTS' | 'LOW_COMPLETION_RATE' | 'GRADE_DROP' | 'MULTI_RISK_FACTORS';
  ruleTitle: string;
  triggerReason: string;
  basisData: string;
  detectedAt: string;
  priority: AlertPriority;
  status: AlertStatus;
  teacherNotes: { date: string; author: string; content: string }[];
  actionPlan?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type LearningTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';

export interface StudentAnalytics {
  studentId: string;
  studentCode: string;
  fullName: string;
  classId: string;
  className: string;
  totalAssignmentsAssigned: number;
  completedAssignments: number;
  exemptAssignments: number;
  overdueAssignments: number;
  lateSubmittedAssignments: number;
  completionRate: number; // Completed / (Assigned - Exempt) * 100
  onTimeRate: number; // On-time / (Total evaluated submissions) * 100
  averageScore: number | null;
  scoreTrend: LearningTrend;
  trendExplanation: string;
  riskFlags: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  details: string;
}

export interface SystemSettings {
  alertThresholds: {
    overdueLimit: number; // default: 3
    minCompletionRate: number; // default: 60 (%)
    gradeDropThreshold: number; // default: 1.5 (points on 10 scale)
  };
  gradingScale: 'SCALE_10' | 'SCALE_100';
  currentAcademicYear: string;
  currentSemester: 'HK1' | 'HK2';
}

export interface DashboardMetrics {
  totalStudents: number;
  totalClasses: number;
  totalAssignments: number;
  overallCompletionRate: number;
  overallOnTimeRate: number;
  unsubmittedCount: number;
  lateSubmittedCount: number;
  averageGrade: number | null;
  decliningTrendCount: number;
  attentionCasesCount: number;
  openAlertsCount: number;
}
