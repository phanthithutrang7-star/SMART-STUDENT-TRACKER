import express from 'express';
import { db } from '../db/database.ts';
import { processAiTask } from '../services/geminiService.ts';

const router = express.Router();

// Current session user helper (RBAC context)
let currentUser = db.getUsers()[0]; // Default: Admin Minh

// Middleware to extract current user
router.use((req, res, next) => {
  (req as any).user = currentUser;
  next();
});

// --- AUTH & ROLES ---
router.get('/auth/users', (req, res) => {
  res.json({
    users: db.getUsers(),
    currentUser,
  });
});

router.post('/auth/switch', (req, res) => {
  const { userId } = req.body;
  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  }
  currentUser = user;
  db.logAudit(currentUser, 'CHUYỂN_VAI_TRÒ', 'XÁC_THỰC', `Chuyển phiên làm việc sang: ${currentUser.name} (${currentUser.role})`);
  res.json({ success: true, currentUser });
});

// --- CLASSES ---
router.get('/classes', (req, res) => {
  const classes = db.getClasses();
  res.json(classes);
});

router.post('/classes', (req, res) => {
  try {
    const cls = db.createClass(req.body, currentUser);
    res.json(cls);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/classes/:id', (req, res) => {
  try {
    const updated = db.updateClass(req.params.id, req.body, currentUser);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/classes/:id', (req, res) => {
  try {
    const success = db.deleteClass(req.params.id, currentUser);
    if (!success) return res.status(404).json({ error: 'Không tìm thấy lớp học' });
    res.json({ success: true, message: 'Đã xóa lớp học thành công' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// --- STUDENTS ---
router.get('/students', (req, res) => {
  const { classId, search, status } = req.query as { classId?: string; search?: string; status?: string };
  const students = db.getStudents({ classId, search, status });
  res.json(students);
});

router.get('/students/:id', (req, res) => {
  const student = db.getStudentById(req.params.id);
  if (!student) return res.status(404).json({ error: 'Không tìm thấy học sinh' });
  const analytics = db.calculateStudentAnalytics(student.id);
  const submissions = db.getSubmissions({ studentId: student.id });
  const results = db.getAssessmentResults(undefined, student.id);
  const alerts = db.getAlerts().filter((a) => a.studentId === student.id);
  res.json({ student, analytics, submissions, results, alerts });
});

router.post('/students', (req, res) => {
  try {
    const student = db.createStudent(req.body, currentUser);
    res.json(student);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/students/:id', (req, res) => {
  try {
    const student = db.updateStudent(req.params.id, req.body, currentUser);
    if (!student) return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    res.json(student);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/students/:id', (req, res) => {
  try {
    const success = db.deleteStudent(req.params.id, currentUser);
    if (!success) return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    res.json({ success: true, message: 'Đã xóa học sinh thành công' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/students/:id/transfer', (req, res) => {
  try {
    const { toClassId, reason } = req.body;
    if (!toClassId || !reason) {
      return res.status(400).json({ error: 'Vui lòng cung cấp lớp đích và lý do chuyển lớp' });
    }
    const student = db.transferStudent(req.params.id, toClassId, reason, currentUser);
    if (!student) return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    res.json(student);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// --- SUBJECTS ---
router.get('/subjects', (req, res) => {
  res.json(db.getSubjects());
});

// --- ASSIGNMENTS ---
router.get('/assignments', (req, res) => {
  const { classId, subjectId, status } = req.query as { classId?: string; subjectId?: string; status?: string };
  const assignments = db.getAssignments({ classId, subjectId, status });
  res.json(assignments);
});

router.post('/assignments', (req, res) => {
  try {
    const assignment = db.createAssignment(req.body, currentUser);
    res.json(assignment);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/assignments/:id', (req, res) => {
  try {
    const updated = db.updateAssignment(req.params.id, req.body, currentUser);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy bài tập' });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/assignments/:id', (req, res) => {
  try {
    const success = db.deleteAssignment(req.params.id, currentUser);
    if (!success) return res.status(404).json({ error: 'Không tìm thấy bài tập' });
    res.json({ success: true, message: 'Đã xóa bài tập thành công' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// --- SUBMISSIONS & TRACKING ---
router.get('/submissions', (req, res) => {
  const { assignmentId, studentId, classId, status } = req.query as {
    assignmentId?: string;
    studentId?: string;
    classId?: string;
    status?: string;
  };
  const list = db.getSubmissions({ assignmentId, studentId, classId, status });
  res.json(list);
});

router.put('/submissions/:id', (req, res) => {
  try {
    const updated = db.updateSubmission(req.params.id, req.body, currentUser);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy bản ghi bài nộp' });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/submissions/batch-update', (req, res) => {
  try {
    const { submissionIds, status, feedback } = req.body;
    if (!Array.isArray(submissionIds)) {
      return res.status(400).json({ error: 'Danh sách submissionIds không hợp lệ' });
    }
    const updatedList = [];
    for (const sid of submissionIds) {
      const u = db.updateSubmission(sid, { submissionStatus: status, feedback }, currentUser);
      if (u) updatedList.push(u);
    }
    res.json({ updatedCount: updatedList.length, submissions: updatedList });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// --- ASSESSMENTS & RESULTS ---
router.get('/assessments', (req, res) => {
  const { classId, subjectId } = req.query as { classId?: string; subjectId?: string };
  res.json(db.getAssessments({ classId, subjectId }));
});

router.post('/assessments', (req, res) => {
  try {
    const item = db.createAssessment(req.body, currentUser);
    res.json(item);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/assessments/:id', (req, res) => {
  try {
    const updated = db.updateAssessment(req.params.id, req.body, currentUser);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy bài đánh giá' });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/assessments/:id', (req, res) => {
  try {
    const success = db.deleteAssessment(req.params.id, currentUser);
    if (!success) return res.status(404).json({ error: 'Không tìm thấy bài đánh giá' });
    res.json({ success: true, message: 'Đã xóa bài đánh giá thành công' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/assessments/results', (req, res) => {
  const { assessmentId, studentId } = req.query as { assessmentId?: string; studentId?: string };
  res.json(db.getAssessmentResults(assessmentId, studentId));
});

router.put('/assessments/results/:id', (req, res) => {
  try {
    const { score, reason } = req.body;
    const updated = db.updateAssessmentResult(req.params.id, score, reason, currentUser);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy kết quả đánh giá' });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/assessments/preview-import-scores', (req, res) => {
  try {
    const { assessmentId, rawRows } = req.body;
    if (!assessmentId) {
      return res.status(400).json({ error: 'Thiếu mã bài đánh giá (assessmentId)' });
    }
    const assessment = db.getAssessments().find((a) => a.id === assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: 'Không tìm thấy bài đánh giá' });
    }

    const studentsInClass = db.getStudents({ classId: assessment.classId, status: 'ACTIVE' });
    const previewRows: any[] = [];
    const seenCodes = new Set<string>();

    for (let i = 0; i < (rawRows || []).length; i++) {
      const row = rawRows[i];

      // Flexible key lookup
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

      const rawCode = findVal(['studentCode', 'mahs', 'mahocsinh', 'mã học sinh', 'mã hs']) ?? row.studentCode ?? '';
      const code = String(rawCode).trim();

      const rawScoreVal = findVal(['score', 'diem', 'điểm', 'diemso', 'điểm số', 'grade']) ?? row.score;
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
          errors.push(`Mã HS '${code}' không thuộc lớp của bài kiểm tra này`);
        }
        if (seenCodes.has(upper)) {
          errors.push(`Mã HS '${code}' bị trùng lặp trong tệp`);
        }
        seenCodes.add(upper);
      }

      let parsedScore: number | null = null;
      if (rawScore !== '') {
        const num = Number(rawScore);
        if (isNaN(num)) {
          errors.push(`Điểm '${rawScore}' không phải số hợp lệ`);
        } else if (num < 0 || num > 10) {
          errors.push(`Điểm ${num} vượt quá thang điểm 0 - 10`);
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
    res.json({
      totalRows: previewRows.length,
      validCount,
      errorCount: previewRows.length - validCount,
      rows: previewRows,
      assessmentTitle: assessment.title,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/assessments/import-scores', (req, res) => {
  try {
    const { assessmentId, rows } = req.body;
    if (!assessmentId || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Dữ liệu nhập điểm không hợp lệ' });
    }
    const result = db.importAssessmentScores(assessmentId, rows, currentUser);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// --- ANALYTICS & DASHBOARD ---
router.get('/analytics/dashboard', (req, res) => {
  const { classId } = req.query as { classId?: string };
  const metrics = db.getDashboardMetrics(classId);
  res.json(metrics);
});

router.get('/analytics/student/:id', (req, res) => {
  const { subjectId } = req.query as { subjectId?: string };
  const ana = db.calculateStudentAnalytics(req.params.id, subjectId);
  if (!ana) return res.status(404).json({ error: 'Không tìm thấy học sinh' });
  res.json(ana);
});

router.get('/analytics/classes', (req, res) => {
  const classes = db.getClasses();
  const summary = classes.map((c) => {
    const m = db.getDashboardMetrics(c.id);
    return {
      class: c,
      metrics: m,
    };
  });
  res.json(summary);
});

// --- ALERTS & INTERVENTIONS ---
router.get('/alerts', (req, res) => {
  const { classId, priority, status } = req.query as { classId?: string; priority?: string; status?: string };
  res.json(db.getAlerts({ classId, priority, status }));
});

router.post('/alerts', (req, res) => {
  try {
    const alert = db.createAlert(req.body, currentUser);
    res.json(alert);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/alerts/:id', (req, res) => {
  try {
    const updated = db.updateAlert(req.params.id, req.body, currentUser);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy cảnh báo' });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/alerts/:id', (req, res) => {
  try {
    const success = db.deleteAlert(req.params.id, currentUser);
    if (!success) return res.status(404).json({ error: 'Không tìm thấy cảnh báo' });
    res.json({ success: true, message: 'Đã xóa cảnh báo thành công' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/alerts/evaluate', (req, res) => {
  db.runAlertEngine();
  res.json({ success: true, alerts: db.getAlerts() });
});

// --- AI ASSISTANT ---
router.post('/ai/task', async (req, res) => {
  try {
    const result = await processAiTask(req.body, currentUser);
    db.logAudit(currentUser, 'SỬ_DỤNG_TRỢ_LÝ_AI', 'AI_ASSISTANT', `Thực thi tác vụ AI: ${req.body.action}`);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- IMPORT & EXPORT ---
router.post('/import/preview', (req, res) => {
  try {
    const { rawRows } = req.body;
    if (!Array.isArray(rawRows)) {
      return res.status(400).json({ error: 'Dữ liệu tải lên phải là danh sách các dòng' });
    }

    const previewResults: any[] = [];
    const existingCodes = new Set(db.getStudents().map((s) => s.studentCode.trim().toUpperCase()));
    const seenInBatch = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const errors: string[] = [];

      const studentCode = (row.studentCode || '').trim();
      const fullName = (row.fullName || '').trim();
      const email = (row.email || '').trim();
      const classCode = (row.classCode || '').trim();

      if (!studentCode) errors.push('Thiếu mã học sinh');
      if (!fullName) errors.push('Thiếu họ và tên');
      if (!email || !email.includes('@')) errors.push('Email không hợp lệ');

      if (studentCode) {
        const upper = studentCode.toUpperCase();
        if (existingCodes.has(upper)) {
          errors.push(`Mã học sinh '${studentCode}' đã tồn tại trong hệ thống`);
        }
        if (seenInBatch.has(upper)) {
          errors.push(`Mã học sinh '${studentCode}' bị trùng lặp ngay trong tệp tải lên`);
        }
        seenInBatch.add(upper);
      }

      previewResults.push({
        rowNumber: i + 1,
        studentCode,
        fullName,
        gender: row.gender || 'Nam',
        birthDate: row.birthDate || '2009-01-01',
        email,
        phone: row.phone || '',
        classCode: classCode || '10A1',
        isValid: errors.length === 0,
        errors,
      });
    }

    const validCount = previewResults.filter((r) => r.isValid).length;
    res.json({
      totalRows: previewResults.length,
      validCount,
      errorCount: previewResults.length - validCount,
      rows: previewResults,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/import/execute', (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'Danh sách dòng nhập không hợp lệ' });
    }

    const classes = db.getClasses();
    const importedStudents = [];

    for (const r of rows) {
      if (!r.isValid) continue;

      let matchedClass = classes.find(
        (c) => c.code.toLowerCase() === (r.classCode || '').toLowerCase()
      );
      if (!matchedClass) matchedClass = classes[0];

      const newStudent = db.createStudent(
        {
          studentCode: r.studentCode,
          fullName: r.fullName,
          gender: r.gender === 'Nữ' ? 'Nữ' : 'Nam',
          birthDate: r.birthDate || '2009-01-01',
          classId: matchedClass.id,
          email: r.email,
          phone: r.phone || '',
          parentName: r.parentName || '',
          parentPhone: r.parentPhone || '',
          status: 'ACTIVE',
        },
        currentUser
      );
      importedStudents.push(newStudent);
    }

    db.logAudit(
      currentUser,
      'NHẬP_DỮ_LIỆU_EXCEL',
      'IMPORT_EXPORT',
      `Đã nhập thành công ${importedStudents.length} học sinh mới từ tệp dữ liệu`
    );

    res.json({ success: true, count: importedStudents.length, students: importedStudents });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/export/csv', (req, res) => {
  const { type, classId } = req.query as { type: string; classId?: string };

  let csvContent = '';
  if (type === 'students') {
    const students = db.getStudents({ classId });
    csvContent = 'Mã HS,Họ và Tên,Giới tính,Ngày sinh,Lớp,Email,SĐT Phụ huynh,Trạng thái\n';
    students.forEach((s) => {
      const cls = db.getClassById(s.classId)?.code || s.classId;
      csvContent += `"${s.studentCode}","${s.fullName}","${s.gender}","${s.birthDate}","${cls}","${s.email}","${s.parentPhone || ''}","${s.status}"\n`;
    });
  } else if (type === 'submissions') {
    const submissions = db.getSubmissions({ classId });
    csvContent = 'Mã Bài tập,Tên Bài tập,Mã HS,Họ và Tên,Trạng thái,Thời gian nộp,Điểm số\n';
    submissions.forEach((sub) => {
      const asg = db.getAssignmentById(sub.assignmentId);
      const std = db.getStudentById(sub.studentId);
      csvContent += `"${asg?.id || ''}","${asg?.title || ''}","${std?.studentCode || ''}","${std?.fullName || ''}","${sub.submissionStatus}","${sub.submittedAt || 'Chưa nộp'}","${sub.score ?? ''}"\n`;
    });
  } else {
    // Analytics overview
    const students = db.getStudents({ classId });
    csvContent = 'Mã HS,Họ và Tên,Lớp,Tỷ lệ hoàn thành (%),Tỷ lệ đúng hạn (%),Số bài quá hạn,Điểm TB,Xu hướng\n';
    students.forEach((s) => {
      const ana = db.calculateStudentAnalytics(s.id);
      if (ana) {
        csvContent += `"${ana.studentCode}","${ana.fullName}","${ana.className}","${ana.completionRate}","${ana.onTimeRate}","${ana.overdueAssignments}","${ana.averageScore ?? 'N/A'}","${ana.scoreTrend}"\n`;
      }
    });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="smart-tracker-export-${type || 'data'}-${Date.now()}.csv"`);
  res.send('\uFEFF' + csvContent); // Include UTF-8 BOM for Excel Vietnamese characters
});

// --- SYSTEM ADMIN & AUDIT LOGS ---
router.get('/admin/settings', (req, res) => {
  res.json(db.getSettings());
});

router.put('/admin/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body, currentUser);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/admin/audit-logs', (req, res) => {
  res.json(db.getAuditLogs());
});

router.post('/admin/reset-seed', (req, res) => {
  db.resetToSeed(currentUser);
  res.json({ success: true, message: 'Đã khôi phục dữ liệu mẫu ban đầu thành công' });
});

export default router;
