import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  RefreshCw,
  Send,
  MessageSquare,
  ShieldAlert,
  HelpCircle,
  FileText,
  User,
  Trash2,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { Alert, AlertStatus, AlertPriority, ClassGroup, Student } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { Modal } from '../common/Modal.tsx';

export const AlertsView: React.FC = () => {
  const { canEdit, selectedClassId } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Intervention Modal
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [newStatus, setNewStatus] = useState<AlertStatus>('REVIEWING');
  const [actionPlanInput, setActionPlanInput] = useState('');
  const [teacherNoteInput, setTeacherNoteInput] = useState('');

  // Delete Alert Modal
  const [alertToDelete, setAlertToDelete] = useState<Alert | null>(null);
  const [isDeletingAlert, setIsDeletingAlert] = useState(false);

  // Manual Alert / Intervention Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualTitle, setManualTitle] = useState('Kế hoạch can thiệp sư phạm cá nhân');
  const [manualReason, setManualReason] = useState('Giáo viên ghi nhận học sinh cần hỗ trợ thêm phương pháp học tập.');
  const [manualPriority, setManualPriority] = useState<AlertPriority>('MEDIUM');
  const [manualPlan, setManualPlan] = useState('Trao đổi với phụ huynh và phụ đạo thêm sau giờ học.');

  useEffect(() => {
    loadAlerts();
  }, [selectedClassId, statusFilter, priorityFilter]);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const [alts, cls, stds] = await Promise.all([
        api.getAlerts({
          classId: selectedClassId || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        }),
        api.getClasses(),
        api.getStudents({ classId: selectedClassId || undefined }),
      ]);
      setAlerts(alts);
      setClasses(cls);
      setStudents(stds);
      if (stds.length > 0 && !manualStudentId) {
        setManualStudentId(stds[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluateRules = async () => {
    try {
      setIsEvaluating(true);
      const res = await api.evaluateAlerts();
      setAlerts(res.alerts);
      alert('Đã quét toàn bộ dữ liệu học sinh và cập nhật danh sách cảnh báo!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const openInterventionModal = (alert: Alert) => {
    setSelectedAlert(alert);
    setNewStatus(alert.status);
    setActionPlanInput(alert.actionPlan || '');
    setTeacherNoteInput('');
  };

  const handleSaveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    try {
      await api.updateAlert(selectedAlert.id, {
        status: newStatus,
        actionPlan: actionPlanInput,
        note: teacherNoteInput.trim() ? teacherNoteInput : undefined,
      });

      setSelectedAlert(null);
      loadAlerts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAlert = async () => {
    if (!alertToDelete) return;
    try {
      setIsDeletingAlert(true);
      await api.deleteAlert(alertToDelete.id);
      setAlertToDelete(null);
      await loadAlerts();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa cảnh báo');
    } finally {
      setIsDeletingAlert(false);
    }
  };

  const handleCreateManualAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentId) {
      alert('Vui lòng chọn học sinh cần lập can thiệp');
      return;
    }
    try {
      await api.createAlert({
        studentId: manualStudentId,
        ruleTitle: manualTitle,
        triggerReason: manualReason,
        priority: manualPriority,
        actionPlan: manualPlan,
      });
      setShowCreateModal(false);
      setManualTitle('Kế hoạch can thiệp sư phạm cá nhân');
      setManualPlan('');
      await loadAlerts();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo can thiệp');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cảnh Báo Sớm & Kế Hoạch Can Thiệp</h1>
          <p className="text-xs text-slate-500 mt-1">
            Bộ máy phát hiện sớm dựa trên quy tắc khách quan (nợ ≥ 3 bài, tỷ lệ nộp &lt; 60%, giảm điểm kiểm tra) và can thiệp sư phạm
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Can Thiệp Mới</span>
            </button>
            <button
              onClick={handleEvaluateRules}
              disabled={isEvaluating}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
              <span>{isEvaluating ? 'Đang quét quy tắc...' : 'Quét Lại Quy Tắc (Scan)'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Philosophy Callout */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-950">
            Nguyên tắc sư phạm về Cảnh báo sớm:
          </p>
          <p className="leading-relaxed">
            Cảnh báo được sinh ra tự động nhằm mục đích <strong>hỗ trợ sư phạm và thấu hiểu học sinh</strong>, hoàn toàn không phải là kết luận về phẩm chất hay năng lực. Giáo viên cần liên hệ, tìm hiểu khó khăn của từng em để đưa ra giải pháp phù hợp.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">Tất cả trạng thái xử lý</option>
            <option value="OPEN">Mới phát hiện (OPEN)</option>
            <option value="REVIEWING">Đang xem xét (REVIEWING)</option>
            <option value="ACTION_PLANNED">Đã lập kế hoạch (ACTION_PLANNED)</option>
            <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
            <option value="DISMISSED">Đã đóng (DISMISSED)</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">Tất cả mức ưu tiên</option>
            <option value="HIGH">Ưu tiên cao (HIGH)</option>
            <option value="MEDIUM">Ưu tiên vừa (MEDIUM)</option>
            <option value="LOW">Ưu tiên thấp (LOW)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Tổng số <strong>{alerts.length}</strong> trường hợp cảnh báo
        </div>
      </div>

      {/* Alerts Cards List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
            Hiện không có trường hợp cảnh báo nào phù hợp với bộ lọc
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border p-5 transition-all shadow-xs space-y-3 ${
                alert.priority === 'HIGH'
                  ? 'border-red-200 hover:border-red-300'
                  : alert.priority === 'MEDIUM'
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-slate-200 hover:border-blue-200'
              }`}
            >
              {/* Top metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert
                    className={`w-4 h-4 ${
                      alert.priority === 'HIGH'
                        ? 'text-red-600'
                        : alert.priority === 'MEDIUM'
                        ? 'text-amber-600'
                        : 'text-blue-600'
                    }`}
                  />
                  <h3 className="text-sm font-bold text-slate-900">{alert.ruleTitle}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge priority={alert.priority} />
                  <StatusBadge status={alert.status} />
                </div>
              </div>

              {/* Student info and trigger basis */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Học sinh liên quan:</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {alert.studentName} <span className="font-mono text-xs font-normal text-slate-500">({alert.studentCode})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Lớp: {alert.className}</div>
                </div>

                <div className="md:col-span-2">
                  <span className="text-slate-400 font-medium">Dữ liệu & Căn cứ kích hoạt:</span>
                  <div className="text-slate-800 font-medium mt-0.5">{alert.triggerReason}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{alert.basisData}</div>
                </div>
              </div>

              {/* Action plan summary */}
              {alert.actionPlan && (
                <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-100 text-xs text-indigo-900">
                  <strong>Kế hoạch can thiệp: </strong> {alert.actionPlan}
                </div>
              )}

              {/* Teacher progress notes if any */}
              {alert.teacherNotes && alert.teacherNotes.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Ghi chú trao đổi gần nhất ({alert.teacherNotes.length}):
                  </span>
                  <div className="space-y-1 text-xs text-slate-600">
                    {alert.teacherNotes.slice(-2).map((note, idx) => (
                      <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-semibold text-slate-700">{note.author}</span> (
                        {new Date(note.date).toLocaleDateString('vi-VN')}): {note.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer action bar */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Phát hiện: {new Date(alert.detectedAt).toLocaleString('vi-VN')}</span>
                  {alert.resolvedBy && <span> • Đã giải quyết bởi {alert.resolvedBy}</span>}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openInterventionModal(alert)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition-colors border border-blue-200"
                    >
                      Cập nhật kế hoạch can thiệp
                    </button>
                    <button
                      onClick={() => setAlertToDelete(alert)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                      title="Xóa cảnh báo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Intervention Plan Modal */}
      <Modal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title="Kế Hoạch Can Thiệp Sư Phạm & Theo Dõi Học Sinh"
        maxWidth="lg"
      >
        {selectedAlert && (
          <form onSubmit={handleSaveIntervention} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div>
                Học sinh: <strong>{selectedAlert.studentName}</strong> ({selectedAlert.studentCode})
              </div>
              <div className="text-slate-600">Quy tắc cảnh báo: <strong>{selectedAlert.ruleTitle}</strong></div>
              <div className="text-[11px] text-slate-500">{selectedAlert.basisData}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trạng Thái Xử Lý Cảnh Báo
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as AlertStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="OPEN">Mới phát hiện (OPEN)</option>
                <option value="REVIEWING">Đang xem xét & Trao đổi (REVIEWING)</option>
                <option value="ACTION_PLANNED">Đã lập kế hoạch hỗ trợ (ACTION_PLANNED)</option>
                <option value="RESOLVED">Đã giải quyết / Hoàn thành hỗ trợ (RESOLVED)</option>
                <option value="DISMISSED">Đã đóng / Lý do đặc biệt (DISMISSED)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kế Hoạch Hỗ Trợ Cụ Thể (Action Plan)
              </label>
              <textarea
                rows={3}
                value={actionPlanInput}
                onChange={(e) => setActionPlanInput(e.target.value)}
                placeholder="Ví dụ: Gia hạn nộp bài bổ sung đến thứ Sáu, xếp đôi bạn cùng tiến hướng dẫn bài tập đại số..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thêm Ghi Chú Tiến Độ / Nội Dung Trao Đổi Mới
              </label>
              <input
                type="text"
                value={teacherNoteInput}
                onChange={(e) => setTeacherNoteInput(e.target.value)}
                placeholder="Ví dụ: Đã gặp riêng phụ huynh, học sinh cam kết nộp bù bài số 02..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Lưu Kế Hoạch
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Manual Alert / Intervention Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Lập Kế Hoạch Can Thiệp Sư Phạm Cá Nhân"
        maxWidth="md"
      >
        <form onSubmit={handleCreateManualAlert} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Chọn Học Sinh</label>
            <select
              required
              value={manualStudentId}
              onChange={(e) => setManualStudentId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.fullName} ({st.studentCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mức Độ Ưu Tiên</label>
            <select
              value={manualPriority}
              onChange={(e) => setManualPriority(e.target.value as AlertPriority)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="HIGH">Cao (Cần hỗ trợ khẩn cấp)</option>
              <option value="MEDIUM">Trung bình (Theo dõi & nhắc nhở)</option>
              <option value="LOW">Thấp (Động viên định kỳ)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu Đề Can Thiệp</label>
            <input
              type="text"
              required
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="VD: Cần phụ đạo thêm hình học không gian"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Căn Cứ / Lý Do Can Thiệp</label>
            <textarea
              rows={2}
              required
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="Ghi nhận từ bài kiểm tra gần nhất hoặc phản ánh của giáo viên..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Biện Pháp Can Thiệp Cụ Thể</label>
            <textarea
              rows={2}
              value={manualPlan}
              onChange={(e) => setManualPlan(e.target.value)}
              placeholder="Kế hoạch gặp học sinh, giao bài tập bổ trợ hoặc thông báo cho gia đình..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              Lưu Can Thiệp
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!alertToDelete}
        onClose={() => !isDeletingAlert && setAlertToDelete(null)}
        title="Xác Nhận Xóa Cảnh Báo"
        maxWidth="md"
      >
        {alertToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 space-y-1">
                <p className="font-bold">Bạn có chắc chắn muốn xóa cảnh báo này?</p>
                <p>
                  Bản ghi cảnh báo và toàn bộ nhật ký trao đổi can thiệp của học sinh sẽ bị gỡ bỏ khỏi danh sách theo dõi.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Học sinh:</span>
                <span className="font-bold text-slate-800">{alertToDelete.studentName} ({alertToDelete.studentCode})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nội dung cảnh báo:</span>
                <span className="font-medium text-slate-800">{alertToDelete.ruleTitle}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingAlert}
                onClick={() => setAlertToDelete(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingAlert}
                onClick={handleDeleteAlert}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingAlert ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
