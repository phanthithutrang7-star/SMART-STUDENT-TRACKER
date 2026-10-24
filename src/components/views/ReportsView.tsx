import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Layers,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { ClassGroup, StudentAnalytics, Alert, AssignmentSubmission, Student } from '../../types/index.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';

type ReportType = 'COMPLETION' | 'OVERDUE' | 'LATE' | 'PROGRESS' | 'ALERTS';

export const ReportsView: React.FC = () => {
  const { selectedClassId } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('COMPLETION');
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [analyticsList, setAnalyticsList] = useState<StudentAnalytics[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [selectedClassId]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      const [cls, stds, alts, subs] = await Promise.all([
        api.getClasses(),
        api.getStudents({ classId: selectedClassId || undefined }),
        api.getAlerts({ classId: selectedClassId || undefined }),
        api.getSubmissions({ classId: selectedClassId || undefined }),
      ]);
      setClasses(cls);
      setStudents(stds);
      setAlerts(alts);
      setSubmissions(subs);

      const aList = await Promise.all(stds.map((s) => api.getStudentAnalytics(s.id)));
      setAnalyticsList(aList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    let exportType: 'students' | 'submissions' | 'analytics' = 'analytics';
    if (reportType === 'COMPLETION' || reportType === 'PROGRESS') exportType = 'analytics';
    else if (reportType === 'OVERDUE' || reportType === 'LATE') exportType = 'submissions';
    else exportType = 'students';

    const url = api.getExportUrl(exportType, selectedClassId);
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Báo Cáo & Xuất Dữ Liệu</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kết xuất các báo cáo chuyên đề về tiến trình học tập, danh sách học sinh nợ bài và hồ sơ can thiệp
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Xuất CSV (Excel)</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs (Hidden when printing) */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 print:hidden">
        {[
          { id: 'COMPLETION', label: '1. Báo cáo hoàn thành bài tập' },
          { id: 'OVERDUE', label: '2. Danh sách chưa nộp & nợ bài' },
          { id: 'LATE', label: '3. Thống kê nộp muộn' },
          { id: 'PROGRESS', label: '4. Báo cáo tiến bộ & điểm số' },
          { id: 'ALERTS', label: '5. Báo cáo cảnh báo & can thiệp' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as ReportType)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              reportType === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-8 space-y-6 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 text-center space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            HỆ THỐNG SMART STUDENT TRACKER — BÁO CÁO GIÁO DỤC
          </p>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {reportType === 'COMPLETION' && 'BÁO CÁO TỶ LỆ HOÀN THÀNH BÀI TẬP VÀ ĐÚNG HẠN'}
            {reportType === 'OVERDUE' && 'DANH SÁCH HỌC SINH CÓ BÀI TẬP QUÁ HẠN CHƯA NỘP'}
            {reportType === 'LATE' && 'BÁO CÁO THỐNG KÊ TẦN SUẤT BÀI NỘP MUỘN'}
            {reportType === 'PROGRESS' && 'BÁO CÁO ĐÁNH GIÁ TIẾN BỘ & XU HƯỚNG ĐIỂM SỐ'}
            {reportType === 'ALERTS' && 'TỔNG HỢP CẢNH BÁO SỚM VÀ TIẾN ĐỘ HỖ TRỢ SƯ PHẠM'}
          </h2>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-1">
            <span>Đơn vị: <strong>{selectedClass?.name || 'Tất cả các lớp'}</strong></span>
            <span>•</span>
            <span>Niên khóa: <strong>2025-2026 (Học kỳ I)</strong></span>
            <span>•</span>
            <span>Ngày xuất: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></span>
          </div>
        </div>

        {/* Content Table based on Report Type */}
        <div className="overflow-x-auto">
          {reportType === 'COMPLETION' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mã HS</th>
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Lớp</th>
                  <th className="py-2.5 px-3 text-center">Tổng bài giao</th>
                  <th className="py-2.5 px-3 text-center">Hoàn thành</th>
                  <th className="py-2.5 px-3 text-center">Được miễn</th>
                  <th className="py-2.5 px-3 text-center">Tỷ lệ hoàn thành</th>
                  <th className="py-2.5 px-3 text-center">Đúng hạn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analyticsList.map((a) => (
                  <tr key={a.studentId}>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{a.studentCode}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{a.fullName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{a.className}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{a.totalAssignmentsAssigned}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600">
                      {a.completedAssignments}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">{a.exemptAssignments}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                      {a.completionRate}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{a.onTimeRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'OVERDUE' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mã HS</th>
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Lớp</th>
                  <th className="py-2.5 px-3 text-center">Số bài quá hạn</th>
                  <th className="py-2.5 px-3">Phụ huynh</th>
                  <th className="py-2.5 px-3">SĐT Liên hệ</th>
                  <th className="py-2.5 px-3 text-right">Đánh giá nguy cơ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analyticsList
                  .filter((a) => a.overdueAssignments > 0)
                  .map((a) => {
                    const st = students.find((s) => s.id === a.studentId);
                    return (
                      <tr key={a.studentId}>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{a.studentCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{a.fullName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{a.className}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">
                          {a.overdueAssignments} bài
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{st?.parentName || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{st?.parentPhone || '—'}</td>
                        <td className="py-2.5 px-3 text-right">
                          {a.overdueAssignments >= 3 ? (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                              Cần can thiệp gấp
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                              Đang đôn đốc
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {reportType === 'PROGRESS' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mã HS</th>
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Lớp</th>
                  <th className="py-2.5 px-3 text-center">ĐTB Hiện tại</th>
                  <th className="py-2.5 px-3 text-center">Xu hướng</th>
                  <th className="py-2.5 px-3">Căn cứ & Giải thích dữ liệu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analyticsList.map((a) => (
                  <tr key={a.studentId}>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{a.studentCode}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{a.fullName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{a.className}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                      {a.averageScore ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge trend={a.scoreTrend} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{a.trendExplanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'ALERTS' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Học sinh</th>
                  <th className="py-2.5 px-3">Mã định danh</th>
                  <th className="py-2.5 px-3">Quy tắc kích hoạt</th>
                  <th className="py-2.5 px-3">Mức ưu tiên</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3">Kế hoạch can thiệp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map((al) => (
                  <tr key={al.id}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{al.studentName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{al.studentCode}</td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{al.ruleTitle}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge priority={al.priority} />
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={al.status} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{al.actionPlan || 'Chưa lập kế hoạch'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Signature Block */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-700">NGƯỜI LẬP BÁO CÁO</p>
            <p className="text-[11px] text-slate-400 mt-0.5">(Ký và ghi rõ họ tên)</p>
            <div className="h-16" />
            <p className="font-semibold text-slate-900">Giáo viên phụ trách bộ môn</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">BAN GIÁM HIỆU DUYỆT</p>
            <p className="text-[11px] text-slate-400 mt-0.5">(Ký và đóng dấu)</p>
            <div className="h-16" />
            <p className="font-semibold text-slate-900">Hiệu trưởng / Tổ trưởng chuyên môn</p>
          </div>
        </div>
      </div>
    </div>
  );
};
