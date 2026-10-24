import React from 'react';
import { SubmissionStatus, AlertPriority, AlertStatus, LearningTrend } from '../../types/index.ts';

interface StatusBadgeProps {
  status?: SubmissionStatus | AlertStatus | string;
  priority?: AlertPriority;
  trend?: LearningTrend;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, priority, trend, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  // Submission Statuses
  if (status === 'COMPLETED') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>Đã hoàn thành</span>;
  }
  if (status === 'LATE_SUBMITTED') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>Nộp muộn</span>;
  }
  if (status === 'SUBMITTED') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>Đã nộp (Chờ chấm)</span>;
  }
  if (status === 'NOT_STARTED') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>Chưa nộp</span>;
  }
  if (status === 'NEEDS_REVISION') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-orange-50 text-orange-700 border border-orange-200 ${sizeClasses}`}>Cần chỉnh sửa</span>;
  }
  if (status === 'EXEMPT') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-300 ${sizeClasses}`}>Được miễn</span>;
  }

  // Alert Priorities
  if (priority === 'HIGH') {
    return <span className={`inline-flex items-center font-semibold rounded-md bg-red-100 text-red-800 border border-red-300 ${sizeClasses}`}>Ưu tiên cao</span>;
  }
  if (priority === 'MEDIUM') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-amber-100 text-amber-800 border border-amber-300 ${sizeClasses}`}>Ưu tiên vừa</span>;
  }
  if (priority === 'LOW') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>Ưu tiên thấp</span>;
  }

  // Alert Statuses
  if (status === 'OPEN') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>Mới phát hiện</span>;
  }
  if (status === 'REVIEWING') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>Đang xem xét</span>;
  }
  if (status === 'ACTION_PLANNED') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}>Đã lập kế hoạch</span>;
  }
  if (status === 'RESOLVED') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>Đã giải quyết</span>;
  }
  if (status === 'DISMISSED') {
    return <span className={`inline-flex items-center font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-300 ${sizeClasses}`}>Đã đóng</span>;
  }

  // Learning Trends
  if (trend === 'IMPROVING') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
        <span className="text-emerald-500">↗</span> Tiến bộ
      </span>
    );
  }
  if (trend === 'STABLE') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
        <span className="text-blue-500">→</span> Ổn định
      </span>
    );
  }
  if (trend === 'DECLINING') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
        <span className="text-rose-500">↘</span> Cần theo dõi
      </span>
    );
  }
  if (trend === 'INSUFFICIENT_DATA') {
    return (
      <span className={`inline-flex items-center gap-1 font-normal rounded-md bg-slate-100 text-slate-500 border border-slate-200 ${sizeClasses}`}>
        Chưa đủ dữ liệu
      </span>
    );
  }

  return <span className={`inline-flex items-center font-medium rounded-md bg-slate-100 text-slate-700 ${sizeClasses}`}>{status || ''}</span>;
};
