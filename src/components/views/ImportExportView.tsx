import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Database,
  RefreshCw,
  FileText,
  Award,
  Users,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Assessment, Student } from '../../types/index.ts';
import { parseGradeCsv, detectAssessmentMatch } from '../../utils/csvParser.ts';
import { parseStudentExcelFile, downloadStudentTemplateExcel } from '../../utils/excelParser.ts';

type ImportTab = 'STUDENTS' | 'GRADES';

export const ImportExportView: React.FC = () => {
  const { canEdit, selectedClassId } = useAuth();
  const [activeTab, setActiveTab] = useState<ImportTab>('STUDENTS');
  const gradeFileInputRef = useRef<HTMLInputElement>(null);
  const studentFileInputRef = useRef<HTMLInputElement>(null);
  const [gradeFileName, setGradeFileName] = useState('');
  const [studentFileName, setStudentFileName] = useState('');

  // Student Import State
  const [csvText, setCsvText] = useState('');
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    validCount: number;
    errorCount: number;
    rows: any[];
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Grade Import State
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedAsmId, setSelectedAsmId] = useState<string>('');
  const [gradeCsvText, setGradeCsvText] = useState('');
  const [gradePreviewData, setGradePreviewData] = useState<{
    totalRows: number;
    validCount: number;
    errorCount: number;
    rows: any[];
    assessmentTitle: string;
  } | null>(null);
  const [isVerifyingGrades, setIsVerifyingGrades] = useState(false);
  const [isImportingGrades, setIsImportingGrades] = useState(false);
  const [gradeSuccessMessage, setGradeSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getAssessments().then((asms) => {
      setAssessments(asms);
      if (asms.length > 0 && !selectedAsmId) setSelectedAsmId(asms[0].id);
    });
    api.getStudents().then(setStudents);
  }, []);

  // Sample CSV template for students
  const sampleCsv = `studentCode,fullName,gender,birthDate,email,phone,classCode,parentName,parentPhone
HS2025-1031,Vũ Minh Quân,Nam,2009-05-18,quan.vm@smarttracker.edu.vn,0912445501,10A1,Vũ Minh Tuấn,0987332211
HS2025-1032,Nguyễn Diệu Linh,Nữ,2009-09-24,linh.nd@smarttracker.edu.vn,0912445502,10A1,Nguyễn Trọng Đại,0987332212
HS2025-1033,Phạm Tuấn Hùng,Nam,2009-12-08,hung.pt@smarttracker.edu.vn,0912445503,10A2,Phạm Văn Tiến,0987332213`;

  const handleLoadSample = () => {
    setCsvText(sampleCsv);
    setPreviewData(null);
    setImportSuccessMessage(null);
  };

  const handleStudentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsVerifying(true);
      setStudentFileName(file.name);
      setImportSuccessMessage(null);

      const rows = await parseStudentExcelFile(file);
      const preview = await api.previewImport(rows);
      setPreviewData(preview);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đọc file Excel/CSV');
      setPreviewData(null);
    } finally {
      setIsVerifying(false);
      if (studentFileInputRef.current) studentFileInputRef.current.value = '';
    }
  };

  const handleParseAndPreview = async () => {
    if (!csvText.trim()) {
      alert('Vui lòng dán dữ liệu CSV hoặc bấm tải tệp mẫu');
      return;
    }

    try {
      setIsVerifying(true);
      setImportSuccessMessage(null);

      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        alert('Tệp dữ liệu cần có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu.');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rawRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] || '';
        });
        rawRows.push(rowObj);
      }

      const preview = await api.previewImport(rawRows);
      setPreviewData(preview);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData || previewData.validCount === 0) return;
    try {
      setIsImporting(true);
      const res = await api.executeImport(previewData.rows);
      setImportSuccessMessage(`Đã nhập thành công ${res.count} học sinh mới vào hệ thống!`);
      setPreviewData(null);
      setCsvText('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleFile = () => {
    const blob = new Blob(['\uFEFF' + sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mau_nhap_lieu_hoc_sinh.csv';
    link.click();
  };

  // Grade Import Handlers
  const handleLoadSampleGrades = () => {
    const targetAsm = assessments.find((a) => a.id === selectedAsmId) || assessments[0];
    const classStudents = students.filter((s) => s.classId === targetAsm?.classId).slice(0, 5);
    const sampleRows = classStudents.map((st, i) => {
      const sampleScore = [8.5, 9.0, 7.5, 10.0, 6.5][i % 5];
      return `${st.studentCode},"${st.fullName}",${sampleScore},Nhập từ Excel đợt 1`;
    });

    setGradeCsvText(`studentCode,fullName,score,note\n` + sampleRows.join('\n'));
    setGradePreviewData(null);
    setGradeSuccessMessage(null);
  };

  const handleDownloadGradeTemplate = () => {
    const targetAsm = assessments.find((a) => a.id === selectedAsmId) || assessments[0];
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
    link.download = `mau_diem_${targetAsm.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();
  };

  const processAndPreviewGrades = async (csvContent: string, customAsmId?: string) => {
    const parsed = parseGradeCsv(csvContent);
    if (parsed.rows.length === 0) {
      alert('Tệp dữ liệu không có dòng điểm nào hoặc định dạng không đúng.');
      return;
    }

    const targetAsmId = customAsmId || selectedAsmId;
    if (!targetAsmId) {
      alert('Vui lòng chọn bài kiểm tra muốn nhập điểm');
      return;
    }

    try {
      setIsVerifyingGrades(true);
      setGradeSuccessMessage(null);
      const preview = await api.previewImportScores(targetAsmId, parsed.rows);
      setGradePreviewData(preview);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsVerifyingGrades(false);
    }
  };

  const handleGradeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGradeFileName(file.name);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = (event.target?.result as string) || '';
        setGradeCsvText(text);

        let targetId = selectedAsmId;
        const matched = detectAssessmentMatch(file.name, assessments);
        if (matched) {
          targetId = matched;
          setSelectedAsmId(matched);
        }

        await processAndPreviewGrades(text, targetId);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadUserAttachedFileGrades = async () => {
    const userCsv = `studentCode,fullName,score,note
HS2025-1001,Nguyễn Hoàng Nam,9,T
HS2025-1002,Trần Bảo Châu,10,K
HS2025-1003,Lê Tuấn Kiệt,2,G
HS2025-1004,Phạm Phương Linh,1,K
HS2025-1005,Vũ Đức Anh,0,T
HS2025-1006,Hoàng Kim Ngân,4,K
HS2025-1007,Đỗ Minh Khang,8,G
HS2025-1008,Bùi Gia Huy,9,K`;

    setGradeFileName('bang_diem_GK1.csv');
    setGradeCsvText(userCsv);

    const gk1Asm = assessments.find((a) => a.type === 'MIDTERM' || a.title.includes('giữa') || a.id === 'asm_03') || assessments[0];
    if (gk1Asm) {
      setSelectedAsmId(gk1Asm.id);
    }

    await processAndPreviewGrades(userCsv, gk1Asm?.id);
  };

  const handleParseAndPreviewGrades = async () => {
    if (!gradeCsvText.trim()) {
      alert('Vui lòng dán dữ liệu điểm CSV hoặc bấm tải mẫu');
      return;
    }
    await processAndPreviewGrades(gradeCsvText);
  };

  const handleExecuteGradeImport = async () => {
    if (!gradePreviewData || gradePreviewData.validCount === 0) return;
    try {
      setIsImportingGrades(true);
      const rowsToSave = gradePreviewData.rows
        .filter((r) => r.isValid)
        .map((r) => ({
          studentCode: r.studentCode,
          score: r.score,
          note: r.note || 'Nhập từ tệp Excel/CSV',
        }));

      const res = await api.executeImportScores(selectedAsmId, rowsToSave);
      setGradeSuccessMessage(`Đã nhập điểm thành công cho ${res.successCount} học sinh vào sổ điểm!`);
      setGradePreviewData(null);
      setGradeCsvText('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsImportingGrades(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Nhập / Xuất Dữ Liệu & Tích Hợp</h1>
        <p className="text-xs text-slate-500 mt-1">
          Hỗ trợ nhập Excel/CSV cho cả <strong>Danh sách học sinh</strong> và <strong>Sổ điểm đánh giá định kỳ</strong> với cơ chế đối soát lỗi 2 bước
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'STUDENTS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>1. Nhập Danh Sách Học Sinh (Excel/CSV)</span>
        </button>

        <button
          onClick={() => setActiveTab('GRADES')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'GRADES'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>2. Nhập Sổ Điểm Đánh Giá (Excel/CSV)</span>
        </button>
      </div>

      {/* Grid: 2 columns (Import on Left, Export Center on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Import Tab */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: STUDENTS */}
          {activeTab === 'STUDENTS' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Bước 1: Chọn tệp Excel (.xlsx, .xls) hoặc dán CSV danh sách học sinh
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadStudentTemplateExcel}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải file Excel mẫu (.xlsx)</span>
                    </button>
                    <button
                      onClick={handleLoadSample}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 cursor-pointer"
                    >
                      Dán mẫu thử
                    </button>
                  </div>
                </div>

                {/* Direct Excel file upload zone */}
                <div
                  onClick={() => studentFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/20 rounded-xl p-5 text-center cursor-pointer transition-all"
                >
                  <input
                    type="file"
                    ref={studentFileInputRef}
                    onChange={handleStudentFileUpload}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  <FileSpreadsheet className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800">
                    {studentFileName ? `Đã chọn: ${studentFileName}` : 'Bấm để tải lên tệp Excel (.xlsx, .xls) hoặc CSV'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Hệ thống tự động đọc các cột: Mã HS, Họ và tên, Giới tính, Ngày sinh, Lớp, Email...
                  </p>
                </div>

                <div className="relative flex items-center my-2">
                  <div className="grow border-t border-slate-200"></div>
                  <span className="shrink mx-3 text-[11px] uppercase font-bold text-slate-400">Hoặc dán nội dung CSV</span>
                  <div className="grow border-t border-slate-200"></div>
                </div>

                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Dán nội dung tệp CSV tại đây (các cột: studentCode,fullName,gender,birthDate,email,phone,classCode,parentName,parentPhone)..."
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    * Tự động kiểm tra trùng mã học sinh và lỗi định dạng trước khi ghi.
                  </span>
                  <button
                    onClick={handleParseAndPreview}
                    disabled={isVerifying || !csvText.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                    <span>Kiểm tra & Xem trước</span>
                  </button>
                </div>
              </div>

              {/* Success Banner */}
              {importSuccessMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>{importSuccessMessage}</div>
                </div>
              )}

              {/* Step 2: Verification Preview Table */}
              {previewData && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Bước 2: Kết quả đối soát dữ liệu học sinh
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        Tổng số: <strong>{previewData.totalRows}</strong> dòng
                      </span>
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Hợp lệ: {previewData.validCount}
                      </span>
                      {previewData.errorCount > 0 && (
                        <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Có lỗi: {previewData.errorCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Dòng</th>
                          <th className="py-2 px-3">Trạng thái</th>
                          <th className="py-2 px-3">Mã HS</th>
                          <th className="py-2 px-3">Họ và Tên</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Lớp</th>
                          <th className="py-2 px-3">Chi tiết lỗi nếu có</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.rows.map((r) => (
                          <tr key={r.rowNumber} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-500">{r.rowNumber}</td>
                            <td className="py-2.5 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hợp lệ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Lỗi
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.studentCode}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{r.fullName}</td>
                            <td className="py-2.5 px-3 text-slate-500">{r.email}</td>
                            <td className="py-2.5 px-3 text-slate-700">{r.classCode}</td>
                            <td className="py-2.5 px-3 text-rose-600 font-medium">
                              {r.errors.length > 0 ? r.errors.join('; ') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setPreviewData(null)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg"
                    >
                      Hủy xem trước
                    </button>
                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting || previewData.validCount === 0}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{isImporting ? 'Đang ghi vào CSDL...' : `Lưu ${previewData.validCount} học sinh hợp lệ`}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: GRADES */}
          {activeTab === 'GRADES' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Bước 1: Chọn bài kiểm tra & Tải lên bảng điểm
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={gradeFileInputRef}
                      onChange={handleGradeFileSelect}
                      accept=".csv,text/csv"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => gradeFileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{gradeFileName ? `Tệp: ${gradeFileName}` : 'Chọn tệp CSV từ máy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadGradeTemplate}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải bảng điểm mẫu</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleGrades}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-md border border-emerald-200 cursor-pointer"
                    >
                      Dán mẫu điểm thử
                    </button>
                  </div>
                </div>

                {/* Quick load user file banner */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800">Tệp điểm bạn đã tải lên: </span>
                      <span className="text-emerald-700 font-mono font-semibold">bang_diem_GK1.csv</span>
                      <span className="text-slate-500 text-[11px] ml-1.5">(8 học sinh lớp 10A1)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadUserAttachedFileGrades}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Nạp & Đối Soát Ngay</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chọn bài đánh giá cần nhập điểm:
                  </label>
                  <select
                    value={selectedAsmId}
                    onChange={(e) => {
                      setSelectedAsmId(e.target.value);
                      setGradePreviewData(null);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {assessments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.type} - HS {a.weight})
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={5}
                  value={gradeCsvText}
                  onChange={(e) => setGradeCsvText(e.target.value)}
                  placeholder="Dán nội dung CSV (cột: studentCode,fullName,score,note)..."
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    * Điểm 0 là hợp lệ. Ô trống là chưa thi (NULL). Điểm ngoài [0, 10] sẽ bị báo lỗi.
                  </span>
                  <button
                    onClick={handleParseAndPreviewGrades}
                    disabled={isVerifyingGrades || !gradeCsvText.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingGrades ? 'animate-spin' : ''}`} />
                    <span>Kiểm tra & Đối soát điểm</span>
                  </button>
                </div>
              </div>

              {/* Success Banner */}
              {gradeSuccessMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>{gradeSuccessMessage}</div>
                </div>
              )}

              {/* Grade Preview Table */}
              {gradePreviewData && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">
                      Kết quả đối soát: {gradePreviewData.assessmentTitle}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                        Hợp lệ: {gradePreviewData.validCount}
                      </span>
                      {gradePreviewData.errorCount > 0 && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-semibold">
                          Có lỗi: {gradePreviewData.errorCount}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleExecuteGradeImport}
                        disabled={isImportingGrades || gradePreviewData.validCount === 0}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>{isImportingGrades ? 'Đang lưu...' : `Lưu ${gradePreviewData.validCount} Điểm Ngay`}</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider sticky top-0">
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
                        {gradePreviewData.rows.map((r) => (
                          <tr key={r.rowNumber} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{r.rowNumber}</td>
                            <td className="py-2.5 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hợp lệ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Lỗi
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.studentCode}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{r.fullName}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                              {r.score !== null ? r.score : <span className="text-slate-400 italic">Trống</span>}
                            </td>
                            <td className="py-2.5 px-3 text-rose-600 font-medium">
                              {r.errors.length > 0 ? r.errors.join('; ') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setGradePreviewData(null)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg"
                    >
                      Hủy xem trước
                    </button>
                    <button
                      onClick={handleExecuteGradeImport}
                      disabled={isImportingGrades || gradePreviewData.validCount === 0}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>
                        {isImportingGrades
                          ? 'Đang lưu vào sổ điểm...'
                          : `Lưu ${gradePreviewData.validCount} Điểm Hợp Lệ`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Col: Export Center */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Trung Tâm Xuất Dữ Liệu (Export)</h3>
            </div>
            <p className="text-xs text-slate-500">
              Xuất tệp CSV tiêu chuẩn mã hóa UTF-8 kèm ký tự BOM (hiển thị tiếng Việt có dấu chuẩn xác trong Microsoft Excel).
            </p>

            <div className="space-y-3 pt-2">
              <a
                href={api.getExportUrl('students', selectedClassId)}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800">1. Danh sách học sinh & liên lạc</div>
                  <div className="text-[11px] text-slate-500">Bao gồm mã định danh, lớp, phụ huynh, trạng thái</div>
                </div>
                <Download className="w-4 h-4 text-blue-600" />
              </a>

              <a
                href={api.getExportUrl('submissions', selectedClassId)}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800">2. Ma trận bài nộp & điểm số</div>
                  <div className="text-[11px] text-slate-500">Chi tiết trạng thái từng bài tập, thời gian nộp</div>
                </div>
                <Download className="w-4 h-4 text-blue-600" />
              </a>

              <a
                href={api.getExportUrl('analytics', selectedClassId)}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800">3. Báo cáo phân tích tiến trình</div>
                  <div className="text-[11px] text-slate-500">Tỷ lệ hoàn thành, tỷ lệ đúng hạn, xu hướng điểm</div>
                </div>
                <Download className="w-4 h-4 text-blue-600" />
              </a>
            </div>
          </div>

          {/* Integration Adapter Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              Kiến Trúc Mở Rộng LMS (LMS Adapter)
            </h4>
            <p className="leading-relaxed">
              Hệ thống được thiết kế sẵn cấu trúc API chuẩn để kết nối đồng bộ với Google Classroom, Canvas LMS, hoặc hệ thống Quản lý trường học quốc gia khi được phê duyệt và cấp khóa truy cập.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
