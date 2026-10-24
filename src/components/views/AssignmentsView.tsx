import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Edit2,
  Trash2,
  Users,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { Assignment, Subject, ClassGroup, AssignmentSubmission } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../common/Modal.tsx';

interface AssignmentsViewProps {
  onNavigateTracking?: (assignmentId: string) => void;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({ onNavigateTracking }) => {
  const { canEdit, selectedClassId } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false);

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formClassIds, setFormClassIds] = useState<string[]>(['cls_10a1']);
  const [formAssignedDate, setFormAssignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDueDate, setFormDueDate] = useState('');
  const [formMaxScore, setFormMaxScore] = useState(10);

  useEffect(() => {
    loadData();
  }, [selectedClassId, subjectFilter, statusFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [asgList, subList, clsList, subms] = await Promise.all([
        api.getAssignments({
          classId: selectedClassId || undefined,
          subjectId: subjectFilter || undefined,
          status: statusFilter || undefined,
        }),
        api.getSubjects(),
        api.getClasses(),
        api.getSubmissions({ classId: selectedClassId || undefined }),
      ]);
      setAssignments(asgList);
      setSubjects(subList);
      setClasses(clsList);
      setSubmissions(subms);
      if (subList.length > 0 && !formSubjectId) {
        setFormSubjectId(subList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAssignment) {
        await api.updateAssignment(editingAssignment.id, {
          title: formTitle,
          description: formDesc,
          subjectId: formSubjectId,
          classIds: formClassIds,
          assignedDate: `${formAssignedDate}T08:00:00Z`,
          dueDate: `${formDueDate}T23:59:59Z`,
          maxScore: formMaxScore,
        });
      } else {
        await api.createAssignment({
          title: formTitle,
          description: formDesc,
          subjectId: formSubjectId,
          classIds: formClassIds,
          assignedDate: `${formAssignedDate}T08:00:00Z`,
          dueDate: `${formDueDate}T23:59:59Z`,
          maxScore: formMaxScore,
          status: 'ACTIVE',
          createdBy: 'Giáo viên phụ trách',
        });
      }
      setShowAddModal(false);
      setEditingAssignment(null);
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormSubjectId(subjects[0]?.id || 'sub_math');
    setFormClassIds([classes[0]?.id || 'cls_10a1']);
    setFormAssignedDate(new Date().toISOString().slice(0, 10));
    setFormDueDate('');
    setFormMaxScore(10);
  };

  const openEdit = (asg: Assignment) => {
    setEditingAssignment(asg);
    setFormTitle(asg.title);
    setFormDesc(asg.description);
    setFormSubjectId(asg.subjectId);
    setFormClassIds(asg.classIds);
    setFormAssignedDate(asg.assignedDate.slice(0, 10));
    setFormDueDate(asg.dueDate ? asg.dueDate.slice(0, 10) : '');
    setFormMaxScore(asg.maxScore);
    setShowAddModal(true);
  };

  const handleToggleStatus = async (asg: Assignment) => {
    const nextStatus = asg.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    try {
      await api.updateAssignment(asg.id, { status: nextStatus });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      setIsDeletingAssignment(true);
      await api.deleteAssignment(assignmentToDelete.id);
      setAssignmentToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa bài tập');
    } finally {
      setIsDeletingAssignment(false);
    }
  };

  const now = new Date();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản Lý Bài Tập</h1>
          <p className="text-xs text-slate-500 mt-1">
            Giao bài tập theo lớp, quản lý thời hạn nộp và thiết lập tiêu chí đánh giá
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setEditingAssignment(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Bài Tập Mới</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">Tất cả môn học</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">Tất cả trạng thái bài</option>
            <option value="ACTIVE">Đang mở (ACTIVE)</option>
            <option value="CLOSED">Đã đóng (CLOSED)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
          </select>
        </div>

        <div className="text-xs font-medium text-slate-500">
          Tổng số <strong className="text-blue-600">{assignments.length}</strong> bài tập
        </div>
      </div>

      {/* Assignment Cards */}
      <div className="space-y-4">
        {assignments.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
            Chưa có bài tập nào được giao phù hợp với tiêu chí lọc
          </div>
        ) : (
          assignments.map((asg) => {
            const subject = subjects.find((s) => s.id === asg.subjectId);
            const asgSubs = submissions.filter((s) => s.assignmentId === asg.id);
            const completedCount = asgSubs.filter((s) => s.submissionStatus === 'COMPLETED').length;
            const submittedCount = asgSubs.filter((s) => s.submissionStatus === 'SUBMITTED' || s.submissionStatus === 'LATE_SUBMITTED').length;
            const exemptCount = asgSubs.filter((s) => s.submissionStatus === 'EXEMPT').length;
            const effectiveTotal = asgSubs.length - exemptCount;
            const completionPct = effectiveTotal > 0 ? Math.round((completedCount / effectiveTotal) * 100) : 0;

            const isPastDue = asg.dueDate ? new Date(asg.dueDate) < now : false;

            return (
              <div
                key={asg.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left content */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {subject?.name || 'Môn học'}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        asg.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {asg.status === 'ACTIVE' ? 'Đang mở' : 'Đã đóng'}
                    </span>
                    {isPastDue && asg.status === 'ACTIVE' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                        Đã quá hạn nộp
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{asg.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{asg.description}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Lớp áp dụng:{' '}
                        <strong className="text-slate-700">
                          {asg.classIds
                            .map((cid) => classes.find((c) => c.id === cid)?.code || cid)
                            .join(', ')}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Giao: {new Date(asg.assignedDate).toLocaleDateString('vi-VN')}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className={isPastDue ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                        Hạn nộp: {new Date(asg.dueDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right stats and action buttons */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right space-y-1">
                    <div className="text-xs text-slate-500">
                      Đã chấm: <strong className="text-emerald-600">{completedCount}</strong> / {effectiveTotal} (
                      {completionPct}%)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Chờ chấm: <strong>{submittedCount}</strong> bài
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onNavigateTracking && (
                      <button
                        onClick={() => onNavigateTracking(asg.id)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                      >
                        <span>Sổ chấm bài</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canEdit && (
                      <>
                        <button
                          onClick={() => openEdit(asg)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                          title="Sửa bài tập"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(asg)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                          title={asg.status === 'ACTIVE' ? 'Đóng bài tập' : 'Mở lại bài tập'}
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setAssignmentToDelete(asg)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                          title="Xóa bài tập"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Assignment Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingAssignment ? 'Chỉnh Sửa Bài Tập' : 'Tạo Bài Tập Mới'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu Đề Bài Tập</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Bài tập 05: Chuyên đề Đại số & Phương trình"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mô Tả & Yêu Cầu</label>
            <textarea
              rows={3}
              required
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Yêu cầu làm các bài tập từ câu 1 đến 5 trang 42..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Môn Học</label>
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Thang Điểm Tối Đa</label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={formMaxScore}
                onChange={(e) => setFormMaxScore(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Giao</label>
              <input
                type="date"
                required
                value={formAssignedDate}
                onChange={(e) => setFormAssignedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hạn Nộp Bài (Deadline)</label>
              <input
                type="date"
                required
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Giao Cho Các Lớp</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {classes.map((cls) => {
                const checked = formClassIds.includes(cls.id);
                return (
                  <label
                    key={cls.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                      checked
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormClassIds([...formClassIds, cls.id]);
                        } else {
                          setFormClassIds(formClassIds.filter((id) => id !== cls.id));
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{cls.code}</span>
                  </label>
                );
              })}
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
              {editingAssignment ? 'Lưu Thay Đổi' : 'Tạo Bài Tập'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!assignmentToDelete}
        onClose={() => !isDeletingAssignment && setAssignmentToDelete(null)}
        title="Xác Nhận Xóa Bài Tập"
        maxWidth="md"
      >
        {assignmentToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 space-y-1">
                <p className="font-bold">Hành động này sẽ xóa toàn bộ bài nộp của học sinh!</p>
                <p>
                  Tất cả trạng thái nộp bài, điểm số và nhận xét liên quan đến bài tập "{assignmentToDelete.title}" sẽ bị xóa vĩnh viễn.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Tiêu đề bài tập:</span>
                <span className="font-bold text-slate-800">{assignmentToDelete.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hạn nộp:</span>
                <span className="font-medium text-slate-800">
                  {new Date(assignmentToDelete.dueDate).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lớp áp dụng:</span>
                <span className="font-medium text-slate-800">
                  {assignmentToDelete.classIds
                    .map((cid) => classes.find((c) => c.id === cid)?.code || cid)
                    .join(', ')}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingAssignment}
                onClick={() => setAssignmentToDelete(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingAssignment}
                onClick={handleDeleteAssignment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingAssignment ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
