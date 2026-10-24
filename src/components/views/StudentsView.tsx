import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  ArrowRightLeft,
  UserCheck,
  Eye,
  Edit2,
  Calendar,
  Phone,
  Mail,
  History,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { Student, ClassGroup, StudentAnalytics, AssignmentSubmission, AssessmentResult, Alert } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../common/Modal.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';

export const StudentsView: React.FC = () => {
  const { canEdit, selectedClassId } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState(selectedClassId || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Profile Modal
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<{
    student: Student;
    analytics: StudentAnalytics;
    submissions: AssignmentSubmission[];
    results: AssessmentResult[];
    alerts: Alert[];
  } | null>(null);

  // Transfer Modal
  const [transferTarget, setTransferTarget] = useState<Student | null>(null);
  const [transferToClassId, setTransferToClassId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Add / Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [formBirthDate, setFormBirthDate] = useState('2009-01-01');
  const [formClassId, setFormClassId] = useState('cls_10a1');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formStatus, setFormStatus] = useState<Student['status']>('ACTIVE');

  useEffect(() => {
    setClassFilter(selectedClassId || '');
  }, [selectedClassId]);

  useEffect(() => {
    loadData();
  }, [classFilter, search, statusFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sList, cList] = await Promise.all([
        api.getStudents({ classId: classFilter || undefined, search: search || undefined, status: statusFilter || undefined }),
        api.getClasses(),
      ]);
      setStudents(sList);
      setClasses(cList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async (studentId: string) => {
    try {
      const detail = await api.getStudentDetail(studentId);
      setSelectedStudentDetail(detail);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget || !transferToClassId || !transferReason) return;
    try {
      await api.transferStudent(transferTarget.id, transferToClassId, transferReason);
      setTransferTarget(null);
      setTransferReason('');
      loadData();
      alert('Chuyển lớp học sinh thành công có lưu nhật ký.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, {
          studentCode: formCode,
          fullName: formName,
          gender: formGender,
          birthDate: formBirthDate,
          classId: formClassId,
          email: formEmail,
          phone: formPhone,
          parentName: formParentName,
          parentPhone: formParentPhone,
          status: formStatus,
        });
      } else {
        await api.createStudent({
          studentCode: formCode,
          fullName: formName,
          gender: formGender,
          birthDate: formBirthDate,
          classId: formClassId,
          email: formEmail,
          phone: formPhone,
          parentName: formParentName,
          parentPhone: formParentPhone,
          status: 'ACTIVE',
        });
      }
      setShowAddModal(false);
      setEditingStudent(null);
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setFormCode('');
    setFormName('');
    setFormGender('Nam');
    setFormBirthDate('2009-01-01');
    setFormClassId(classes[0]?.id || 'cls_10a1');
    setFormEmail('');
    setFormPhone('');
    setFormParentName('');
    setFormParentPhone('');
    setFormStatus('ACTIVE');
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setFormCode(s.studentCode);
    setFormName(s.fullName);
    setFormGender(s.gender);
    setFormBirthDate(s.birthDate);
    setFormClassId(s.classId);
    setFormEmail(s.email);
    setFormPhone(s.phone || '');
    setFormParentName(s.parentName || '');
    setFormParentPhone(s.parentPhone || '');
    setFormStatus(s.status);
    setShowAddModal(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hồ Sơ Học Sinh</h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý mã định danh ổn định, thông tin liên lạc và theo dõi lịch sử chuyển lớp
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setEditingStudent(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Học Sinh Mới</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Tên, Mã định danh, Email..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">Tất cả các lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang theo học</option>
            <option value="TRANSFERRED">Đã chuyển lớp</option>
            <option value="DROPPED">Thôi học</option>
            <option value="GRADUATED">Đã tốt nghiệp</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Tìm thấy <span className="text-blue-600 font-bold">{students.length}</span> học sinh
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã định danh</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4">Giới tính</th>
                <th className="py-3 px-4">Lớp hiện tại</th>
                <th className="py-3 px-4">Liên hệ & Phụ huynh</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const studentClass = classes.find((c) => c.id === student.classId);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {student.studentCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{student.fullName}</div>
                        <div className="text-[11px] text-slate-400">{student.email}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{student.gender}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {studentClass?.code || 'Chưa phân lớp'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>PH: {student.parentName || 'Chưa có'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{student.parentPhone || student.phone || '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            student.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {student.status === 'ACTIVE' ? 'Đang học' : student.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(student.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Xem chi tiết hồ sơ học tập"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => openEdit(student)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                title="Chỉnh sửa thông tin"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setTransferTarget(student);
                                  setTransferToClassId('');
                                }}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                title="Chuyển lớp"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Comprehensive Detail Modal */}
      <Modal
        isOpen={!!selectedStudentDetail}
        onClose={() => setSelectedStudentDetail(null)}
        title={`Hồ Sơ Học Tập: ${selectedStudentDetail?.student.fullName} (${selectedStudentDetail?.student.studentCode})`}
        maxWidth="2xl"
      >
        {selectedStudentDetail && (
          <div className="space-y-6">
            {/* Quick KPI Stats */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-center">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Hoàn thành bài</span>
                <p className="text-lg font-bold text-slate-900">{selectedStudentDetail.analytics.completionRate}%</p>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Nộp đúng hạn</span>
                <p className="text-lg font-bold text-indigo-600">{selectedStudentDetail.analytics.onTimeRate}%</p>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Điểm trung bình</span>
                <p className="text-lg font-bold text-amber-600">
                  {selectedStudentDetail.analytics.averageScore ?? '—'}
                </p>
              </div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Xu hướng</span>
                <div className="mt-0.5">
                  <StatusBadge trend={selectedStudentDetail.analytics.scoreTrend} />
                </div>
              </div>
            </div>

            {/* Explanation card */}
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs text-blue-900">
              <strong>Căn cứ tính toán: </strong>
              {selectedStudentDetail.analytics.trendExplanation}
            </div>

            {/* Risk warnings if any */}
            {selectedStudentDetail.analytics.riskFlags.length > 0 && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Dấu hiệu cần theo dõi hỗ trợ:
                </div>
                <ul className="list-disc list-inside">
                  {selectedStudentDetail.analytics.riskFlags.map((rf, idx) => (
                    <li key={idx}>{rf}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submissions Timeline */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Lịch sử nộp bài tập ({selectedStudentDetail.submissions.length} bài)
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedStudentDetail.submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">Mã bài: {sub.assignmentId}</span>
                      <div className="text-[11px] text-slate-500">
                        {sub.submittedAt ? `Nộp: ${new Date(sub.submittedAt).toLocaleDateString('vi-VN')}` : 'Chưa nộp bài'}
                        {sub.score !== null && sub.score !== undefined && ` • Điểm: ${sub.score}/10`}
                      </div>
                    </div>
                    <StatusBadge status={sub.submissionStatus} />
                  </div>
                ))}
              </div>
            </div>

            {/* Transfer History */}
            {selectedStudentDetail.student.transferHistory && selectedStudentDetail.student.transferHistory.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> Lịch sử chuyển lớp
                </h4>
                <div className="space-y-1.5 text-xs text-slate-600">
                  {selectedStudentDetail.student.transferHistory.map((tr) => (
                    <div key={tr.id} className="p-2 rounded bg-amber-50/50 border border-amber-200">
                      <span className="font-semibold text-slate-800">{new Date(tr.date).toLocaleDateString('vi-VN')}:</span> Chuyển từ{' '}
                      <strong>{tr.fromClassId}</strong> sang <strong>{tr.toClassId}</strong>. Lý do: {tr.reason} (Thực hiện bởi: {tr.performedBy})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Transfer Student Modal */}
      <Modal
        isOpen={!!transferTarget}
        onClose={() => setTransferTarget(null)}
        title={`Chuyển Lớp Cho Học Sinh: ${transferTarget?.fullName}`}
        maxWidth="md"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <p className="text-xs text-slate-600">
            Học sinh: <strong>{transferTarget?.fullName}</strong> ({transferTarget?.studentCode})
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Chọn Lớp Đích Chuyển Đến</label>
            <select
              required
              value={transferToClassId}
              onChange={(e) => setTransferToClassId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="">-- Chọn lớp tiếp nhận --</option>
              {classes
                .filter((c) => c.id !== transferTarget?.classId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lý Do Chuyển Lớp (Bắt buộc lưu nhật ký)</label>
            <textarea
              required
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Ví dụ: Phụ huynh làm đơn chuyển phân ban Tự nhiên sang Chuyên Tin..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setTransferTarget(null)}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              Xác Nhận Chuyển Lớp
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingStudent ? `Sửa Thông Tin: ${editingStudent.fullName}` : 'Thêm Học Sinh Mới'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Định Danh Học Sinh (Duy nhất)</label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="HS2025-1009"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ Và Tên</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Giới Tính</label>
              <select
                value={formGender}
                onChange={(e) => setFormGender(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Sinh</label>
              <input
                type="date"
                required
                value={formBirthDate}
                onChange={(e) => setFormBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lớp Học</label>
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Học Sinh</label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="hocsinh@smarttracker.edu.vn"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại Học Sinh</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="0912..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ Tên Phụ Huynh</label>
              <input
                type="text"
                value={formParentName}
                onChange={(e) => setFormParentName(e.target.value)}
                placeholder="Nguyễn Văn B"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SĐT Phụ Huynh (Nhận thông báo)</label>
              <input
                type="tel"
                value={formParentPhone}
                onChange={(e) => setFormParentPhone(e.target.value)}
                placeholder="0987..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
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
              {editingStudent ? 'Lưu Thông Tin' : 'Thêm Học Sinh'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
