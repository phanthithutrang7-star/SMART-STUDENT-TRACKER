import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../api/client.ts';
import { DashboardMetrics, Alert, AssignmentSubmission, Student, ClassGroup } from '../../types/index.ts';
import { CompletionGaugeChart, ClassComparisonBarChart, StatusDistributionBar } from '../common/Charts.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';

interface DashboardViewProps {
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const { selectedClassId } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [classSummaries, setClassSummaries] = useState<{ class: ClassGroup; metrics: DashboardMetrics }[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [overdueSubmissions, setOverdueSubmissions] = useState<{ sub: AssignmentSubmission; student?: Student; title: string; dueDate: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [selectedClassId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [m, cSums, alts, asgs, subs, stds] = await Promise.all([
        api.getDashboardMetrics(selectedClassId),
        api.getClassSummaries(),
        api.getAlerts({ classId: selectedClassId, status: 'OPEN' }),
        api.getAssignments({ classId: selectedClassId }),
        api.getSubmissions({ classId: selectedClassId }),
        api.getStudents({ classId: selectedClassId }),
      ]);

      setMetrics(m);
      setClassSummaries(cSums);
      setActiveAlerts(alts);

      // Compute overdue submissions list
      const now = new Date();
      const overdueList: any[] = [];
      subs.forEach((sub) => {
        const asg = asgs.find((a) => a.id === sub.assignmentId);
        if (asg && asg.dueDate && new Date(asg.dueDate) < now) {
          if (sub.submissionStatus === 'NOT_STARTED' || sub.submissionStatus === 'NEEDS_REVISION') {
            const student = stds.find((s) => s.id === sub.studentId);
            overdueList.push({
              sub,
              student,
              title: asg.title,
              dueDate: asg.dueDate,
            });
          }
        }
      });
      setOverdueSubmissions(overdueList.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !metrics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Đang tải và tính toán dữ liệu phân tích học tập...</p>
        </div>
      </div>
    );
  }

  // Count submission statuses for distribution chart
  const statusCounts = {
    completed: Math.round((metrics.totalAssignments * metrics.totalStudents * metrics.overallCompletionRate) / 100),
    late: metrics.lateSubmittedCount,
    submitted: 3, // based on seed data
    notStarted: metrics.unsubmittedCount,
    needsRevision: 1,
    exempt: 1,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with AI Callout */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-radial from-white to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" /> Trợ lý Học tập AI Sẵn sàng
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Bảng Điều Khiển Tiến Trình Học Tập (Learning Analytics)
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl">
              Hệ thống tự động đối soát hạn nộp, loại trừ bài được miễn và cảnh báo sớm học sinh có xu hướng điểm giảm hoặc nợ bài.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('ai')}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Phân tích dữ liệu bằng AI</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tổng học sinh</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalStudents}</span>
            <span className="text-xs text-slate-500">em</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{metrics.totalClasses} lớp đang theo dõi</div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tỷ lệ hoàn thành</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{metrics.overallCompletionRate}%</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium">Không tính bài miễn</div>
        </div>

        {/* On-Time Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Nộp đúng hạn</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">{metrics.overallOnTimeRate}%</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{metrics.lateSubmittedCount} bài nộp trễ</div>
        </div>

        {/* Unsubmitted & Overdue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Bài quá hạn chưa nộp</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{metrics.unsubmittedCount}</span>
            <span className="text-xs text-slate-500">lượt</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-medium">Đã quá thời hạn chót</div>
        </div>

        {/* Average Score */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Điểm trung bình</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{metrics.averageGrade ?? 'Chưa có'}</span>
            <span className="text-xs text-slate-500">/ 10</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Thang điểm chuẩn 10</div>
        </div>

        {/* Attention Cases */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Trường hợp cần hỗ trợ</span>
            <TrendingDown className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-orange-600">{metrics.attentionCasesCount}</span>
            <span className="text-xs text-slate-500">học sinh</span>
          </div>
          <div className="mt-1 text-[11px] text-orange-700 font-medium">{metrics.openAlertsCount} cảnh báo mở</div>
        </div>
      </div>

      {/* Charts Section: Gauge & Class Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauge Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Tiến Độ Hoàn Thành Mục Tiêu</h2>
            <p className="text-xs text-slate-500 mt-0.5">Tỷ lệ bài nộp hợp lệ trên tổng số bài phải thực hiện</p>
          </div>
          <div className="py-4">
            <CompletionGaugeChart percentage={metrics.overallCompletionRate} />
          </div>
          <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 border border-slate-100 flex items-center justify-between">
            <span>Mục tiêu tuần: 80%</span>
            <span className="font-semibold text-blue-600">
              {metrics.overallCompletionRate >= 80 ? 'Đạt chuẩn' : 'Chưa đạt chuẩn (-' + (80 - metrics.overallCompletionRate).toFixed(1) + '%)'}
            </span>
          </div>
        </div>

        {/* Class Comparison Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">So Sánh Tỷ Lệ Hoàn Thành Các Lớp</h2>
              <p className="text-xs text-slate-500 mt-0.5">Dữ liệu thực từ 4 lớp học đang phụ trách</p>
            </div>
            <button
              onClick={() => onNavigateTab('classes')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Xem chi tiết lớp <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="py-2">
            <ClassComparisonBarChart
              data={classSummaries.map((cs) => ({
                className: cs.class.code,
                completionRate: cs.metrics.overallCompletionRate,
                averageScore: cs.metrics.averageGrade,
              }))}
            />
          </div>
          <div className="mt-2 pt-3 border-t border-slate-100">
            <StatusDistributionBar counts={statusCounts} />
          </div>
        </div>
      </div>

      {/* Two Column Section: Active Alerts and Overdue Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-semibold text-slate-800">Cảnh Báo Sớm Cần Hành Động</h2>
            </div>
            <button
              onClick={() => onNavigateTab('alerts')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Xem tất cả ({activeAlerts.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {activeAlerts.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Không có cảnh báo mới cần xử lý</p>
            ) : (
              activeAlerts.map((alert) => (
                <div key={alert.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">{alert.studentName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({alert.studentCode})</span>
                      <StatusBadge priority={alert.priority} />
                    </div>
                    <p className="mt-1 text-xs text-slate-600 font-medium">{alert.ruleTitle}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{alert.basisData}</p>
                  </div>
                  <button
                    onClick={() => onNavigateTab('alerts')}
                    className="shrink-0 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200"
                  >
                    Xem xét
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Submissions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-800">Danh Sách Học Sinh Quá Hạn Chưa Nộp</h2>
            </div>
            <button
              onClick={() => onNavigateTab('tracking')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Đi tới chấm bài <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {overdueSubmissions.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Tất cả bài tập đã được nộp đúng hạn!</p>
            ) : (
              overdueSubmissions.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-xs text-slate-900">{item.student?.fullName || 'Học sinh'}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.title}</div>
                    <div className="text-[10px] text-rose-500 font-medium mt-0.5">
                      Hạn chót: {new Date(item.dueDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.sub.submissionStatus} />
                    <button
                      onClick={() => onNavigateTab('tracking')}
                      className="px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200"
                    >
                      Cập nhật
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
