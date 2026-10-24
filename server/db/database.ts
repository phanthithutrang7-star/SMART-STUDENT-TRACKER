import fs from 'fs';
import path from 'path';
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
  StudentAnalytics,
  DashboardMetrics,
  LearningTrend,
} from '../../src/types/index.ts';
import {
  initialUsers,
  initialSubjects,
  initialClasses,
  initialStudents,
  initialAssignments,
  initialSubmissions,
  initialAssessments,
  initialAssessmentResults,
  initialAlerts,
  initialSystemSettings,
  initialAuditLogs,
} from './seedData.ts';

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel
  ? path.resolve('/tmp', 'smart-tracker-data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

export interface DatabaseSchema {
  users: User[];
  subjects: Subject[];
  classes: ClassGroup[];
  students: Student[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  assessments: Assessment[];
  assessmentResults: AssessmentResult[];
  alerts: Alert[];
  systemSettings: SystemSettings;
  auditLogs: AuditLog[];
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }

      // If running on Vercel and /tmp doesn't have db.json yet, attempt reading bundled data/db.json
      const bundledDbFile = path.resolve(process.cwd(), 'data', 'db.json');
      if (fs.existsSync(bundledDbFile)) {
        const raw = fs.readFileSync(bundledDbFile, 'utf-8');
        const data = JSON.parse(raw);
        this.persist(data);
        return data;
      }
    } catch (e) {
      console.warn('Failed to load db.json, fallback to seed data:', e);
    }

    const seeded: DatabaseSchema = {
      users: [...initialUsers],
      subjects: [...initialSubjects],
      classes: [...initialClasses],
      students: [...initialStudents],
      assignments: [...initialAssignments],
      submissions: [...initialSubmissions],
      assessments: [...initialAssessments],
      assessmentResults: [...initialAssessmentResults],
      alerts: [...initialAlerts],
      systemSettings: { ...initialSystemSettings },
      auditLogs: [...initialAuditLogs],
    };

    this.persist(seeded);
    return seeded;
  }

  private persist(state?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state || this.data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Persistent disk write skipped (in-memory mode):', (e as any)?.message || e);
    }
  }

  // --- Audit Logging ---
  public logAudit(user: { id: string; name: string; role: any }, action: string, module: string, details: string) {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      module,
      details,
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.persist();
    return log;
  }

  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  // --- Users & Roles ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  // --- Subjects ---
  public getSubjects(): Subject[] {
    return this.data.subjects;
  }

  // --- Classes ---
  public getClasses(): ClassGroup[] {
    return this.data.classes.map((cls) => {
      const studentCount = this.data.students.filter(
        (s) => s.classId === cls.id && s.status === 'ACTIVE'
      ).length;
      return { ...cls, studentCount };
    });
  }

  public getClassById(id: string): ClassGroup | undefined {
    const cls = this.data.classes.find((c) => c.id === id);
    if (!cls) return undefined;
    const studentCount = this.data.students.filter(
      (s) => s.classId === cls.id && s.status === 'ACTIVE'
    ).length;
    return { ...cls, studentCount };
  }

  public createClass(cls: Omit<ClassGroup, 'id'>, user: any): ClassGroup {
    const newClass: ClassGroup = {
      ...cls,
      id: `cls_${Date.now()}`,
    };
    this.data.classes.push(newClass);
    this.logAudit(user, 'TẠO_LỚP_HỌC', 'LỚP_HỌC', `Tạo lớp học ${newClass.code} (${newClass.name})`);
    this.persist();
    return newClass;
  }

  public updateClass(id: string, updates: Partial<ClassGroup>, user: any): ClassGroup | null {
    const idx = this.data.classes.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.classes[idx] = { ...this.data.classes[idx], ...updates };
    this.logAudit(user, 'CẬP_NHẬT_LỚP', 'LỚP_HỌC', `Cập nhật thông tin lớp ${this.data.classes[idx].code}`);
    this.persist();
    return this.data.classes[idx];
  }

  public deleteClass(id: string, user: any): boolean {
    const cls = this.data.classes.find((c) => c.id === id);
    if (!cls) return false;
    const activeStudentCount = this.data.students.filter((s) => s.classId === id && s.status === 'ACTIVE').length;
    if (activeStudentCount > 0) {
      throw new Error(`Lớp ${cls.code} đang có ${activeStudentCount} học sinh đang học. Vui lòng chuyển lớp cho các học sinh trước khi xóa lớp.`);
    }
    this.data.classes = this.data.classes.filter((c) => c.id !== id);
    this.logAudit(user, 'XÓA_LỚP_HỌC', 'LỚP_HỌC', `Xóa lớp học ${cls.code} (${cls.name})`);
    this.persist();
    return true;
  }

  // --- Students ---
  public getStudents(filters?: { classId?: string; search?: string; status?: string }): Student[] {
    return this.data.students.filter((s) => {
      if (filters?.classId && s.classId !== filters.classId) return false;
      if (filters?.status && s.status !== filters.status) return false;
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        const matchCode = s.studentCode.toLowerCase().includes(query);
        const matchName = s.fullName.toLowerCase().includes(query);
        const matchEmail = s.email.toLowerCase().includes(query);
        if (!matchCode && !matchName && !matchEmail) return false;
      }
      return true;
    });
  }

  public getStudentById(id: string): Student | undefined {
    return this.data.students.find((s) => s.id === id);
  }

  public createStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>, user: any): Student {
    // Check duplicate studentCode
    const exists = this.data.students.some((s) => s.studentCode.trim().toUpperCase() === student.studentCode.trim().toUpperCase());
    if (exists) {
      throw new Error(`Mã học sinh '${student.studentCode}' đã tồn tại trong hệ thống.`);
    }

    const newStudent: Student = {
      ...student,
      id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transferHistory: [],
    };
    this.data.students.push(newStudent);
    this.logAudit(user, 'THÊM_HỌC_SINH', 'HỌC_SINH', `Thêm mới học sinh ${newStudent.fullName} (${newStudent.studentCode})`);
    this.persist();
    return newStudent;
  }

  public updateStudent(id: string, updates: Partial<Student>, user: any): Student | null {
    const idx = this.data.students.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    if (updates.studentCode && updates.studentCode !== this.data.students[idx].studentCode) {
      const exists = this.data.students.some((s) => s.id !== id && s.studentCode.toUpperCase() === updates.studentCode!.toUpperCase());
      if (exists) {
        throw new Error(`Mã học sinh '${updates.studentCode}' đã tồn tại.`);
      }
    }

    this.data.students[idx] = {
      ...this.data.students[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit(user, 'CẬP_NHẬT_HỌC_SINH', 'HỌC_SINH', `Cập nhật thông tin học sinh ${this.data.students[idx].fullName}`);
    this.persist();
    return this.data.students[idx];
  }

  public deleteStudent(id: string, user: any): boolean {
    const student = this.getStudentById(id);
    if (!student) return false;

    this.data.students = this.data.students.filter((s) => s.id !== id);
    // Cleanup cascade
    this.data.submissions = this.data.submissions.filter((s) => s.studentId !== id);
    this.data.assessmentResults = this.data.assessmentResults.filter((r) => r.studentId !== id);
    this.data.alerts = this.data.alerts.filter((a) => a.studentId !== id);

    this.logAudit(user, 'XÓA_HỌC_SINH', 'HỌC_SINH', `Xóa hồ sơ học sinh ${student.fullName} (${student.studentCode}) và toàn bộ dữ liệu bài nộp, điểm số liên quan`);
    this.persist();
    return true;
  }

  public transferStudent(id: string, toClassId: string, reason: string, user: any): Student | null {
    const student = this.getStudentById(id);
    if (!student) return null;
    const oldClassId = student.classId;
    if (oldClassId === toClassId) return student;

    const transferRecord = {
      id: `trans_${Date.now()}`,
      date: new Date().toISOString(),
      fromClassId: oldClassId,
      toClassId,
      reason,
      performedBy: user.name,
    };

    student.classId = toClassId;
    student.transferHistory = [...(student.transferHistory || []), transferRecord];
    student.updatedAt = new Date().toISOString();

    const fromClass = this.getClassById(oldClassId)?.code || oldClassId;
    const toClass = this.getClassById(toClassId)?.code || toClassId;
    this.logAudit(
      user,
      'CHUYỂN_LỚP_HỌC_SINH',
      'HỌC_SINH',
      `Chuyển học sinh ${student.fullName} (${student.studentCode}) từ ${fromClass} sang ${toClass}. Lý do: ${reason}`
    );

    this.persist();
    return student;
  }

  // --- Assignments ---
  public getAssignments(filters?: { classId?: string; subjectId?: string; status?: string }): Assignment[] {
    return this.data.assignments.filter((a) => {
      if (filters?.classId && !a.classIds.includes(filters.classId)) return false;
      if (filters?.subjectId && a.subjectId !== filters.subjectId) return false;
      if (filters?.status && a.status !== filters.status) return false;
      return true;
    });
  }

  public getAssignmentById(id: string): Assignment | undefined {
    return this.data.assignments.find((a) => a.id === id);
  }

  public createAssignment(data: Omit<Assignment, 'id' | 'createdAt'>, user: any): Assignment {
    const newAssignment: Assignment = {
      ...data,
      id: `asg_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.assignments.push(newAssignment);

    // Initialize submissions for all active students in the assigned classes
    const targetStudents = this.data.students.filter(
      (s) => newAssignment.classIds.includes(s.classId) && s.status === 'ACTIVE'
    );
    for (const student of targetStudents) {
      this.data.submissions.push({
        id: `subm_${newAssignment.id}_${student.id}`,
        assignmentId: newAssignment.id,
        studentId: student.id,
        classId: student.classId,
        submissionStatus: 'NOT_STARTED',
        score: null,
        history: [],
        updatedAt: new Date().toISOString(),
      });
    }

    this.logAudit(user, 'TẠO_BÀI_TẬP', 'BÀI_TẬP', `Tạo bài tập mới: "${newAssignment.title}"`);
    this.persist();
    return newAssignment;
  }

  public updateAssignment(id: string, updates: Partial<Assignment>, user: any): Assignment | null {
    const idx = this.data.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.data.assignments[idx] = { ...this.data.assignments[idx], ...updates };
    this.logAudit(user, 'CẬP_NHẬT_BÀI_TẬP', 'BÀI_TẬP', `Cập nhật bài tập "${this.data.assignments[idx].title}"`);
    this.persist();
    return this.data.assignments[idx];
  }

  public deleteAssignment(id: string, user: any): boolean {
    const asg = this.getAssignmentById(id);
    if (!asg) return false;

    this.data.assignments = this.data.assignments.filter((a) => a.id !== id);
    // Cleanup submissions for this assignment
    this.data.submissions = this.data.submissions.filter((s) => s.assignmentId !== id);

    this.logAudit(user, 'XÓA_BÀI_TẬP', 'BÀI_TẬP', `Xóa bài tập "${asg.title}" và các bài nộp liên quan`);
    this.persist();
    return true;
  }

  // --- Submissions ---
  public getSubmissions(filters?: { assignmentId?: string; studentId?: string; classId?: string; status?: string }): AssignmentSubmission[] {
    return this.data.submissions.filter((s) => {
      if (filters?.assignmentId && s.assignmentId !== filters.assignmentId) return false;
      if (filters?.studentId && s.studentId !== filters.studentId) return false;
      if (filters?.classId && s.classId !== filters.classId) return false;
      if (filters?.status && s.submissionStatus !== filters.status) return false;
      return true;
    });
  }

  public updateSubmission(
    id: string,
    updates: {
      submissionStatus?: AssignmentSubmission['submissionStatus'];
      score?: number | null;
      feedback?: string;
      note?: string;
    },
    user: any
  ): AssignmentSubmission | null {
    const subm = this.data.submissions.find((s) => s.id === id);
    if (!subm) return null;

    const oldStatus = subm.submissionStatus;
    const newStatus = updates.submissionStatus ?? subm.submissionStatus;

    if (oldStatus !== newStatus) {
      subm.history.push({
        changedAt: new Date().toISOString(),
        changedBy: user.name,
        oldStatus,
        newStatus,
        note: updates.note || updates.feedback,
      });
    }

    subm.submissionStatus = newStatus;
    if (updates.score !== undefined) {
      subm.score = updates.score;
    }
    if (updates.feedback !== undefined) {
      subm.feedback = updates.feedback;
    }
    if (newStatus === 'SUBMITTED' || newStatus === 'LATE_SUBMITTED' || newStatus === 'COMPLETED') {
      if (!subm.submittedAt) {
        subm.submittedAt = new Date().toISOString();
      }
    }
    subm.updatedAt = new Date().toISOString();

    const student = this.getStudentById(subm.studentId)?.fullName || subm.studentId;
    this.logAudit(
      user,
      'CẬP_NHẬT_TRẠNG_THÁI_BÀI_NỘP',
      'THEO_DÕI_BÀI',
      `Cập nhật bài nộp của ${student}: ${oldStatus} -> ${newStatus}${updates.score !== undefined ? ` (Điểm: ${updates.score})` : ''}`
    );

    this.persist();
    this.runAlertEngine(); // Auto evaluate alerts after updates
    return subm;
  }

  // --- Assessments & Results ---
  public getAssessments(filters?: { classId?: string; subjectId?: string }): Assessment[] {
    return this.data.assessments.filter((a) => {
      if (filters?.classId && a.classId !== filters.classId) return false;
      if (filters?.subjectId && a.subjectId !== filters.subjectId) return false;
      return true;
    });
  }

  public createAssessment(data: Omit<Assessment, 'id'>, user: any): Assessment {
    const newAssessment: Assessment = {
      ...data,
      id: `asm_${Date.now()}`,
    };
    this.data.assessments.push(newAssessment);

    // Initialize blank results for all students in that class
    const studentsInClass = this.data.students.filter((s) => s.classId === newAssessment.classId && s.status === 'ACTIVE');
    for (const student of studentsInClass) {
      this.data.assessmentResults.push({
        id: `res_${newAssessment.id}_${student.id}`,
        assessmentId: newAssessment.id,
        studentId: student.id,
        score: null,
        adjustmentHistory: [],
        updatedAt: new Date().toISOString(),
      });
    }

    this.logAudit(user, 'TẠO_BÀI_ĐÁNH_GIÁ', 'KẾT_QUẢ_ĐÁNH_GIÁ', `Tạo bài đánh giá "${newAssessment.title}"`);
    this.persist();
    return newAssessment;
  }

  public updateAssessment(id: string, updates: Partial<Assessment>, user: any): Assessment | null {
    const idx = this.data.assessments.findIndex((a) => a.id === id);
    if (idx === -1) return null;

    const oldAsm = this.data.assessments[idx];
    this.data.assessments[idx] = { ...oldAsm, ...updates };

    // If classId changed, create results for new class students if not exists
    if (updates.classId && updates.classId !== oldAsm.classId) {
      const studentsInNewClass = this.data.students.filter((s) => s.classId === updates.classId && s.status === 'ACTIVE');
      for (const student of studentsInNewClass) {
        const hasResult = this.data.assessmentResults.some((r) => r.assessmentId === id && r.studentId === student.id);
        if (!hasResult) {
          this.data.assessmentResults.push({
            id: `res_${id}_${student.id}`,
            assessmentId: id,
            studentId: student.id,
            score: null,
            adjustmentHistory: [],
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    this.logAudit(user, 'CẬP_NHẬT_BÀI_ĐÁNH_GIÁ', 'KẾT_QUẢ_ĐÁNH_GIÁ', `Cập nhật bài đánh giá "${this.data.assessments[idx].title}"`);
    this.persist();
    return this.data.assessments[idx];
  }

  public deleteAssessment(id: string, user: any): boolean {
    const asm = this.data.assessments.find((a) => a.id === id);
    if (!asm) return false;

    this.data.assessments = this.data.assessments.filter((a) => a.id !== id);
    // Cleanup results for this assessment
    this.data.assessmentResults = this.data.assessmentResults.filter((r) => r.assessmentId !== id);

    this.logAudit(user, 'XÓA_BÀI_ĐÁNH_GIÁ', 'KẾT_QUẢ_ĐÁNH_GIÁ', `Xóa bài đánh giá "${asm.title}" và toàn bộ điểm số liên quan`);
    this.persist();
    this.runAlertEngine();
    return true;
  }

  public getAssessmentResults(assessmentId?: string, studentId?: string): AssessmentResult[] {
    return this.data.assessmentResults.filter((r) => {
      if (assessmentId && r.assessmentId !== assessmentId) return false;
      if (studentId && r.studentId !== studentId) return false;
      return true;
    });
  }

  public updateAssessmentResult(
    id: string,
    score: number | null,
    reason: string = 'Nhập/điều chỉnh điểm',
    user: any
  ): AssessmentResult | null {
    const res = this.data.assessmentResults.find((r) => r.id === id);
    if (!res) return null;

    if (score !== null && (score < 0 || score > 10)) {
      throw new Error('Điểm số phải nằm trong thang điểm từ 0 đến 10.');
    }

    const oldScore = res.score;
    if (oldScore !== score) {
      res.adjustmentHistory.push({
        changedAt: new Date().toISOString(),
        changedBy: user.name,
        oldScore,
        newScore: score,
        reason,
      });
    }

    res.score = score;
    res.updatedAt = new Date().toISOString();

    const student = this.getStudentById(res.studentId)?.fullName || res.studentId;
    this.logAudit(
      user,
      'ĐIỀU_CHỈNH_ĐIỂM_SỐ',
      'KẾT_QUẢ_ĐÁNH_GIÁ',
      `Điều chỉnh điểm học sinh ${student}: ${oldScore ?? 'Trống'} -> ${score ?? 'Trống'}. Lý do: ${reason}`
    );

    this.persist();
    this.runAlertEngine();
    return res;
  }

  // --- Analytics & KPI Engine ---
  public calculateStudentAnalytics(studentId: string, subjectId?: string): StudentAnalytics | null {
    const student = this.getStudentById(studentId);
    if (!student) return null;

    const studentClass = this.getClassById(student.classId);
    const targetSubject = subjectId ? this.getSubjects().find((s) => s.id === subjectId) : undefined;
    const submissions = this.data.submissions.filter((s) => s.studentId === studentId);

    const now = new Date();
    let totalAssigned = 0;
    let completed = 0;
    let exempt = 0;
    let overdue = 0;
    let late = 0;

    for (const sub of submissions) {
      const asg = this.getAssignmentById(sub.assignmentId);
      if (!asg || asg.status === 'CANCELLED') continue;
      if (subjectId && asg.subjectId !== subjectId) continue;

      if (sub.submissionStatus === 'EXEMPT') {
        exempt++;
        continue;
      }

      totalAssigned++;

      if (sub.submissionStatus === 'COMPLETED') {
        completed++;
      }

      if (sub.submissionStatus === 'LATE_SUBMITTED') {
        late++;
      }

      const isPastDue = asg.dueDate ? new Date(asg.dueDate) < now : false;
      if (
        isPastDue &&
        (sub.submissionStatus === 'NOT_STARTED' || sub.submissionStatus === 'NEEDS_REVISION')
      ) {
        overdue++;
      }
    }

    // Completion rate formula: Completed / (Total Assigned - Exempt) * 100
    // If effective assigned is 0, rate is 100%
    const effectiveAssigned = totalAssigned;
    const completionRate = effectiveAssigned > 0 ? Math.round((completed / effectiveAssigned) * 1000) / 10 : 100;

    // On-time rate formula: On-time completed submissions / total completed
    const onTimeCount = submissions.filter((s) => {
      if (subjectId) {
        const asg = this.getAssignmentById(s.assignmentId);
        if (asg?.subjectId !== subjectId) return false;
      }
      return s.submissionStatus === 'COMPLETED' && s.history.every((h) => h.newStatus !== 'LATE_SUBMITTED');
    }).length;
    const onTimeRate = completed > 0 ? Math.round((onTimeCount / completed) * 1000) / 10 : 100;

    // Assessments & Grade Trend (filtered by subject if provided)
    const results = this.data.assessmentResults
      .filter((r) => {
        if (r.studentId !== studentId || r.score === null) return false;
        if (subjectId) {
          const asm = this.data.assessments.find((a) => a.id === r.assessmentId);
          if (asm?.subjectId !== subjectId) return false;
        }
        return true;
      })
      .map((r) => {
        const asm = this.data.assessments.find((a) => a.id === r.assessmentId);
        return {
          ...r,
          date: asm?.date || '1970-01-01',
          weight: asm?.weight || 1,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let averageScore: number | null = null;
    let scoreTrend: LearningTrend = 'INSUFFICIENT_DATA';
    const subNameStr = targetSubject ? ` môn ${targetSubject.name}` : '';
    let trendExplanation = `Chưa đủ dữ liệu tối thiểu${subNameStr} (cần ít nhất 2 bài đánh giá để so sánh xu hướng).`;

    if (results.length > 0) {
      const sumWeighted = results.reduce((acc, r) => acc + (r.score ?? 0) * r.weight, 0);
      const sumWeights = results.reduce((acc, r) => acc + r.weight, 0);
      averageScore = Math.round((sumWeighted / sumWeights) * 10) / 10;
    }

    if (results.length >= 2) {
      // Compare latest assessment with previous baseline
      const latest = results[results.length - 1];
      const previous = results[results.length - 2];
      const diff = (latest.score ?? 0) - (previous.score ?? 0);

      if (diff >= 0.5) {
        scoreTrend = 'IMPROVING';
        trendExplanation = `Điểm bài kiểm tra gần nhất${subNameStr} (${latest.score}) tăng +${diff.toFixed(1)} so với bài trước (${previous.score}).`;
      } else if (diff <= -1.0) {
        scoreTrend = 'DECLINING';
        trendExplanation = `Điểm bài kiểm tra gần nhất${subNameStr} (${latest.score}) giảm ${diff.toFixed(1)} điểm so với bài trước (${previous.score}).`;
      } else {
        scoreTrend = 'STABLE';
        trendExplanation = `Kết quả${subNameStr} duy trì ổn định (chênh lệch ${diff.toFixed(1)} điểm giữa hai bài gần nhất).`;
      }
    }

    // Risk flags
    const riskFlags: string[] = [];
    if (overdue >= 3) {
      riskFlags.push(`Có ${overdue} bài tập${subNameStr} quá hạn chưa nộp`);
    }
    if (effectiveAssigned >= 2 && completionRate < this.data.systemSettings.alertThresholds.minCompletionRate) {
      riskFlags.push(`Tỷ lệ hoàn thành${subNameStr} (${completionRate}%) dưới ngưỡng ${this.data.systemSettings.alertThresholds.minCompletionRate}%`);
    }
    if (scoreTrend === 'DECLINING') {
      riskFlags.push(`Xu hướng điểm số${subNameStr} sụt giảm`);
    }

    return {
      studentId,
      studentCode: student.studentCode,
      fullName: student.fullName,
      classId: student.classId,
      className: studentClass?.code || 'Chưa phân lớp',
      totalAssignmentsAssigned: effectiveAssigned,
      completedAssignments: completed,
      exemptAssignments: exempt,
      overdueAssignments: overdue,
      lateSubmittedAssignments: late,
      completionRate,
      onTimeRate,
      averageScore,
      scoreTrend,
      trendExplanation,
      riskFlags,
    };
  }

  // --- Grade Import from Excel/CSV ---
  public importAssessmentScores(
    assessmentId: string,
    rows: { studentCode: string; score: number | null; note?: string }[],
    user: any
  ): { successCount: number; errorCount: number; errors: string[] } {
    const assessment = this.data.assessments.find((a) => a.id === assessmentId);
    if (!assessment) {
      throw new Error('Không tìm thấy bài đánh giá tương ứng để nhập điểm.');
    }

    const studentsInClass = this.data.students.filter(
      (s) => s.classId === assessment.classId && s.status === 'ACTIVE'
    );
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const code = (row.studentCode || '').trim();
      if (!code) {
        errors.push(`Dòng ${i + 1}: Thiếu mã học sinh`);
        continue;
      }

      const student = studentsInClass.find(
        (s) => s.studentCode.toUpperCase() === code.toUpperCase()
      );
      if (!student) {
        errors.push(
          `Dòng ${i + 1}: Mã học sinh '${code}' không thuộc lớp của bài kiểm tra này`
        );
        continue;
      }

      let score = row.score !== undefined && row.score !== null ? (typeof row.score === 'string' ? Number(String(row.score).replace(',', '.')) : row.score) : null;
      if (score !== null && isNaN(score)) {
        score = null;
      }
      if (score !== null && (score < 0 || score > 10)) {
        errors.push(
          `Dòng ${i + 1} (${student.fullName}): Điểm ${score} ngoài phạm vi cho phép (0 - 10)`
        );
        continue;
      }

      // Find or create result
      let result = this.data.assessmentResults.find(
        (r) => r.assessmentId === assessmentId && r.studentId === student.id
      );

      if (!result) {
        result = {
          id: `res_${assessmentId}_${student.id}`,
          assessmentId,
          studentId: student.id,
          score,
          note: row.note || 'Nhập từ tệp Excel/CSV',
          adjustmentHistory: [
            {
              changedAt: new Date().toISOString(),
              changedBy: user.name,
              oldScore: null,
              newScore: score,
              reason: 'Nhập điểm từ tệp Excel/CSV',
            },
          ],
          updatedAt: new Date().toISOString(),
        };
        this.data.assessmentResults.push(result);
      } else {
        const oldScore = result.score;
        if (oldScore !== score) {
          result.adjustmentHistory.push({
            changedAt: new Date().toISOString(),
            changedBy: user.name,
            oldScore,
            newScore: score,
            reason: row.note || 'Cập nhật từ tệp Excel/CSV',
          });
        }
        result.score = score;
        result.updatedAt = new Date().toISOString();
      }

      successCount++;
    }

    this.logAudit(
      user,
      'NHẬP_ĐIỂM_TỪ_EXCEL',
      'KẾT_QUẢ_ĐÁNH_GIÁ',
      `Nhập điểm cho bài kiểm tra "${assessment.title}": ${successCount} học sinh thành công, ${errors.length} lỗi`
    );

    this.persist();
    this.runAlertEngine();

    return {
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  public getDashboardMetrics(classId?: string): DashboardMetrics {
    const students = this.data.students.filter((s) => s.status === 'ACTIVE' && (!classId || s.classId === classId));
    const classes = this.data.classes.filter((c) => c.status === 'ACTIVE' && (!classId || c.id === classId));
    const assignments = this.data.assignments.filter((a) => !classId || a.classIds.includes(classId));

    let totalCompleted = 0;
    let totalAssigned = 0;
    let totalUnsubmitted = 0;
    let totalLate = 0;
    let decliningCount = 0;
    let attentionCount = 0;

    const studentAnalyticsList = students.map((s) => this.calculateStudentAnalytics(s.id)).filter(Boolean) as StudentAnalytics[];

    for (const ana of studentAnalyticsList) {
      totalCompleted += ana.completedAssignments;
      totalAssigned += ana.totalAssignmentsAssigned;
      totalUnsubmitted += ana.overdueAssignments;
      totalLate += ana.lateSubmittedAssignments;
      if (ana.scoreTrend === 'DECLINING') decliningCount++;
      if (ana.riskFlags.length > 0) attentionCount++;
    }

    const overallCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 1000) / 10 : 100;
    const overallOnTimeRate = totalCompleted > 0 ? Math.round(((totalCompleted - totalLate) / totalCompleted) * 1000) / 10 : 100;

    const validGrades = studentAnalyticsList.map((a) => a.averageScore).filter((g): g is number => g !== null);
    const averageGrade = validGrades.length > 0 ? Math.round((validGrades.reduce((a, b) => a + b, 0) / validGrades.length) * 10) / 10 : null;

    const openAlerts = this.data.alerts.filter((a) => (a.status === 'OPEN' || a.status === 'REVIEWING') && (!classId || a.classId === classId));

    return {
      totalStudents: students.length,
      totalClasses: classes.length,
      totalAssignments: assignments.length,
      overallCompletionRate,
      overallOnTimeRate,
      unsubmittedCount: totalUnsubmitted,
      lateSubmittedCount: totalLate,
      averageGrade,
      decliningTrendCount: decliningCount,
      attentionCasesCount: attentionCount,
      openAlertsCount: openAlerts.length,
    };
  }

  // --- Alerts Engine ---
  public runAlertEngine() {
    const thresholds = this.data.systemSettings.alertThresholds;
    const activeStudents = this.data.students.filter((s) => s.status === 'ACTIVE');

    for (const student of activeStudents) {
      const ana = this.calculateStudentAnalytics(student.id);
      if (!ana) continue;

      // Rule 1: Overdue limit >= 3
      if (ana.overdueAssignments >= thresholds.overdueLimit) {
        const existing = this.data.alerts.find(
          (a) => a.studentId === student.id && a.ruleCode === 'OVERDUE_ASSIGNMENTS' && (a.status === 'OPEN' || a.status === 'REVIEWING' || a.status === 'ACTION_PLANNED')
        );
        if (!existing) {
          this.data.alerts.push({
            id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            studentId: student.id,
            studentName: student.fullName,
            studentCode: student.studentCode,
            classId: student.classId,
            className: ana.className,
            ruleCode: 'OVERDUE_ASSIGNMENTS',
            ruleTitle: `Có từ ${thresholds.overdueLimit} bài tập quá hạn chưa hoàn thành`,
            triggerReason: `Học sinh có ${ana.overdueAssignments} bài tập quá hạn chưa nộp.`,
            basisData: `Số bài nợ: ${ana.overdueAssignments}. Tỷ lệ hoàn thành: ${ana.completionRate}%.`,
            detectedAt: new Date().toISOString(),
            priority: 'HIGH',
            status: 'OPEN',
            teacherNotes: [],
          });
        }
      }

      // Rule 2: Low completion rate < threshold
      if (ana.totalAssignmentsAssigned >= 2 && ana.completionRate < thresholds.minCompletionRate) {
        const existing = this.data.alerts.find(
          (a) => a.studentId === student.id && a.ruleCode === 'LOW_COMPLETION_RATE' && (a.status === 'OPEN' || a.status === 'REVIEWING' || a.status === 'ACTION_PLANNED')
        );
        if (!existing) {
          this.data.alerts.push({
            id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            studentId: student.id,
            studentName: student.fullName,
            studentCode: student.studentCode,
            classId: student.classId,
            className: ana.className,
            ruleCode: 'LOW_COMPLETION_RATE',
            ruleTitle: `Tỷ lệ hoàn thành bài tập (${ana.completionRate}%) dưới ngưỡng yêu cầu (${thresholds.minCompletionRate}%)`,
            triggerReason: `Tỷ lệ hoàn thành bài tập của học sinh hiện là ${ana.completionRate}%.`,
            basisData: `Hoàn thành ${ana.completedAssignments}/${ana.totalAssignmentsAssigned} bài được giao.`,
            detectedAt: new Date().toISOString(),
            priority: 'MEDIUM',
            status: 'OPEN',
            teacherNotes: [],
          });
        }
      }
    }

    this.persist();
  }

  public getAlerts(filters?: { classId?: string; priority?: string; status?: string }): Alert[] {
    return this.data.alerts.filter((a) => {
      if (filters?.classId && a.classId !== filters.classId) return false;
      if (filters?.priority && a.priority !== filters.priority) return false;
      if (filters?.status && a.status !== filters.status) return false;
      return true;
    });
  }

  public updateAlert(
    id: string,
    updates: { status?: Alert['status']; note?: string; actionPlan?: string },
    user: any
  ): Alert | null {
    const alert = this.data.alerts.find((a) => a.id === id);
    if (!alert) return null;

    if (updates.status) {
      alert.status = updates.status;
      if (updates.status === 'RESOLVED') {
        alert.resolvedAt = new Date().toISOString();
        alert.resolvedBy = user.name;
      }
    }

    if (updates.actionPlan !== undefined) {
      alert.actionPlan = updates.actionPlan;
    }

    if (updates.note) {
      alert.teacherNotes.push({
        date: new Date().toISOString(),
        author: user.name,
        content: updates.note,
      });
    }

    this.logAudit(user, 'CẬP_NHẬT_CẢNH_BÁO', 'CẢNH_BÁO', `Cập nhật trạng thái cảnh báo của học sinh ${alert.studentName}: ${alert.status}`);
    this.persist();
    return alert;
  }

  public createAlert(
    data: {
      studentId: string;
      ruleTitle: string;
      triggerReason: string;
      priority: Alert['priority'];
      actionPlan?: string;
      note?: string;
    },
    user: any
  ): Alert {
    const student = this.getStudentById(data.studentId);
    if (!student) {
      throw new Error('Không tìm thấy học sinh để tạo cảnh báo/can thiệp.');
    }
    const studentClass = this.getClassById(student.classId);

    const newAlert: Alert = {
      id: `alt_manual_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      studentId: student.id,
      studentName: student.fullName,
      studentCode: student.studentCode,
      classId: student.classId,
      className: studentClass?.code || student.classId,
      ruleCode: 'MANUAL_INTERVENTION',
      ruleTitle: data.ruleTitle || 'Kế hoạch can thiệp sư phạm cá nhân',
      triggerReason: data.triggerReason || 'Do giáo viên phụ trách trực tiếp ghi nhận và đề xuất can thiệp.',
      basisData: `Ghi nhận thủ công bởi ${user.name} (${user.role})`,
      detectedAt: new Date().toISOString(),
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      actionPlan: data.actionPlan || '',
      teacherNotes: data.note
        ? [
            {
              date: new Date().toISOString(),
              author: user.name,
              content: data.note,
            },
          ]
        : [],
    };

    this.data.alerts.unshift(newAlert);
    this.logAudit(user, 'TẠO_CẢNH_BÁO_THỦ_CÔNG', 'CẢNH_BÁO', `Tạo kế hoạch can thiệp/cảnh báo cho học sinh ${student.fullName}`);
    this.persist();
    return newAlert;
  }

  public deleteAlert(id: string, user: any): boolean {
    const alert = this.data.alerts.find((a) => a.id === id);
    if (!alert) return false;

    this.data.alerts = this.data.alerts.filter((a) => a.id !== id);
    this.logAudit(user, 'XÓA_CẢNH_BÁO', 'CẢNH_BÁO', `Xóa cảnh báo/kế hoạch can thiệp của học sinh ${alert.studentName}`);
    this.persist();
    return true;
  }

  // --- System Settings ---
  public getSettings(): SystemSettings {
    return this.data.systemSettings;
  }

  public updateSettings(settings: Partial<SystemSettings>, user: any): SystemSettings {
    this.data.systemSettings = {
      ...this.data.systemSettings,
      ...settings,
      alertThresholds: {
        ...this.data.systemSettings.alertThresholds,
        ...(settings.alertThresholds || {}),
      },
    };
    this.logAudit(user, 'CẬP_NHẬT_CẤU_HÌNH', 'HỆ_THỐNG', 'Cập nhật ngưỡng cảnh báo và cấu hình hệ thống');
    this.persist();
    this.runAlertEngine();
    return this.data.systemSettings;
  }

  public resetToSeed(user: any): boolean {
    this.data = {
      users: [...initialUsers],
      subjects: [...initialSubjects],
      classes: [...initialClasses],
      students: [...initialStudents],
      assignments: [...initialAssignments],
      submissions: [...initialSubmissions],
      assessments: [...initialAssessments],
      assessmentResults: [...initialAssessmentResults],
      alerts: [...initialAlerts],
      systemSettings: { ...initialSystemSettings },
      auditLogs: [...initialAuditLogs],
    };
    this.logAudit(user, 'KHÔI_PHỤC_DỮ_LIỆU_GỐC', 'HỆ_THỐNG', 'Khôi phục toàn bộ cơ sở dữ liệu về trạng thái mẫu ban đầu');
    this.persist();
    return true;
  }
}

export const db = new Database();
