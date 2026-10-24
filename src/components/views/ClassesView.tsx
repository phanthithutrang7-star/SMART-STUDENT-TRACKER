import React, { useState, useEffect } from 'react';
import { School, Plus, Users, BookOpen, Edit2, Trash2, Archive, CheckCircle, Search, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../../api/client.ts';
import { ClassGroup, Student } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../common/Modal.tsx';

export const ClassesView: React.FC = () => {
  const { canEdit } = useAuth();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClassForRoster, setSelectedClassForRoster] = useState<ClassGroup | null>(null);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassGroup | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formGrade, setFormGrade] = useState(10);
  const [formTeacher, setFormTeacher] = useState('');
  const [formYear, setFormYear] = useState('2025-2026');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cList, sList] = await Promise.all([api.getClasses(), api.getStudents()]);
      setClasses(cList);
      setStudents(sList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await api.updateClass(editingClass.id, {
          code: formCode,
          name: formName,
          gradeLevel: formGrade,
          homeroomTeacher: formTeacher,
          academicYear: formYear,
        });
      } else {
        await api.createClass({
          code: formCode,
          name: formName,
          gradeLevel: formGrade,
          homeroomTeacher: formTeacher,
          academicYear: formYear,
          status: 'ACTIVE',
        });
      }
      setShowAddModal(false);
      setEditingClass(null);
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setFormCode('');
    setFormName('');
    setFormGrade(10);
    setFormTeacher('');
    setFormYear('2025-2026');
  };

  const openEdit = (c: ClassGroup) => {
    setEditingClass(c);
    setFormCode(c.code);
    setFormName(c.name);
    setFormGrade(c.gradeLevel);
    setFormTeacher(c.homeroomTeacher);
    setFormYear(c.academicYear);
    setShowAddModal(true);
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      setIsDeletingClass(true);
      await api.deleteClass(classToDelete.id);
      setClassToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa lớp học');
    } finally {
      setIsDeletingClass(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản Lý Lớp Học</h1>
          <p className="text-xs text-slate-500 mt-1">
            Phân công lớp học, quản lý sĩ số và cấu hình niên khóa đào tạo
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setEditingClass(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Lớp Mới</span>
          </button>
        )}
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {classes.map((cls) => {
          const classStudents = students.filter((s) => s.classId === cls.id && s.status === 'ACTIVE');

          return (
            <div
              key={cls.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                    Khối {cls.gradeLevel}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      cls.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cls.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã lưu trữ'}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-bold text-slate-900">{cls.code}</h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{cls.name}</p>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-slate-400" />
                    <span>GVCN: <strong className="text-slate-800">{cls.homeroomTeacher}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Sĩ số: <strong className="text-blue-600">{classStudents.length} học sinh</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <span>Niên khóa: {cls.academicYear}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedClassForRoster(cls)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                >
                  Xem danh sách ({classStudents.length})
                </button>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(cls)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      title="Chỉnh sửa thông tin lớp"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setClassToDelete(cls)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                      title="Xóa lớp học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Class Roster Modal */}
      <Modal
        isOpen={!!selectedClassForRoster}
        onClose={() => setSelectedClassForRoster(null)}
        title={`Danh Sách Học Sinh - Lớp ${selectedClassForRoster?.code}`}
        maxWidth="2xl"
      >
        {selectedClassForRoster && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <span>{selectedClassForRoster.name}</span>
              <span>GVCN: {selectedClassForRoster.homeroomTeacher}</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Mã HS</th>
                    <th className="py-2 px-3">Họ và Tên</th>
                    <th className="py-2 px-3">Giới tính</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">SĐT Phụ huynh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((s) => s.classId === selectedClassForRoster.id)
                    .map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{st.studentCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{st.fullName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{st.gender}</td>
                        <td className="py-2.5 px-3 text-slate-500">{st.email}</td>
                        <td className="py-2.5 px-3 text-slate-600">{st.parentPhone || 'Chưa cập nhật'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClassForRoster(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Class Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingClass ? `Chỉnh Sửa Lớp ${editingClass.code}` : 'Thêm Lớp Học Mới'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Lớp (Ví dụ: 10A3)</label>
            <input
              type="text"
              required
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              placeholder="10A3"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Gọi Đầy Đủ</label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              placeholder="Lớp 10A3 (Khoa học Xã hội)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Khối Lớp</label>
              <select
                value={formGrade}
                onChange={(e) => setFormGrade(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value={10}>Khối 10</option>
                <option value={11}>Khối 11</option>
                <option value={12}>Khối 12</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Niên Khóa</label>
              <input
                type="text"
                required
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Giáo Viên Chủ Nhiệm (GVCN)</label>
            <input
              type="text"
              required
              value={formTeacher}
              onChange={(e) => setFormTeacher(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              placeholder="Cô Hoàng Lan Hương"
            />
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
              {editingClass ? 'Lưu Thay Đổi' : 'Tạo Lớp Mới'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Class Confirmation Modal */}
      <Modal
        isOpen={!!classToDelete}
        onClose={() => !isDeletingClass && setClassToDelete(null)}
        title="Xác Nhận Xóa Lớp Học"
        maxWidth="md"
      >
        {classToDelete && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-bold">Quy tắc an toàn dữ liệu:</p>
                <p>
                  Hệ thống chỉ cho phép xóa lớp học khi không còn học sinh nào đang theo học trong lớp.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã lớp:</span>
                <span className="font-bold text-slate-800">{classToDelete.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tên lớp:</span>
                <span className="font-bold text-slate-900">{classToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sĩ số hiện tại:</span>
                <span className="font-semibold text-blue-600">
                  {students.filter((s) => s.classId === classToDelete.id && s.status === 'ACTIVE').length} học sinh
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingClass}
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingClass}
                onClick={handleDeleteClass}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingClass ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kiểm tra & xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác Nhận Xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
