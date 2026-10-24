import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  Plus,
  Calendar,
  CheckCircle2,
  Edit2,
  Trash2,
  History,
  TrendingUp,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertCircle,
  XCircle,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { Assessment, AssessmentResult, Student, Subject, ClassGroup } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../common/Modal.tsx';
import { parseGradeCsv, detectAssessmentMatch } from '../../utils/csvParser.ts';
import { parseGradeExcelOrCsvFile, downloadGradeTemplateExcel } from '../../utils/excelParser.ts';

export const AssessmentsView: React.FC = () => {
  const { canGrade, selectedClassId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Score Adjustment Modal
  const [editingResult, setEditingResult] = useState<{
    res: AssessmentResult;
    studentName: string;
    asmTitle: string;
  } | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('Nhập/điều chỉnh điểm');
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);

  // Add & Edit Assessment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Assessment['type']>('15_MIN');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newClassId, setNewClassId] = useState('cls_10a1');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newWeight, setNewWeight] = useState(1);

  // Delete Assessment Modal
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
  const [isDeletingAssessment, setIsDeletingAssessment] = useState(false);

  // Import Grades Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importAssessmentId, setImportAssessmentId] = useState<string>('');
  const [importCsvText, setImportCsvText] = useState<string>('');
  const [importPreviewData, setImportPreviewData] = useState<{
    totalRows: number;
    validCount: number;
    errorCount: number;
    rows: any[];
    assessmentTitle: string;
  } | null>(null);
  const [isVerifyingImport, setIsVerifyingImport] = useState(false);
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedClassId, subjectFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [asmList, resList, stdList, subList, clsList] = await Promise.all([
        api.getAssessments({ classId: selectedClassId || undefined, subjectId: subjectFilter || undefined }),
        api.getAssessmentResults(),
        api.getStudents({ classId: selectedClassId || undefined }),
        api.getSubjects(),
        api.getClasses(),
      ]);
      setAssessments(asmList);
      setResults(resList);
      setStudents(stdList);
      setSubjects(subList);
      setClasses(clsList);
      if (subList.length > 0 && !newSubjectId) setNewSubjectId(subList[0].id);
      if (clsList.length > 0 && !newClassId) setNewClassId(clsList[0].id);
      if (asmList.length > 0 && !importAssessmentId) setImportAssessmentId(asmList[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenScoreModal = (res: AssessmentResult, studentName: string, asmTitle: string) => {
    setEditingResult({ res, studentName, asmTitle });
    setScoreInput(res.score !== null ? String(res.score) : '');
    setReasonInput('');
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResult) return;
    try {
      const parsed = scoreInput.trim() === '' ? null : Number(scoreInput);
      if (parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > 10)) {
        alert('Điểm số phải trong khoảng từ 0.0 đến 10.0');
        return;
      }

      await api.updateAssessmentResult(
        editingResult.res.id,
        parsed,
        reasonInput || 'Cập nhật điểm định kỳ'
      );
      setEditingResult(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenCreateAssessment = () => {
    setEditingAssessment(null);
    setNewTitle('');
    setNewType('15_MIN');
    setNewWeight(1);
    setNewDate(new Date().toISOString().slice(0, 10));
    setNewSubjectId(subjects[0]?.id || '');
    setNewClassId(selectedClassId || classes[0]?.id || 'cls_10a1');
    setShowAddModal(true);
  };

  const handleOpenEditAssessment = (asm: Assessment) => {
    setEditingAssessment(asm);
    setNewTitle(asm.title);
    setNewType(asm.type);
    setNewWeight(asm.weight);
    setNewDate(asm.date.slice(0, 10));
    setNewSubjectId(asm.subjectId);
    setNewClassId(asm.classId);
    setShowAddModal(true);
  };

  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    try {
      setIsDeletingAssessment(true);
      await api.deleteAssessment(assessmentToDelete.id);
      setAssessmentToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa bài đánh giá');
    } finally {
      setIsDeletingAssessment(false);
    }
  };

  const handleClearScore = async () => {
    if (!editingResult) return;
    try {
      setIsUpdatingScore(true);
      await api.updateAssessmentResult(
        editingResult.res.id,
        null,
        reasonInput || 'Xóa điểm / Đặt lại trống'
      );
      setEditingResult(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa điểm');
    } finally {
      setIsUpdatingScore(false);
    }
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAssessment) {
        await api.updateAssessment(editingAssessment.id, {
          title: newTitle,
          type: newType,
          subjectId: newSubjectId,
          classId: newClassId,
          date: newDate,
          maxScore: 10,
          weight: newWeight,
        });
      } else {
        await api.createAssessment({
          title: newTitle,
          type: newType,
          subjectId: newSubjectId,
          classId: newClassId,
          date: newDate,
          maxScore: 10,
          weight: newWeight,
        });
      }
      setShowAddModal(false);
      setEditingAssessment(null);
      setNewTitle('');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Grade Import Handlers
  const handleDownloadGradeTemplate = () => {
    const targetAsm = assessments.find((a) => a.id === importAssessmentId) || assessments[0];
    if (!targetAsm) {
      alert('Chưa có bài đánh giá nào.');
      return;
    }
    const classStudents = students.filter((s) => s.classId === targetAsm.classId);
    let csv = 'studentCode,fullName,score,note\n';
    classStudents.forEach((st) => {
      csv += `${st.studentCode},"${st.fullName}",,\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bang_diem_${targetAsm.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();
  };

  const handleDownloadExcelTemplate = () => {
    const targetAsm = assessments.find((a) => a.id === importAssessmentId) || assessments[0];
    if (!targetAsm) {
      alert('Chưa có bài đánh giá nào.');
      return;
    }
    const classStudents = students.filter((s) => s.classId === targetAsm.classId);
    downloadGradeTemplateExcel(
      targetAsm.title,
      classStudents.map((st) => ({ studentCode: st.studentCode, fullName: st.fullName }))
    );
  };

  const handleLoadSampleGradeCsv = () => {
    const targetAsm = assessments.find((a) => a.id === importAssessmentId) || assessments[0];
    const classStudents = students.filter((s) => s.classId === targetAsm?.classId).slice(0, 5);
    const sampleRows = classStudents.map((st, i) => {
      const sampleScore = [8.5, 9.0, 7.5, 10.0, 6.5][i % 5];
      return `${st.studentCode},"${st.fullName}",${sampleScore},Nhập điểm đợt 1`;
    });

    setImportCsvText(`studentCode,fullName,score,note\n` + sampleRows.join('\n'));
    setImportPreviewData(null);
    setImportSuccessMsg(null);
  };

  const processAndPreviewCsv = async (csvContent: string, customAsmId?: string) => {
    const parsed = parseGradeCsv(csvContent);
    if (parsed.rows.length === 0) {
      alert('Tệp dữ liệu không có dòng điểm nào hoặc định dạng không đúng.');
      return;
    }

    const targetAsmId = customAsmId || importAssessmentId;
    if (!targetAsmId) {
      alert('Vui lòng chọn bài đánh giá muốn nhập điểm.');
      return;
    }

    try {
      setIsVerifyingImport(true);
      setImportSuccessMsg(null);
      const preview = await api.previewImportScores(targetAsmId, parsed.rows);
      setImportPreviewData(preview);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsVerifyingImport(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // Auto-match assessment based on filename
    let targetId = importAssessmentId;
    const matchedId = detectAssessmentMatch(file.name, assessments);
    if (matchedId) {
      targetId = matchedId;
      setImportAssessmentId(matchedId);
    }

    try {
      setIsVerifyingImport(true);
      setImportSuccessMsg(null);

      // Support Excel (.xlsx, .xls) and CSV
      const { rows } = await parseGradeExcelOrCsvFile(file);
      if (rows.length === 0) {
        alert('Tệp dữ liệu không có dòng điểm nào hoặc không tìm thấy cột dữ liệu hợp lệ.');
        setIsVerifyingImport(false);
        return;
      }

      // Convert to visible CSV representation for inspection in textarea
      const csvLines = ['studentCode,fullName,score,note'];
      rows.forEach((r) => {
        csvLines.push(`${r.studentCode},"${r.fullName}",${r.score ?? ''},${r.note || ''}`);
      });
      setImportCsvText(csvLines.join('\n'));

      const preview = await api.previewImportScores(targetId, rows);
      setImportPreviewData(preview);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đọc tệp điểm.');
    } finally {
      setIsVerifyingImport(false);
    }
  };

  const handleLoadUserAttachedFile = async () => {
    const userCsv = `studentCode,fullName,score,note
HS2025-1001,Nguyễn Hoàng Nam,9,T
HS2025-1002,Trần Bảo Châu,10,K
HS2025-1003,Lê Tuấn Kiệt,2,G
HS2025-1004,Phạm Phương Linh,1,K
HS2025-1005,Vũ Đức Anh,0,T
HS2025-1006,Hoàng Kim Ngân,4,K
HS2025-1007,Đỗ Minh Khang,8,G
HS2025-1008,Bùi Gia Huy,9,K`;

    setFileName('bang_diem_GK1.csv');
    setImportCsvText(userCsv);

    // Target Midterm GK1 assessment (asm_03)
    const gk1Asm = assessments.find((a) => a.type === 'MIDTERM' || a.title.includes('giữa') || a.id === 'asm_03') || assessments[0];
    if (gk1Asm) {
      setImportAssessmentId(gk1Asm.id);
    }

    await processAndPreviewCsv(userCsv, gk1Asm?.id);
  };

  const handlePreviewGradeImport = async () => {
    if (!importCsvText.trim()) {
      alert('Vui lòng dán hoặc tải lên nội dung tệp điểm CSV');
      return;
    }
    await processAndPreviewCsv(importCsvText);
  };

  const handleExecuteGradeImport = async () => {
    if (!importPreviewData || importPreviewData.validCount === 0) return;
    try {
      setIsSavingImport(true);
      const rowsToSave = importPreviewData.rows
        .filter((r) => r.isValid)
        .map((r) => ({
          studentCode: r.studentCode,
          score: r.score,
          note: r.note || 'Nhập từ tệp Excel/CSV',
        }));

      const res = await api.executeImportScores(importAssessmentId, rowsToSave);
      setImportSuccessMsg(`Đã nhập điểm thành công cho ${res.successCount} học sinh vào sổ điểm!`);
      setImportPreviewData(null);
      setImportCsvText('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingImport(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sổ Điểm & Đánh Giá Định Kỳ</h1>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận kết quả kiểm tra 15 phút, 1 tiết, Giữa kỳ, Cuối kỳ. Hỗ trợ nhập trực tiếp hoặc tải từ tệp Excel/CSV
          </p>
        </div>

        {canGrade && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowImportModal(true);
                setImportSuccessMsg(null);
                setImportPreviewData(null);
                if (assessments.length > 0 && !importAssessmentId) {
                  setImportAssessmentId(assessments[0].id);
                }
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Nhập Điểm Từ Excel / CSV</span>
            </button>

            <button
              onClick={handleOpenCreateAssessment}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Bài Đánh Giá</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">Tất cả môn học</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Có <strong>{assessments.length}</strong> bài kiểm tra trong sổ điểm
        </div>
      </div>

      {/* Gradebook Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bảng Tổng Hợp Điểm Số Theo Học Sinh
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            * Bấm vào ô điểm để sửa/xóa điểm hoặc rê chuột lên tiêu đề bài để sửa/xóa bài đánh giá
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-28">Mã HS</th>
                <th className="py-3 px-4 w-48">Họ và Tên</th>
                {assessments.map((asm) => (
                  <th key={asm.id} className="py-3 px-3 text-center min-w-[140px] group">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-bold text-slate-800">{asm.title}</span>
                      {canGrade && (
                        <div className="inline-flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAssessment(asm)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-200 rounded transition-colors"
                            title="Chỉnh sửa bài đánh giá"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssessmentToDelete(asm)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded transition-colors"
                            title="Xóa bài đánh giá"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      {asm.type} • HS {asm.weight} • {new Date(asm.date).toLocaleDateString('vi-VN')}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-center font-bold text-blue-700 w-24">ĐTB Môn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={assessments.length + 3} className="py-8 text-center text-slate-400">
                    Chưa có dữ liệu học sinh trong lớp được chọn
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  // Calculate average for row
                  const studentResults = results.filter((r) => r.studentId === student.id && r.score !== null);
                  let weightedSum = 0;
                  let weightTotal = 0;

                  studentResults.forEach((r) => {
                    const asm = assessments.find((a) => a.id === r.assessmentId);
                    if (asm && r.score !== null) {
                      weightedSum += r.score * asm.weight;
                      weightTotal += asm.weight;
                    }
                  });

                  const average = weightTotal > 0 ? (weightedSum / weightTotal).toFixed(1) : '—';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-700">{student.studentCode}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{student.fullName}</td>

                      {assessments.map((asm) => {
                        const res = results.find((r) => r.assessmentId === asm.id && r.studentId === student.id);
                        const hasScore = res && res.score !== null;

                        return (
                          <td key={asm.id} className="py-2 px-3 text-center">
                            {canGrade && res ? (
                              <button
                                onClick={() => handleOpenScoreModal(res, student.fullName, asm.title)}
                                className={`w-14 py-1 px-1.5 rounded-md font-mono text-xs font-bold transition-all border ${
                                  hasScore
                                    ? res.score! >= 8.0
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                      : res.score! >= 5.0
                                      ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                    : 'bg-slate-50 text-slate-400 border-dashed border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {hasScore ? res.score : '—'}
                              </button>
                            ) : (
                              <span className="font-mono text-slate-500">{hasScore ? res.score : '—'}</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-4 text-center font-bold text-blue-700 font-mono text-sm">
                        {average}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grade Import from Excel/CSV Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Nhập Điểm Đánh Giá Từ Tệp Excel / CSV"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {importSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn Bài Đánh Giá Cần Nhập Điểm
            </label>
            <select
              value={importAssessmentId}
              onChange={(e) => {
                setImportAssessmentId(e.target.value);
                setImportPreviewData(null);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({classes.find((c) => c.id === a.classId)?.code} - {a.type})
                </option>
              ))}
            </select>
          </div>

          {/* Quick load user file banner */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold text-slate-800">Tệp điểm bạn đã tải lên: </span>
                <span className="text-blue-700 font-mono font-semibold">bang_diem_GK1.csv</span>
                <span className="text-slate-500 text-[11px] ml-1.5">(8 học sinh lớp 10A1, thang điểm 0-10)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLoadUserAttachedFile}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Nạp & Đối Soát Ngay</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">Tệp dữ liệu điểm (CSV / Excel):</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>{fileName ? `Tệp: ${fileName}` : 'Chọn tệp Excel / CSV'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 rounded-md border border-emerald-300 flex items-center gap-1 cursor-pointer"
                title="Tải mẫu bảng điểm Excel chuẩn tiếng Việt cho lớp"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Tải mẫu Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadGradeTemplate}
                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 flex items-center gap-1 cursor-pointer"
                title="Tải mẫu CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSampleGradeCsv}
                className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 cursor-pointer"
              >
                Dán mẫu thử nghiệm
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            value={importCsvText}
            onChange={(e) => setImportCsvText(e.target.value)}
            placeholder="Dán nội dung CSV (cột: studentCode,fullName,score,note)..."
            className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              * Tự động nhận diện dấu phẩy (,), chấm phẩy (;), tab và dấu phẩy thập phân (ví dụ 8,5).
            </span>
            <button
              type="button"
              onClick={handlePreviewGradeImport}
              disabled={isVerifyingImport || !importCsvText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingImport ? 'animate-spin' : ''}`} />
              <span>Kiểm Tra & Đối Soát Điểm</span>
            </button>
          </div>

          {/* Validation Preview Table */}
          {importPreviewData && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-800">
                  Kết quả kiểm tra: {importPreviewData.assessmentTitle}
                </span>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                    Hợp lệ: {importPreviewData.validCount}
                  </span>
                  {importPreviewData.errorCount > 0 && (
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-semibold">
                      Có lỗi: {importPreviewData.errorCount}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleExecuteGradeImport}
                    disabled={isSavingImport || importPreviewData.validCount === 0}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{isSavingImport ? 'Đang lưu...' : `Lưu ${importPreviewData.validCount} Điểm Hợp Lệ`}</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-56 bg-white rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Dòng</th>
                      <th className="py-2 px-3">Trạng thái</th>
                      <th className="py-2 px-3">Mã HS</th>
                      <th className="py-2 px-3">Họ và Tên</th>
                      <th className="py-2 px-3 text-center">Điểm ghi nhận</th>
                      <th className="py-2 px-3">Lỗi nếu có</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreviewData.rows.map((r) => (
                      <tr key={r.rowNumber} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                        <td className="py-2 px-3 font-mono text-slate-500">{r.rowNumber}</td>
                        <td className="py-2 px-3">
                          {r.isValid ? (
                            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hợp lệ
                            </span>
                          ) : (
                            <span className="text-rose-700 font-semibold inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Lỗi
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{r.studentCode}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{r.fullName}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">
                          {r.score !== null ? r.score : <span className="text-slate-400 italic">Trống</span>}
                        </td>
                        <td className="py-2 px-3 text-rose-600 font-medium">
                          {r.errors.length > 0 ? r.errors.join('; ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportPreviewData(null)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Hủy xem trước
                </button>
                <button
                  type="button"
                  onClick={handleExecuteGradeImport}
                  disabled={isSavingImport || importPreviewData.validCount === 0}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>
                    {isSavingImport
                      ? 'Đang lưu vào sổ điểm...'
                      : `Lưu ${importPreviewData.validCount} Điểm Hợp Lệ`}
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Single Edit Score Modal */}
      <Modal
        isOpen={!!editingResult}
        onClose={() => setEditingResult(null)}
        title="Nhập / Điều Chỉnh Điểm Đánh Giá"
        maxWidth="md"
      >
        {editingResult && (
          <form onSubmit={handleSaveScore} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div>
                Học sinh: <strong>{editingResult.studentName}</strong>
              </div>
              <div className="text-slate-600">Bài kiểm tra: <strong>{editingResult.asmTitle}</strong></div>
              <div className="text-[11px] text-slate-400">
                Điểm hiện tại: {editingResult.res.score !== null ? `${editingResult.res.score}/10` : 'Chưa có'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Điểm Số Mới (Thang điểm 0 - 10)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                placeholder="Để trống nếu chưa đánh giá"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                * Điểm 0 là điểm số thực tế. Xóa trắng ô nhập tương đương với chưa có kết quả (NULL).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lý Do Điều Chỉnh (Bắt buộc)</label>
              <input
                type="text"
                required
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Ví dụ: Chấm phúc khảo, bổ sung bài kiểm tra bù..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Audit history for this score */}
            {editingResult.res.adjustmentHistory && editingResult.res.adjustmentHistory.length > 0 && (
              <div>
                <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> Nhật ký sửa đổi điểm số:
                </h5>
                <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] text-slate-500">
                  {editingResult.res.adjustmentHistory.map((adj, i) => (
                    <div key={i} className="p-1.5 rounded bg-slate-50 border border-slate-100">
                      <strong>{new Date(adj.changedAt).toLocaleDateString('vi-VN')}</strong>: {adj.oldScore ?? 'Trống'} ➔{' '}
                      {adj.newScore ?? 'Trống'} (Bởi {adj.changedBy} - {adj.reason})
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <div>
                {editingResult.res.score !== null && (
                  <button
                    type="button"
                    disabled={isUpdatingScore}
                    onClick={handleClearScore}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Điểm (Để Trống)</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingResult(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingScore}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isUpdatingScore ? 'Đang lưu...' : 'Lưu Điểm Số'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Add & Edit Assessment Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingAssessment(null);
        }}
        title={editingAssessment ? 'Chỉnh Sửa Bài Đánh Giá' : 'Thêm Bài Đánh Giá Mới Vào Sổ Điểm'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveAssessment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Bài Đánh Giá</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Kiểm tra 15 phút Số học chương 2"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loại Đánh Giá</label>
              <select
                value={newType}
                onChange={(e) => {
                  const t = e.target.value as Assessment['type'];
                  setNewType(t);
                  if (t === '15_MIN') setNewWeight(1);
                  else if (t === 'ONE_PERIOD') setNewWeight(2);
                  else if (t === 'MIDTERM') setNewWeight(3);
                  else if (t === 'FINAL') setNewWeight(4);
                  else setNewWeight(2);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="15_MIN">Kiểm tra 15 phút (HS 1)</option>
                <option value="ONE_PERIOD">Kiểm tra 1 tiết (HS 2)</option>
                <option value="MIDTERM">Kiểm tra giữa kỳ (HS 3)</option>
                <option value="FINAL">Kiểm tra cuối kỳ (HS 4)</option>
                <option value="PROJECT">Dự án học tập (HS 2)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hệ Số Trọng Số</label>
              <input
                type="number"
                min={1}
                max={5}
                required
                value={newWeight}
                onChange={(e) => setNewWeight(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Môn Học</label>
              <select
                value={newSubjectId}
                onChange={(e) => setNewSubjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Áp Dụng Cho Lớp</label>
              <select
                value={newClassId}
                onChange={(e) => setNewClassId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Kiểm Tra</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingAssessment(null);
              }}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              {editingAssessment ? 'Lưu Thay Đổi' : 'Tạo Bài Đánh Giá'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Assessment Confirmation Modal */}
      <Modal
        isOpen={!!assessmentToDelete}
        onClose={() => !isDeletingAssessment && setAssessmentToDelete(null)}
        title="Xác Nhận Xóa Bài Đánh Giá"
        maxWidth="md"
      >
        {assessmentToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 space-y-1">
                <p className="font-bold">Hành động này sẽ xóa toàn bộ điểm số của bài kiểm tra này!</p>
                <p>
                  Toàn bộ kết quả điểm đã chấm của tất cả học sinh thuộc bài kiểm tra "{assessmentToDelete.title}" sẽ bị xóa khỏi sổ điểm.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Tên bài kiểm tra:</span>
                <span className="font-bold text-slate-800">{assessmentToDelete.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hình thức / Hệ số:</span>
                <span className="font-medium text-slate-800">
                  {assessmentToDelete.type} • Hệ số {assessmentToDelete.weight}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lớp áp dụng:</span>
                <span className="font-medium text-slate-800">
                  {classes.find((c) => c.id === assessmentToDelete.classId)?.code || assessmentToDelete.classId}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingAssessment}
                onClick={() => setAssessmentToDelete(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingAssessment}
                onClick={handleDeleteAssessment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingAssessment ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác Nhận Xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
