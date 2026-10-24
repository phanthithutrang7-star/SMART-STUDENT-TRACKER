import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  Plus,
  Calendar,
  CheckCircle2,
  Edit2,
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

  // Add Assessment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Assessment['type']>('15_MIN');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newClassId, setNewClassId] = useState('cls_10a1');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newWeight, setNewWeight] = useState(1);

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

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAssessment({
        title: newTitle,
        type: newType,
        subjectId: newSubjectId,
        classId: newClassId,
        date: newDate,
        maxScore: 10,
        weight: newWeight,
      });
      setShowAddModal(false);
      setNewTitle('');
      loadData();
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = (event.target?.result as string) || '';
        setImportCsvText(text);

        // Auto-match assessment based on filename
        let targetId = importAssessmentId;
        const matchedId = detectAssessmentMatch(file.name, assessments);
        if (matchedId) {
          targetId = matchedId;
          setImportAssessmentId(matchedId);
        }

        // Auto-trigger preview immediately so user sees results without delay
        await processAndPreviewCsv(text, targetId);
      };
      reader.readAsText(file);
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
              onClick={() => setShowAddModal(true)}
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
            * Bấm vào ô điểm để sửa cá nhân hoặc dùng nút "Nhập Điểm Từ Excel" ở trên để nhập cả lớp
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-28">Mã HS</th>
                <th className="py-3 px-4 w-48">Họ và Tên</th>
                {assessments.map((asm) => (
                  <th key={asm.id} className="py-3 px-3 text-center min-w-[110px]">
                    <div className="font-bold text-slate-800">{asm.title}</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      {asm.type} • HS {asm.weight}
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
                accept=".csv,text/csv"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>{fileName ? `Tệp: ${fileName}` : 'Chọn tệp CSV từ máy'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadGradeTemplate}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải bảng điểm mẫu của lớp</span>
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

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingResult(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Lưu Điểm Số
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Assessment Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm Bài Đánh Giá Mới Vào Sổ Điểm"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAssessment} className="space-y-4">
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
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              Tạo Bài Đánh Giá
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
