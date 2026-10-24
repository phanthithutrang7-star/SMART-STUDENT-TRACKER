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
} from '../types/index.ts';
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
} from '../data/seedData.ts';

const STORAGE_KEY = 'smart_student_tracker_client_db_v2';

export interface ClientDatabaseSchema {
  users: User[];
  currentUser: User;
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

class ClientStorageDatabase {
  private data: ClientDatabaseSchema;

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): ClientDatabaseSchema {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.students && parsed.assessments && parsed.assessmentResults) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial seed data', e);
    }

    const seeded: ClientDatabaseSchema = {
      users: [...initialUsers],
      currentUser: initialUsers[1] || initialUsers[0],
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
    this.save(seeded);
    return seeded;
  }

  private save(data?: ClientDatabaseSchema) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data || this.data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  private logAudit(action: string, module: string, details: string) {
    const user = this.data.currentUser;
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      module,
      details,
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 300) {
      this.data.auditLogs.pop();
    }
  }

  // --- Auth ---
  public getUsers() {
    return { users: this.data.users, currentUser: this.data.currentUser };
  }

  public switchUser(userId: string) {
    const u = this.data.users.find((x) => x.id === userId);
    if (u) {
      this.data.currentUser = u;
      this.save();
      return { success: true, currentUser: u };
    }
    throw new Error('Không tìm thấy người dùng');
  }

  // --- Classes ---
  public getClasses() {
    return this.data.classes;
  }

  public createClass(cls: Partial<ClassGroup>) {
    const newClass: ClassGroup = {
      id: `cls_${Date.now()}`,
      code: cls.code || 'LỚP_MỚI',
      name: cls.name || 'Lớp mới',
      gradeLevel: cls.gradeLevel || 10,
      homeroomTeacher: cls.homeroomTeacher || 'Đang phân công',
      academicYear: cls.academicYear || '2025-2026',
      status: 'ACTIVE',
    };
    this.data.classes.push(newClass);
    this.logAudit('TẠO_LỚP_HỌC', 'QUẢN_LÝ_LỚP', `Tạo lớp học ${newClass.name}`);
    this.save();
    return newClass;
  }

  public updateClass(id: string, cls: Partial<ClassGroup>) {
    const idx = this.data.classes.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Không tìm thấy lớp học');
    this.data.classes[idx] = { ...this.data.classes[idx], ...cls };
    this.logAudit('CẬP_NHẬT_LỚP_HỌC', 'QUẢN_LÝ_LỚP', `Cập nhật thông tin lớp ${this.data.classes[idx].name}`);
    this.save();
    return this.data.classes[idx];
  }

  public deleteClass(id: string) {
    const c = this.data.classes.find((x) => x.id === id);
    if (!c) throw new Error('Không tìm thấy lớp học');
    this.data.classes = this.data.classes.filter((x) => x.id !== id);
    this.logAudit('XÓA_LỚP_HỌC', 'QUẢN_LÝ_LỚP', `Xóa lớp học ${c.name}`);
    this.save();
    return { success: true, message: 'Đã xóa lớp học thành công' };
  }

  // --- Students ---
  public getStudents(params?: { classId?: string; search?: string; status?: string }) {
    return this.data.students.filter((s) => {
      if (params?.classId && s.classId !== params.classId) return false;
      if (params?.status && s.status !== params.status) return false;
      if (params?.search) {
        const q = params.search.toLowerCase();
        const matchCode = s.studentCode.toLowerCase().includes(q);
        const matchName = s.fullName.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }
      return true;
    });
  }

  public createStudent(st: Partial<Student>) {
    const now = new Date().toISOString();
    const newStudent: Student = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentCode: st.studentCode || `HS${Date.now()}`,
      fullName: st.fullName || 'Học sinh mới',
      gender: st.gender || 'Nam',
      birthDate: st.birthDate || '2009-01-01',
      classId: st.classId || (this.data.classes[0]?.id || 'cls_10a1'),
      email: st.email || '',
      phone: st.phone || '',
      parentName: st.parentName || '',
      parentPhone: st.parentPhone || '',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    this.data.students.push(newStudent);

    // Initialize assessment results for active assessments of this class
    const classAssessments = this.data.assessments.filter((a) => a.classId === newStudent.classId);
    for (const asm of classAssessments) {
      this.data.assessmentResults.push({
        id: `res_${asm.id}_${newStudent.id}`,
        assessmentId: asm.id,
        studentId: newStudent.id,
        score: null,
        adjustmentHistory: [],
        updatedAt: new Date().toISOString(),
      });
    }

    this.logAudit('THÊM_HỌC_SINH', 'HỌC_SINH', `Thêm học sinh ${newStudent.fullName} (${newStudent.studentCode})`);
    this.save();
    return newStudent;
  }

  public updateStudent(id: string, st: Partial<Student>) {
    const idx = this.data.students.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Không tìm thấy học sinh');
    this.data.students[idx] = { ...this.data.students[idx], ...st, updatedAt: new Date().toISOString() };
    this.logAudit('CẬP_NHẬT_HỌC_SINH', 'HỌC_SINH', `Cập nhật thông tin học sinh ${this.data.students[idx].fullName}`);
    this.save();
    return this.data.students[idx];
  }

  public deleteStudent(id: string) {
    const s = this.data.students.find((x) => x.id === id);
    if (!s) throw new Error('Không tìm thấy học sinh');
    this.data.students = this.data.students.filter((x) => x.id !== id);
    this.data.assessmentResults = this.data.assessmentResults.filter((r) => r.studentId !== id);
    this.data.submissions = this.data.submissions.filter((sub) => sub.studentId !== id);
    this.logAudit('XÓA_HỌC_SINH', 'HỌC_SINH', `Xóa học sinh ${s.fullName} (${s.studentCode})`);
    this.save();
    return { success: true, message: 'Đã xóa học sinh thành công' };
  }

  public transferStudent(id: string, toClassId: string, reason: string) {
    const s = this.data.students.find((x) => x.id === id);
    if (!s) throw new Error('Không tìm thấy học sinh');
    const oldClass = this.data.classes.find((c) => c.id === s.classId)?.name || s.classId;
    const newClass = this.data.classes.find((c) => c.id === toClassId)?.name || toClassId;
    s.classId = toClassId;
    this.logAudit('CHUYỂN_LỚP', 'HỌC_SINH', `Chuyển học sinh ${s.fullName} từ ${oldClass} sang ${newClass}. Lý do: ${reason}`);
    this.save();
    return s;
  }

  // --- Subjects ---
  public getSubjects() {
    return this.data.subjects;
  }

  // --- Assignments ---
  public getAssignments(params?: { classId?: string; subjectId?: string; status?: string }) {
    return this.data.assignments.filter((a) => {
      if (params?.classId && !a.classIds.includes(params.classId)) return false;
      if (params?.subjectId && a.subjectId !== params.subjectId) return false;
      if (params?.status && a.status !== params.status) return false;
      return true;
    });
  }

  public createAssignment(asg: Partial<Assignment>) {
    const now = new Date().toISOString();
    const item: Assignment = {
      id: `asg_${Date.now()}`,
      title: asg.title || 'Bài tập mới',
      description: asg.description || '',
      subjectId: asg.subjectId || this.data.subjects[0]?.id || 'sub_math',
      classIds: asg.classIds || [this.data.classes[0]?.id || 'cls_10a1'],
      assignedDate: asg.assignedDate || now.slice(0, 10),
      dueDate: asg.dueDate || now,
      maxScore: asg.maxScore || 10,
      status: (asg.status as any) || 'ACTIVE',
      createdBy: this.data.currentUser.name,
      createdAt: now,
    };
    this.data.assignments.push(item);
    this.logAudit('TẠO_BÀI_TẬP', 'BÀI_TẬP', `Tạo bài tập ${item.title}`);
    this.save();
    return item;
  }

  public updateAssignment(id: string, asg: Partial<Assignment>) {
    const idx = this.data.assignments.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Không tìm thấy bài tập');
    this.data.assignments[idx] = { ...this.data.assignments[idx], ...asg };
    this.logAudit('CẬP_NHẬT_BÀI_TẬP', 'BÀI_TẬP', `Cập nhật bài tập ${this.data.assignments[idx].title}`);
    this.save();
    return this.data.assignments[idx];
  }

  public deleteAssignment(id: string) {
    const asg = this.data.assignments.find((x) => x.id === id);
    if (!asg) throw new Error('Không tìm thấy bài tập');
    this.data.assignments = this.data.assignments.filter((x) => x.id !== id);
    this.data.submissions = this.data.submissions.filter((s) => s.assignmentId !== id);
    this.logAudit('XÓA_BÀI_TẬP', 'BÀI_TẬP', `Xóa bài tập ${asg.title}`);
    this.save();
    return { success: true, message: 'Đã xóa bài tập thành công' };
  }

  // --- Submissions ---
  public getSubmissions(params?: { assignmentId?: string; studentId?: string; classId?: string; status?: string }) {
    return this.data.submissions.filter((s) => {
      if (params?.assignmentId && s.assignmentId !== params.assignmentId) return false;
      if (params?.studentId && s.studentId !== params.studentId) return false;
      if (params?.status && s.submissionStatus !== params.status) return false;
      return true;
    });
  }

  public updateSubmission(id: string, updates: any) {
    const idx = this.data.submissions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Không tìm thấy bài nộp');
    this.data.submissions[idx] = { ...this.data.submissions[idx], ...updates };
    this.save();
    return this.data.submissions[idx];
  }

  public batchUpdateSubmissions(submissionIds: string[], status: string, feedback?: string) {
    const updatedList: AssignmentSubmission[] = [];
    for (const sid of submissionIds) {
      const idx = this.data.submissions.findIndex((s) => s.id === sid);
      if (idx !== -1) {
        this.data.submissions[idx] = {
          ...this.data.submissions[idx],
          submissionStatus: status as any,
          ...(feedback ? { feedback } : {}),
        };
        updatedList.push(this.data.submissions[idx]);
      }
    }
    this.save();
    return { updatedCount: updatedList.length, submissions: updatedList };
  }

  // --- Assessments & Results ---
  public getAssessments(params?: { classId?: string; subjectId?: string }) {
    return this.data.assessments.filter((a) => {
      if (params?.classId && a.classId !== params.classId) return false;
      if (params?.subjectId && a.subjectId !== params.subjectId) return false;
      return true;
    });
  }

  public createAssessment(asm: Partial<Assessment>) {
    const item: Assessment = {
      id: `asm_${Date.now()}`,
      title: asm.title || 'Bài kiểm tra mới',
      type: asm.type || '15_MIN',
      subjectId: asm.subjectId || this.data.subjects[0]?.id || 'sub_math',
      classId: asm.classId || this.data.classes[0]?.id || 'cls_10a1',
      date: asm.date || new Date().toISOString().slice(0, 10),
      maxScore: asm.maxScore || 10,
      weight: asm.weight || 1,
    };
    this.data.assessments.push(item);

    // Create blank results for all students in that class
    const studentsInClass = this.data.students.filter((s) => s.classId === item.classId && s.status === 'ACTIVE');
    for (const s of studentsInClass) {
      this.data.assessmentResults.push({
        id: `res_${item.id}_${s.id}`,
        assessmentId: item.id,
        studentId: s.id,
        score: null,
        adjustmentHistory: [],
        updatedAt: new Date().toISOString(),
      });
    }

    this.logAudit('TẠO_BÀI_ĐÁNH_GIÁ', 'KẾT_QUẢ_ĐÁNH_GIÁ', `Tạo bài đánh giá "${item.title}"`);
    this.save();
    return item;
  }

  public updateAssessment(id: string, asm: Partial<Assessment>) {
    const idx = this.data.assessments.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Không tìm thấy bài đánh giá');
    this.data.assessments[idx] = { ...this.data.assessments[idx], ...asm };
    this.logAudit('CẬP_NHẬT_BÀI_ĐÁNH_GIÁ', 'KẾT_QUẢ_ĐÁNH_GIÁ', `Cập nhật bài đánh giá "${this.data.assessments[idx].title}"`);
    this.save();
    return this.data.assessments[idx];
  }

  public deleteAssessment(id: string) {
    const asm = this.data.assessments.find((x) => x.id === id);
    if (!asm) throw new Error('Không tìm thấy bài đánh giá');
    this.data.assessments = this.data.assessments.filter((x) => x.id !== id);
    this.data.assessmentResults = this.data.assessmentResults.filter((r) => r.assessmentId !== id);
    this.logAudit('XÓA_BÀI_ĐÁNH_GIÁ', 'KẾT_QUẢ_ĐÁNH_GIÁ', `Xóa bài đánh giá "${asm.title}"`);
    this.save();
    return { success: true, message: 'Đã xóa bài đánh giá thành công' };
  }

  public getAssessmentResults(params?: { assessmentId?: string; studentId?: string }) {
    return this.data.assessmentResults.filter((r) => {
      if (params?.assessmentId && r.assessmentId !== params.assessmentId) return false;
      if (params?.studentId && r.studentId !== params.studentId) return false;
      return true;
    });
  }

  public updateAssessmentResult(id: string, score: number | null, reason: string) {
    const res = this.data.assessmentResults.find((r) => r.id === id);
    if (!res) throw new Error('Không tìm thấy kết quả đánh giá');

    if (score !== null && (score < 0 || score > 10)) {
      throw new Error('Điểm số phải trong khoảng từ 0.0 đến 10.0');
    }

    const oldScore = res.score;
    if (oldScore !== score) {
      res.adjustmentHistory.push({
        changedAt: new Date().toISOString(),
        changedBy: this.data.currentUser.name,
        oldScore,
        newScore: score,
        reason: reason || 'Điều chỉnh điểm số',
      });
    }

    res.score = score;
    res.updatedAt = new Date().toISOString();
    this.save();
    return res;
  }

  // --- Grade Import & Preview Engine ---
  public previewImportScores(assessmentId: string, rawRows: any[]) {
    const assessment = this.data.assessments.find((a) => a.id === assessmentId);
    if (!assessment) {
      throw new Error('Không tìm thấy bài đánh giá cần nhập điểm');
    }

    const studentsInClass = this.data.students.filter((s) => s.classId === assessment.classId && s.status === 'ACTIVE');
    const previewRows: any[] = [];
    const seenCodes = new Set<string>();

    for (let i = 0; i < (rawRows || []).length; i++) {
      const row = rawRows[i];

      // Flexible property lookup
      const findVal = (targets: string[]) => {
        for (const k of Object.keys(row)) {
          const norm = k.trim().toLowerCase().replace(/[\s_\-.]+/g, '');
          for (const t of targets) {
            if (norm === t.toLowerCase().replace(/[\s_\-.]+/g, '')) {
              return row[k];
            }
          }
        }
        return undefined;
      };

      const rawCode = findVal(['studentCode', 'mahs', 'mahocsinh', 'mã học sinh', 'mã hs', 'mssv', 'code', 'id']) ?? row.studentCode ?? '';
      const code = String(rawCode).trim();

      const rawScoreVal = findVal(['score', 'diem', 'điểm', 'diemso', 'điểm số', 'grade', 'diemkiemtra']) ?? row.score;
      let rawScore = rawScoreVal !== undefined && rawScoreVal !== null ? String(rawScoreVal).trim() : '';
      if (rawScore.includes(',')) rawScore = rawScore.replace(',', '.');

      const rawNoteVal = findVal(['note', 'ghichu', 'ghi chú', 'nhanxet', 'nhận xét']) ?? row.note ?? '';
      const note = String(rawNoteVal).trim();

      const errors: string[] = [];
      if (!code) {
        errors.push('Thiếu mã định danh học sinh');
      }

      let matchedStudent = undefined;
      if (code) {
        const upper = code.toUpperCase();
        matchedStudent = studentsInClass.find((s) => s.studentCode.toUpperCase() === upper);
        if (!matchedStudent) {
          // Check if student belongs to another class
          const existsOther = this.data.students.find((s) => s.studentCode.toUpperCase() === upper);
          if (existsOther) {
            errors.push(`Mã HS '${code}' thuộc lớp khác (${existsOther.classId}), không thuộc lớp của bài kiểm tra`);
          } else {
            errors.push(`Mã HS '${code}' không tồn tại trong hệ thống`);
          }
        }
        if (seenCodes.has(upper)) {
          errors.push(`Mã HS '${code}' bị trùng lặp trong tệp điểm`);
        }
        seenCodes.add(upper);
      }

      let parsedScore: number | null = null;
      if (rawScore !== '') {
        const num = Number(rawScore);
        if (isNaN(num)) {
          errors.push(`Điểm '${rawScore}' không phải số hợp lệ`);
        } else if (num < 0 || num > 10) {
          errors.push(`Điểm ${num} ngoài thang điểm 0 - 10`);
        } else {
          parsedScore = Math.round(num * 10) / 10;
        }
      }

      previewRows.push({
        rowNumber: i + 1,
        studentCode: code,
        fullName: matchedStudent?.fullName || row.fullName || '—',
        score: parsedScore,
        rawScore,
        note,
        isValid: errors.length === 0,
        errors,
      });
    }

    const validCount = previewRows.filter((r) => r.isValid).length;
    return {
      totalRows: previewRows.length,
      validCount,
      errorCount: previewRows.length - validCount,
      rows: previewRows,
      assessmentTitle: assessment.title,
    };
  }

  public executeImportScores(assessmentId: string, rows: any[]) {
    const assessment = this.data.assessments.find((a) => a.id === assessmentId);
    if (!assessment) throw new Error('Không tìm thấy bài đánh giá');

    let successCount = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const student = this.data.students.find(
        (s) => s.studentCode.toUpperCase() === String(row.studentCode).trim().toUpperCase()
      );

      if (!student) {
        errors.push(`Không tìm thấy học sinh mã ${row.studentCode}`);
        continue;
      }

      let score: number | null = null;
      if (row.score !== null && row.score !== undefined && row.score !== '') {
        const num = Number(row.score);
        if (isNaN(num) || num < 0 || num > 10) {
          errors.push(`Điểm ${row.score} của học sinh ${row.studentCode} không hợp lệ`);
          continue;
        }
        score = Math.round(num * 10) / 10;
      }

      let res = this.data.assessmentResults.find(
        (r) => r.assessmentId === assessmentId && r.studentId === student.id
      );

      if (!res) {
        res = {
          id: `res_${assessmentId}_${student.id}`,
          assessmentId,
          studentId: student.id,
          score,
          note: row.note || 'Nhập từ tệp Excel/CSV',
          adjustmentHistory: [
            {
              changedAt: new Date().toISOString(),
              changedBy: this.data.currentUser.name,
              oldScore: null,
              newScore: score,
              reason: 'Nhập điểm từ tệp Excel/CSV',
            },
          ],
          updatedAt: new Date().toISOString(),
        };
        this.data.assessmentResults.push(res);
      } else {
        const oldScore = res.score;
        if (oldScore !== score) {
          res.adjustmentHistory.push({
            changedAt: new Date().toISOString(),
            changedBy: this.data.currentUser.name,
            oldScore,
            newScore: score,
            reason: row.note || 'Cập nhật từ tệp Excel/CSV',
          });
        }
        res.score = score;
        res.note = row.note || res.note;
        res.updatedAt = new Date().toISOString();
      }
      successCount++;
    }

    this.logAudit(
      'NHẬP_ĐIỂM_TỪ_FILE',
      'KẾT_QUẢ_ĐÁNH_GIÁ',
      `Nhập điểm cho bài kiểm tra "${assessment.title}": ${successCount} thành công, ${errors.length} lỗi`
    );
    this.save();

    return {
      success: true,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  // --- Student Roster Batch Import ---
  public previewStudentImport(rawRows: any[]) {
    const previewRows: any[] = [];
    const seenCodes = new Set<string>();

    for (let i = 0; i < (rawRows || []).length; i++) {
      const row = rawRows[i];
      const code = String(row.studentCode || '').trim();
      const fullName = String(row.fullName || '').trim();
      const classCode = String(row.classCode || '').trim().toUpperCase();

      const errors: string[] = [];
      if (!code) errors.push('Thiếu mã học sinh');
      if (!fullName) errors.push('Thiếu họ và tên');

      if (code) {
        const upper = code.toUpperCase();
        if (seenCodes.has(upper)) {
          errors.push(`Mã học sinh '${code}' bị trùng trong tệp`);
        }
        seenCodes.add(upper);

        const existsInDb = this.data.students.some((s) => s.studentCode.toUpperCase() === upper);
        if (existsInDb) {
          errors.push(`Mã học sinh '${code}' đã tồn tại trong hệ thống`);
        }
      }

      previewRows.push({
        rowNumber: i + 1,
        studentCode: code,
        fullName,
        gender: row.gender || 'Nam',
        birthDate: row.birthDate || '2009-01-01',
        classCode: classCode || '10A1',
        email: row.email || `${code.toLowerCase()}@smarttracker.edu.vn`,
        phone: row.phone || '',
        parentName: row.parentName || '',
        parentPhone: row.parentPhone || '',
        isValid: errors.length === 0,
        errors,
      });
    }

    const validCount = previewRows.filter((r) => r.isValid).length;
    return {
      totalRows: previewRows.length,
      validCount,
      errorCount: previewRows.length - validCount,
      rows: previewRows,
    };
  }

  public executeStudentImport(rows: any[]) {
    let successCount = 0;
    const errors: string[] = [];

    for (const r of rows) {
      try {
        let cls = this.data.classes.find(
          (c) => c.code.toUpperCase() === String(r.classCode).toUpperCase()
        );
        if (!cls) {
          cls = this.createClass({
            code: r.classCode,
            name: `Lớp ${r.classCode}`,
            gradeLevel: 10,
          });
        }
        this.createStudent({
          studentCode: r.studentCode,
          fullName: r.fullName,
          gender: r.gender,
          birthDate: r.birthDate,
          classId: cls.id,
          email: r.email,
          phone: r.phone,
          parentName: r.parentName,
          parentPhone: r.parentPhone,
        });
        successCount++;
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    this.save();
    return {
      success: true,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  // --- Student Detail & Analytics ---
  public getStudentDetail(id: string) {
    const student = this.data.students.find((s) => s.id === id);
    if (!student) throw new Error('Không tìm thấy học sinh');

    const submissions = this.data.submissions.filter((s) => s.studentId === id);
    const results = this.data.assessmentResults.filter((r) => r.studentId === id);
    const alerts = this.data.alerts.filter((a) => a.studentId === id);

    const validScores = results.map((r) => r.score).filter((s): s is number => s !== null);
    const avgScore =
      validScores.length > 0
        ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
        : null;

    const completedSubs = submissions.filter((s) => s.submissionStatus === 'COMPLETED').length;
    const lateSubs = submissions.filter((s) => s.submissionStatus === 'LATE_SUBMITTED').length;
    const overdueSubs = submissions.filter((s) => {
      const asg = this.data.assignments.find((a) => a.id === s.assignmentId);
      const isPast = asg?.dueDate ? new Date(asg.dueDate) < new Date() : false;
      return s.submissionStatus === 'NOT_STARTED' && isPast;
    }).length;

    const analytics: StudentAnalytics = {
      studentId: id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      classId: student.classId,
      className: this.data.classes.find((c) => c.id === student.classId)?.name || student.classId,
      totalAssignmentsAssigned: submissions.length,
      completedAssignments: completedSubs,
      exemptAssignments: 0,
      overdueAssignments: overdueSubs,
      lateSubmittedAssignments: lateSubs,
      completionRate: submissions.length > 0 ? Math.round((completedSubs / submissions.length) * 1000) / 10 : 100,
      onTimeRate: completedSubs > 0 ? Math.round(((completedSubs - lateSubs) / completedSubs) * 1000) / 10 : 100,
      averageScore: avgScore,
      scoreTrend: 'STABLE',
      trendExplanation: 'Học lực duy trì ổn định.',
      riskFlags: [],
    };

    return {
      student,
      analytics,
      submissions,
      results,
      alerts,
    };
  }

  // --- Dashboard Metrics ---
  public getDashboardMetrics(classId?: string): DashboardMetrics {
    const students = this.data.students.filter((s) => s.status === 'ACTIVE' && (!classId || s.classId === classId));
    const classes = this.data.classes.filter((c) => c.status === 'ACTIVE' && (!classId || c.id === classId));
    const assignments = this.data.assignments.filter((a) => !classId || a.classIds.includes(classId));

    let totalCompleted = 0;
    let totalAssigned = 0;
    let totalUnsubmitted = 0;
    let totalLate = 0;

    for (const sub of this.data.submissions) {
      if (classId) {
        const st = this.data.students.find((s) => s.id === sub.studentId);
        if (st?.classId !== classId) continue;
      }
      totalAssigned++;
      if (sub.submissionStatus === 'COMPLETED') totalCompleted++;
      if (sub.submissionStatus === 'LATE_SUBMITTED') totalLate++;
      const asg = assignments.find((a) => a.id === sub.assignmentId);
      const isPast = asg?.dueDate ? new Date(asg.dueDate) < new Date() : false;
      if (sub.submissionStatus === 'NOT_STARTED' && isPast) totalUnsubmitted++;
    }

    const overallCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 1000) / 10 : 100;
    const overallOnTimeRate = totalCompleted > 0 ? Math.round(((totalCompleted - totalLate) / totalCompleted) * 1000) / 10 : 100;

    const classResults = this.data.assessmentResults.filter((r) => {
      if (!classId) return true;
      const st = this.data.students.find((s) => s.id === r.studentId);
      return st?.classId === classId;
    });
    const validScores = classResults.map((r) => r.score).filter((s): s is number => s !== null);
    const averageGrade =
      validScores.length > 0
        ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
        : null;

    const openAlerts = this.data.alerts.filter(
      (a) => (a.status === 'OPEN' || a.status === 'REVIEWING') && (!classId || a.classId === classId)
    );

    return {
      totalStudents: students.length,
      totalClasses: classes.length,
      totalAssignments: assignments.length,
      overallCompletionRate,
      overallOnTimeRate,
      unsubmittedCount: totalUnsubmitted,
      lateSubmittedCount: totalLate,
      averageGrade,
      decliningTrendCount: 2,
      attentionCasesCount: openAlerts.length,
      openAlertsCount: openAlerts.length,
    };
  }

  // --- Alerts ---
  public getAlerts(params?: { classId?: string; studentId?: string; status?: string }) {
    return this.data.alerts.filter((a) => {
      if (params?.classId && a.classId !== params.classId) return false;
      if (params?.studentId && a.studentId !== params.studentId) return false;
      if (params?.status && a.status !== params.status) return false;
      return true;
    });
  }

  public updateAlertStatus(id: string, status: Alert['status'], note?: string) {
    const a = this.data.alerts.find((x) => x.id === id);
    if (!a) throw new Error('Không tìm thấy cảnh báo');
    a.status = status;
    if (note) {
      if (!a.teacherNotes) a.teacherNotes = [];
      a.teacherNotes.push({
        date: new Date().toISOString(),
        author: this.data.currentUser.name,
        content: note,
      });
    }
    a.resolvedAt = status === 'RESOLVED' ? new Date().toISOString() : a.resolvedAt;
    this.save();
    return a;
  }

  // --- Settings & Audit ---
  public getSystemSettings() {
    return this.data.systemSettings;
  }

  public updateSystemSettings(settings: Partial<SystemSettings>) {
    this.data.systemSettings = { ...this.data.systemSettings, ...settings };
    this.save();
    return this.data.systemSettings;
  }

  public getAuditLogs() {
    return this.data.auditLogs;
  }
}

export const clientStorageDb = new ClientStorageDatabase();
