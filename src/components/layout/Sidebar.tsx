import React from 'react';
import {
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  CheckSquare,
  Award,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  FileText,
  UploadCloud,
  Settings,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export type ActiveTab =
  | 'dashboard'
  | 'classes'
  | 'students'
  | 'assignments'
  | 'tracking'
  | 'assessments'
  | 'analytics'
  | 'alerts'
  | 'ai'
  | 'reports'
  | 'import_export'
  | 'admin'
  | 'student_portal';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  openAlertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, openAlertCount = 0 }) => {
  const { isStudent, isAdmin, isTeacher, isManager } = useAuth();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number | string; roleRequired?: string }[] = isStudent
    ? [
        { id: 'student_portal', label: 'Góc học tập của tôi', icon: <UserCheck className="w-4 h-4" /> },
        { id: 'assignments', label: 'Bài tập được giao', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'tracking', label: 'Trạng thái bài nộp', icon: <CheckSquare className="w-4 h-4" /> },
      ]
    : [
        { id: 'dashboard', label: 'Tổng quan (Dashboard)', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'classes', label: 'Quản lý Lớp học', icon: <School className="w-4 h-4" /> },
        { id: 'students', label: 'Danh sách Học sinh', icon: <Users className="w-4 h-4" /> },
        { id: 'assignments', label: 'Quản lý Bài tập', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'tracking', label: 'Theo dõi bài nộp', icon: <CheckSquare className="w-4 h-4" /> },
        { id: 'assessments', label: 'Sổ điểm & Đánh giá', icon: <Award className="w-4 h-4" /> },
        { id: 'analytics', label: 'Phân tích học tập', icon: <TrendingUp className="w-4 h-4" /> },
        {
          id: 'alerts',
          label: 'Cảnh báo & Can thiệp',
          icon: <AlertTriangle className="w-4 h-4" />,
          badge: openAlertCount > 0 ? openAlertCount : undefined,
        },
        {
          id: 'ai',
          label: 'Trợ lý Giáo dục AI',
          icon: <Sparkles className="w-4 h-4" />,
          badge: 'Gemini 3.8',
        },
        { id: 'reports', label: 'Báo cáo & Thống kê', icon: <FileText className="w-4 h-4" /> },
        { id: 'import_export', label: 'Nhập / Xuất dữ liệu', icon: <UploadCloud className="w-4 h-4" /> },
        {
          id: 'admin',
          label: 'Quản trị & Nhật ký',
          icon: <Settings className="w-4 h-4" />,
          roleRequired: 'ADMIN',
        },
      ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      {/* Navigation list */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          {isStudent ? 'Khu vực học sinh' : 'Chức năng nghiệp vụ'}
        </div>

        {navItems.map((item) => {
          if (item.roleRequired === 'ADMIN' && !isAdmin) return null;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-md font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : typeof item.badge === 'number'
                      ? 'bg-rose-500 text-white'
                      : 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer system status note */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-300">Máy chủ API & AI Sẵn sàng</span>
        </div>
        <p className="mt-1 text-[10px] text-slate-400 leading-tight">
          Bộ quy tắc phân tích theo chuẩn EdTech SIS & Learning Analytics
        </p>
      </div>
    </aside>
  );
};
