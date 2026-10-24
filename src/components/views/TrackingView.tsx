import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCheck,
  Edit3,
  History,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { Assignment, AssignmentSubmission, Student, ClassGroup, SubmissionStatus } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { Modal } from '../common/Modal.tsx';

interface TrackingViewProps {
  initialAssignmentId?: string;
}

export const TrackingView: React.FC<TrackingViewProps> = ({ initialAssignmentId }) => {
  const { canGrade, selectedClassId } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAsgId, setSelectedAsgId] = useState<string>(initialAssignmentId || '');
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Single Edit / Grade Modal
  const [gradingSubm, setGradingSubm] = useState<AssignmentSubmission | null>(null);
  const [modalStatus, setModalStatus] = useState<SubmissionStatus>('COMPLETED');
  const [modalScore, setModalScore] = useState<string>('');
  const [modalFeedback, setModalFeedback] = useState<string>('');
  const [modalNote, setModalNote] = useState<string>('');

  // Batch Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState<SubmissionStatus>('COMPLETED');
  const [batchFeedback, setBatchFeedback] = useState('');

  useEffect(() => {
    loadBaseData();
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedAsgId) {
      loadSubmissions();
    }
  }, [selectedAsgId]);

  const loadBaseData = async () => {
    try {
      setIsLoading(true);
      const [asgList, stdList, clsList] = await Promise.all([
        api.getAssignments({ classId: selectedClassId || undefined }),
        api.getStudents({ classId: selectedClassId || undefined }),
        api.getClasses(),
      ]);
      setAssignments(asgList);
      setStudents(stdList);
      setClasses(clsList);

      const defaultAsg = initialAssignmentId
        ? asgList.find((a) => a.id === initialAssignmentId)
        : asgList[0];
      if (defaultAsg) {
        setSelectedAsgId(defaultAsg.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      const subs = await api.getSubmissions({ assignmentId: selectedAsgId });
      setSubmissions(subs);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  const openGradingModal = (subm: AssignmentSubmission) => {
    setGradingSubm(subm);
    setModalStatus(subm.submissionStatus);
    setModalScore(subm.score !== null && subm.score !== undefined ? String(subm.score) : '');
    setModalFeedback(subm.feedback || '');
    setModalNote('');
  };

  const handleSaveGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubm) return;
    try {
      const parsedScore = modalScore.trim() === '' ? null : Number(modalScore);
      if (parsedScore !== null && (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 10)) {
        alert('Điểm số phải từ 0 đến 10.');
        return;
      }

      await api.updateSubmission(gradingSubm.id, {
        submissionStatus: modalStatus,
        score: parsedScore,
        feedback: modalFeedback,
        note: modalNote,
      });

      setGradingSubm(null);
      loadSubmissions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBatchUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    try {
      await api.batchUpdateSubmissions(selectedIds, batchStatus, batchFeedback);
      setShowBatchModal(false);
      setSelectedIds([]);
      loadSubmissions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered submissions
  const currentAssignment = assignments.find((a) => a.id === selectedAsgId);
  const filteredSubmissions = submissions.filter((sub) => {
    if (statusFilter && sub.submissionStatus !== statusFilter) return false;
    if (search) {
      const std = students.find((s) => s.id === sub.studentId);
      const query = search.toLowerCase();
      const matchName = std?.fullName.toLowerCase().includes(query);
      const matchCode = std?.studentCode.toLowerCase().includes(query);
      if (!matchName && !matchCode) return false;
    }
    return true;
  });

  // Calculate completion rate: Completed / (Total - Exempt)
  const totalAssigned = submissions.length;
  const exemptCount = submissions.filter((s) => s.submissionStatus === 'EXEMPT').length;
  const completedCount = submissions.filter((s) => s.submissionStatus === 'COMPLETED').length;
  const lateCount = submissions.filter((s) => s.submissionStatus === 'LATE_SUBMITTED').length;
  const effectiveTotal = totalAssigned - exemptCount;
  const completionRate = effectiveTotal > 0 ? Math.round((completedCount / effectiveTotal) * 1000) / 10 : 100;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Theo Dõi Bài Nộp & Chấm Điểm</h1>
          <p className="text-xs text-slate-500 mt-1">
            Cập nhật trạng thái nộp bài, ghi nhận lịch sử điều chỉnh và tính toán tỷ lệ hoàn thành chính xác
          </p>
        </div>

        {canGrade && selectedIds.length > 0 && (
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>Cập nhật hàng loạt ({selectedIds.length} bài)</span>
          </button>
        )}
      </div>

      {/* Assignment Picker & Stats Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <span className="text-xs font-semibold text-slate-600 shrink-0">Chọn bài tập:</span>
            <select
              value={selectedAsgId}
              onChange={(e) => setSelectedAsgId(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({new Date(a.dueDate).toLocaleDateString('vi-VN')})
                </option>
              ))}
            </select>
          </div>

          {currentAssignment && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-500">
                Hạn nộp: <strong className="text-slate-900">{new Date(currentAssignment.dueDate).toLocaleDateString('vi-VN')}</strong>
              </span>
              <span className="text-slate-500">
                Thang điểm: <strong className="text-blue-600">{currentAssignment.maxScore}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Quick KPI Strip for this assignment */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-500">Tổng được giao:</span>
            <div className="font-bold text-slate-900 text-base">{totalAssigned}</div>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            <span className="text-emerald-700 font-medium">Đã hoàn thành:</span>
            <div className="font-bold text-emerald-700 text-base">{completedCount}</div>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
            <span className="text-amber-700 font-medium">Nộp muộn:</span>
            <div className="font-bold text-amber-700 text-base">{lateCount}</div>
          </div>
          <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-600">Được miễn:</span>
            <div className="font-bold text-slate-700 text-base">{exemptCount}</div>
          </div>
          <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100 col-span-2 sm:col-span-1">
            <span className="text-blue-700 font-medium">Tỷ lệ hoàn thành:</span>
            <div className="font-bold text-blue-700 text-base">{completionRate}%</div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên học sinh, mã HS..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">Tất cả trạng thái nộp</option>
            <option value="NOT_STARTED">Chưa nộp (NOT_STARTED)</option>
            <option value="SUBMITTED">Đã nộp chờ chấm (SUBMITTED)</option>
            <option value="LATE_SUBMITTED">Nộp muộn (LATE_SUBMITTED)</option>
            <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
            <option value="NEEDS_REVISION">Cần chỉnh sửa (NEEDS_REVISION)</option>
            <option value="EXEMPT">Được miễn (EXEMPT)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Hiển thị <strong>{filteredSubmissions.length}</strong> / {submissions.length} học sinh
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                {canGrade && (
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length > 0 && selectedIds.length === filteredSubmissions.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredSubmissions.map((s) => s.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="py-3 px-4">Mã HS</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4">Lớp</th>
                <th className="py-3 px-4">Trạng thái nộp bài</th>
                <th className="py-3 px-4">Thời gian nộp</th>
                <th className="py-3 px-4">Điểm số</th>
                <th className="py-3 px-4">Nhận xét của GV</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Không có học sinh nào phù hợp tiêu chí lọc
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const student = students.find((s) => s.id === sub.studentId);
                  const isChecked = selectedIds.includes(sub.id);

                  return (
                    <tr key={sub.id} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-blue-50/30' : ''}`}>
                      {canGrade && (
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds([...selectedIds, sub.id]);
                              } else {
                                setSelectedIds(selectedIds.filter((id) => id !== sub.id));
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {student?.studentCode || sub.studentId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {student?.fullName || 'Học sinh'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-700">
                          {classes.find((c) => c.id === student?.classId)?.code || '10A1'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sub.submissionStatus} />
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {sub.score !== null && sub.score !== undefined ? (
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">
                            {sub.score}/10
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa chấm</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {sub.feedback || <span className="text-slate-400 italic">Chưa có nhận xét</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canGrade && (
                          <button
                            onClick={() => openGradingModal(sub)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 transition-colors"
                          >
                            Chấm / Sửa
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Grading Modal */}
      <Modal
        isOpen={!!gradingSubm}
        onClose={() => setGradingSubm(null)}
        title="Chấm Điểm & Cập Nhật Trạng Thái Bài Nộp"
        maxWidth="md"
      >
        {gradingSubm && (
          <form onSubmit={handleSaveGrading} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div>
                Học sinh:{' '}
                <strong>{students.find((s) => s.id === gradingSubm.studentId)?.fullName}</strong>
              </div>
              <div className="text-slate-500">Mã bài nộp: {gradingSubm.id}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng Thái Bài Nộp</label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as SubmissionStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="NOT_STARTED">Chưa nộp (NOT_STARTED)</option>
                <option value="SUBMITTED">Đã nộp, chờ chấm (SUBMITTED)</option>
                <option value="LATE_SUBMITTED">Nộp muộn (LATE_SUBMITTED)</option>
                <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
                <option value="NEEDS_REVISION">Cần chỉnh sửa lại (NEEDS_REVISION)</option>
                <option value="EXEMPT">Được miễn làm bài (EXEMPT)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Điểm Số (0 - 10, để trống nếu chưa đánh giá)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={modalScore}
                onChange={(e) => setModalScore(e.target.value)}
                placeholder="Ví dụ: 8.5"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                * Lưu ý: Điểm 0 là giá trị hợp lệ, phân biệt rõ với giá trị trống (chưa có điểm).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lời Nhận Xét Của Giáo Viên</label>
              <textarea
                rows={2}
                value={modalFeedback}
                onChange={(e) => setModalFeedback(e.target.value)}
                placeholder="Bài làm tốt, trình bày rõ ràng..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú Nhật Ký Thay Đổi</label>
              <input
                type="text"
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                placeholder="Lý do điều chỉnh trạng thái/điểm..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* History log preview */}
            {gradingSubm.history && gradingSubm.history.length > 0 && (
              <div>
                <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <History className="w-3 h-3" /> Lịch sử thay đổi trước đó:
                </h5>
                <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] text-slate-500">
                  {gradingSubm.history.map((h, i) => (
                    <div key={i} className="p-1.5 rounded bg-slate-50 border border-slate-100">
                      <strong>{new Date(h.changedAt).toLocaleDateString('vi-VN')}</strong>: {h.oldStatus} ➔{' '}
                      {h.newStatus} bởi {h.changedBy} {h.note ? `("${h.note}")` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGradingSubm(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Lưu Đánh Giá
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Batch Update Modal */}
      <Modal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title={`Cập Nhật Hàng Loạt (${selectedIds.length} bài nộp)`}
        maxWidth="md"
      >
        <form onSubmit={handleBatchUpdate} className="space-y-4">
          <p className="text-xs text-slate-600">
            Bạn đang thao tác thay đổi trạng thái đồng loạt cho <strong>{selectedIds.length}</strong> học sinh được chọn.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Chuyển Sang Trạng Thái</label>
            <select
              value={batchStatus}
              onChange={(e) => setBatchStatus(e.target.value as SubmissionStatus)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
              <option value="LATE_SUBMITTED">Nộp muộn (LATE_SUBMITTED)</option>
              <option value="EXEMPT">Được miễn (EXEMPT)</option>
              <option value="NEEDS_REVISION">Cần chỉnh sửa (NEEDS_REVISION)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú Chung</label>
            <input
              type="text"
              value={batchFeedback}
              onChange={(e) => setBatchFeedback(e.target.value)}
              placeholder="Ví dụ: Đã duyệt hoàn thành bài tập tự luyện..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBatchModal(false)}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              Xác Nhận Cập Nhật
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
