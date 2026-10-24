import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Bell,
  Sparkles,
  UserCheck,
  ChevronDown,
  School,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../api/client.ts';
import { ClassGroup, Alert } from '../../types/index.ts';

interface HeaderProps {
  onNavigateAi?: () => void;
  onNavigateAlerts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateAi, onNavigateAlerts }) => {
  const { currentUser, users, switchUser, selectedClassId, setSelectedClassId, isStudent } = useAuth();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    api.getClasses().then(setClasses).catch(console.error);
    api.getAlerts({ status: 'OPEN' }).then(setAlerts).catch(console.error);
  }, []);

  const openAlertCount = alerts.length;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Branding & Sub-title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                SMART STUDENT TRACKER
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                v1.0 EdTech
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              Theo dõi tiến trình học tập & can thiệp sớm bằng Dữ liệu và AI
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Class Selector Filter (hidden for students) */}
          {!isStudent && (
            <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <School className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium hidden sm:inline">Phạm vi lớp:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="">Tất cả các lớp</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick AI Trigger */}
          <button
            onClick={onNavigateAi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
            title="Mở Trợ lý Giáo dục AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trợ lý AI</span>
          </button>

          {/* Alert Notification Bell */}
          <button
            onClick={onNavigateAlerts}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Danh sách cảnh báo sớm"
          >
            <Bell className="w-5 h-5" />
            {openAlertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                {openAlertCount}
              </span>
            )}
          </button>

          {/* RBAC Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors"
            >
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
                alt={currentUser?.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-300"
              />
              <div className="hidden lg:block text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">{currentUser?.name}</div>
                <div className="text-[10px] font-medium text-blue-600">
                  {currentUser?.role === 'ADMIN'
                    ? 'Quản trị viên (ADMIN)'
                    : currentUser?.role === 'TEACHER'
                    ? 'Giáo viên bộ môn'
                    : currentUser?.role === 'SCHOOL_MANAGER'
                    ? 'Ban Giám Hiệu'
                    : 'Học sinh'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Switch User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Chuyển tài khoản demo (RBAC)
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs hover:bg-blue-50 transition-colors ${
                        currentUser?.id === u.id ? 'bg-blue-50/60 font-medium' : ''
                      }`}
                    >
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <div className="flex-1 truncate">
                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                          <span>{u.name}</span>
                          {currentUser?.id === u.id && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {u.role === 'ADMIN'
                            ? 'Admin - Toàn quyền quản trị'
                            : u.role === 'TEACHER'
                            ? 'Giáo viên phụ trách lớp'
                            : u.role === 'SCHOOL_MANAGER'
                            ? 'Cán bộ quản lý trường'
                            : 'Học sinh (Xem bài & tiến độ)'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
