import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  History,
  Database,
  Sparkles,
  AlertTriangle,
  Save,
  RotateCcw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { SystemSettings, AuditLog } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const AdminView: React.FC = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [overdueLimit, setOverdueLimit] = useState(3);
  const [minCompletionRate, setMinCompletionRate] = useState(60);
  const [gradeDropThreshold, setGradeDropThreshold] = useState(1.5);
  const [gradingScale, setGradingScale] = useState<'SCALE_10' | 'SCALE_100'>('SCALE_10');
  const [schoolYear, setSchoolYear] = useState('2025-2026');
  const [semester, setSemester] = useState<'HK1' | 'HK2'>('HK1');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      const [s, logs] = await Promise.all([api.getSettings(), api.getAuditLogs()]);
      setSettings(s);
      setAuditLogs(logs);

      setOverdueLimit(s.alertThresholds.overdueLimit);
      setMinCompletionRate(s.alertThresholds.minCompletionRate);
      setGradeDropThreshold(s.alertThresholds.gradeDropThreshold);
      setGradingScale(s.gradingScale);
      setSchoolYear(s.currentAcademicYear);
      setSemester(s.currentSemester);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await api.updateSettings({
        alertThresholds: {
          overdueLimit,
          minCompletionRate,
          gradeDropThreshold,
        },
        gradingScale,
        currentAcademicYear: schoolYear,
        currentSemester: semester,
      });
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      loadAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSeed = async () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cơ sở dữ liệu về trạng thái mẫu ban đầu?')) {
      try {
        await api.resetSeed();
        alert('Đã khôi phục dữ liệu mẫu thành công!');
        loadAdminData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (isLoading || !settings) {
    return <div className="p-8 text-center text-xs text-slate-400">Đang tải cấu hình hệ thống...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản Trị Hệ Thống & Nhật Ký Hoạt Động</h1>
        <p className="text-xs text-slate-500 mt-1">
          Cấu hình ngưỡng cảnh báo sớm, thang điểm, quản lý sao lưu và kiểm tra nhật ký tuân thủ (Audit Logs)
        </p>
      </div>

      {/* Grid: Settings on Left, Audit Logs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form Column */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Cấu Hình Ngưỡng Cảnh Báo Sớm</h3>
              </div>
              {savedSuccess && (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu
                </span>
              )}
            </div>

            {/* Threshold 1: Overdue limit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số Bài Nợ Quá Hạn Kích Hoạt Cảnh Báo
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={overdueLimit}
                  onChange={(e) => setOverdueLimit(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <span className="text-xs text-slate-500">bài tập quá hạn liên tiếp (Mặc định: 3)</span>
              </div>
            </div>

            {/* Threshold 2: Min completion rate */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngưỡng Tỷ Lệ Hoàn Thành Tối Thiểu (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={10}
                  max={95}
                  value={minCompletionRate}
                  onChange={(e) => setMinCompletionRate(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <span className="text-xs text-slate-500">% bài được hoàn thành (Mặc định: 60%)</span>
              </div>
            </div>

            {/* Threshold 3: Grade drop threshold */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngưỡng Sụt Giảm Điểm Kiểm Tra So Sánh
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.1"
                  min={0.5}
                  max={5.0}
                  value={gradeDropThreshold}
                  onChange={(e) => setGradeDropThreshold(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <span className="text-xs text-slate-500">điểm so với bài trước (Mặc định: 1.5)</span>
              </div>
            </div>

            {/* Scale and Academic Year */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thang Điểm</label>
                <select
                  value={gradingScale}
                  onChange={(e) => setGradingScale(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
                >
                  <option value="SCALE_10">Thang điểm 10 (Chuẩn VN)</option>
                  <option value="SCALE_100">Thang điểm 100</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Học Kỳ Áp Dụng</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
                >
                  <option value="HK1">Học kỳ I</option>
                  <option value="HK2">Học kỳ II</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi Cấu Hình'}</span>
              </button>
            </div>
          </form>

          {/* AI Diagnostics Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Trạng Thái Dịch Vụ AI & Kiến Trúc
              </h3>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Mô hình AI:</span>
                <span className="font-mono font-bold text-slate-800">gemini-3.8-flash</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">SDK:</span>
                <span className="font-mono text-slate-700">@google/genai ^2.4.0</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Proxy Endpoints:</span>
                <span className="font-mono text-emerald-600 font-semibold">/api/ai/task (Server-only)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Cơ chế bảo vệ:</span>
                <span className="text-slate-700 font-medium">Khử PII & Fallback xác định</span>
              </div>
            </div>
          </div>

          {/* Danger Zone: Reset Seed */}
          <div className="bg-red-50/50 rounded-xl border border-red-200 p-5 space-y-2">
            <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-red-600" />
              Khôi Phục Trạng Thái Mẫu Demo
            </h4>
            <p className="text-[11px] text-red-700 leading-relaxed">
              Thao tác này sẽ đặt lại cơ sở dữ liệu về 4 lớp học chuẩn (10A1, 10A2, 11B1, 12A1), các bài tập và điểm số mẫu ban đầu.
            </p>
            <button
              onClick={handleResetSeed}
              className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Khôi phục dữ liệu gốc
            </button>
          </div>
        </div>

        {/* Audit Log Column */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Nhật Ký Hoạt Động & Kiểm Soát Truy Cập (Audit Logs)
              </h3>
            </div>
            <span className="text-xs text-slate-400">{auditLogs.length} sự kiện</span>
          </div>

          <div className="overflow-x-auto flex-1 max-h-[640px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Người thực hiện</th>
                  <th className="py-2.5 px-3">Hành động</th>
                  <th className="py-2.5 px-3">Phân hệ</th>
                  <th className="py-2.5 px-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      <span className="text-[10px] text-slate-300">
                        {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-blue-700">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
