import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
  Search,
  Sparkles,
  BookOpen,
  Layers,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { StudentAnalytics, Student, ClassGroup, Assessment, AssessmentResult, Subject } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { TrendLineChart } from '../common/Charts.tsx';

interface AnalyticsViewProps {
  onNavigateAi?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigateAi }) => {
  const { selectedClassId } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(''); // '' = Tất cả môn
  const [students, setStudents] = useState<Student[]>([]);
  const [analyticsList, setAnalyticsList] = useState<StudentAnalytics[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [trendFilter, setTrendFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Subject breakdown for selected student
  const [studentSubjectBreakdown, setStudentSubjectBreakdown] = useState<{
    subject: Subject;
    analytics: StudentAnalytics | null;
  }[]>([]);

  useEffect(() => {
    api.getSubjects().then(setSubjects).catch(console.error);
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [selectedClassId, selectedSubjectId]);

  useEffect(() => {
    if (selectedStudentId && subjects.length > 0) {
      loadStudentSubjectBreakdown(selectedStudentId);
    }
  }, [selectedStudentId, subjects]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const [stds, asms, resList] = await Promise.all([
        api.getStudents({ classId: selectedClassId || undefined, status: 'ACTIVE' }),
        api.getAssessments({
          classId: selectedClassId || undefined,
          subjectId: selectedSubjectId || undefined,
        }),
        api.getAssessmentResults(),
      ]);

      setStudents(stds);
      setAssessments(asms);
      setAssessmentResults(resList);

      const aList = await Promise.all(
        stds.map((s) => api.getStudentAnalytics(s.id, selectedSubjectId || undefined))
      );
      setAnalyticsList(aList);

      if (stds.length > 0 && (!selectedStudentId || !stds.find((s) => s.id === selectedStudentId))) {
        setSelectedStudentId(stds[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentSubjectBreakdown = async (stdId: string) => {
    try {
      const breakdown = await Promise.all(
        subjects.map(async (sub) => {
          const ana = await api.getStudentAnalytics(stdId, sub.id);
          return { subject: sub, analytics: ana };
        })
      );
      setStudentSubjectBreakdown(breakdown);
    } catch (e) {
      console.error('Error loading subject breakdown:', e);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedAnalytics = analyticsList.find((a) => a.studentId === selectedStudentId);
  const currentSubjectObj = subjects.find((s) => s.id === selectedSubjectId);

  // Student test points for SVG line chart (filtered by selected subject if active)
  const studentChartPoints = assessments
    .filter((asm) => !selectedSubjectId || asm.subjectId === selectedSubjectId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((asm) => {
      const res = assessmentResults.find(
        (r) => r.assessmentId === asm.id && r.studentId === selectedStudentId
      );
      const sub = subjects.find((s) => s.id === asm.subjectId);
      return {
        label: `${asm.type === '15_MIN' ? '15p' : asm.type === 'ONE_PERIOD' ? '1T' : 'GK'}${
          !selectedSubjectId && sub ? ` (${sub.code})` : ''
        }`,
        score: res && res.score !== null ? res.score : null,
      };
    });

  // Filtered student list
  const filteredAnalytics = analyticsList.filter((a) => {
    if (trendFilter && a.scoreTrend !== trendFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.fullName.toLowerCase().includes(q) && !a.studentCode.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Aggregate stats
  const improvingCount = analyticsList.filter((a) => a.scoreTrend === 'IMPROVING').length;
  const stableCount = analyticsList.filter((a) => a.scoreTrend === 'STABLE').length;
  const decliningCount = analyticsList.filter((a) => a.scoreTrend === 'DECLINING').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Phân Tích Tiến Trình Học Tập</h1>
            {currentSubjectObj ? (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-md border border-blue-300">
                Môn: {currentSubjectObj.name}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                Tất cả môn học (Tổng hợp)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tiến trình theo từng môn học, phát hiện sớm dấu hiệu giảm sút và giải thích căn cứ số liệu
          </p>
        </div>

        {onNavigateAi && (
          <button
            onClick={onNavigateAi}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Giải Thích Xu Hướng</span>
          </button>
        )}
      </div>

      {/* Subject Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Lọc theo môn:
          </span>

          <button
            onClick={() => setSelectedSubjectId('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedSubjectId === ''
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tất cả các môn (Tổng hợp)
          </button>

          {subjects.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedSubjectId === sub.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          Đang xem: <strong>{currentSubjectObj ? currentSubjectObj.name : 'Toàn diện tất cả môn'}</strong>
        </div>
      </div>

      {/* Aggregate Trend Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700">
              Tiến Bộ Rõ Rệt {currentSubjectObj ? `(${currentSubjectObj.name})` : ''}
            </span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{improvingCount} học sinh</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Điểm kiểm tra tăng ≥ +0.5 điểm</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            ↗
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-700">
              Duy Trì Ổn Định {currentSubjectObj ? `(${currentSubjectObj.name})` : ''}
            </span>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stableCount} học sinh</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Dao động điểm trong biên độ an toàn</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            →
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-700">
              Cần Theo Dõi {currentSubjectObj ? `(${currentSubjectObj.name})` : ''}
            </span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{decliningCount} học sinh</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Điểm kiểm tra sụt giảm ≥ -1.0 điểm</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
            ↘
          </div>
        </div>
      </div>

      {/* Two Column Layout: Student Directory on Left, Detailed Trajectory & Chart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Students List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Danh Sách Học Sinh Cần Phân Tích {currentSubjectObj ? `• Môn ${currentSubjectObj.name}` : ''}
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên hoặc mã HS..."
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <select
                value={trendFilter}
                onChange={(e) => setTrendFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden"
              >
                <option value="">Tất cả xu hướng</option>
                <option value="IMPROVING">Tiến bộ</option>
                <option value="STABLE">Ổn định</option>
                <option value="DECLINING">Cần theo dõi</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[520px]">
            {filteredAnalytics.map((ana) => {
              const isSelected = ana.studentId === selectedStudentId;

              return (
                <button
                  key={ana.studentId}
                  onClick={() => setSelectedStudentId(ana.studentId)}
                  className={`w-full text-left p-3.5 transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900">{ana.fullName}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{ana.studentCode} • {ana.className}</div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                      <span>Hoàn thành: <strong>{ana.completionRate}%</strong></span>
                      <span>•</span>
                      <span>ĐTB: <strong>{ana.averageScore ?? '—'}</strong></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge trend={ana.scoreTrend} />
                    {ana.overdueAssignments > 0 && (
                      <div className="text-[10px] text-rose-600 font-bold mt-1">
                        Nợ {ana.overdueAssignments} bài
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Student Trajectory */}
        <div className="lg:col-span-7 space-y-6">
          {selectedAnalytics && selectedStudent ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{selectedAnalytics.fullName}</h2>
                    <span className="font-mono text-xs text-slate-500">({selectedAnalytics.studentCode})</span>
                    <StatusBadge trend={selectedAnalytics.scoreTrend} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Lớp: <strong>{selectedAnalytics.className}</strong>
                    {currentSubjectObj ? (
                      <span> • Đang lọc theo môn: <strong className="text-blue-600">{currentSubjectObj.name}</strong></span>
                    ) : (
                      <span> • Phạm vi: <strong>Toàn diện tất cả môn</strong></span>
                    )}
                  </p>
                </div>
              </div>

              {/* Assessment Trend Line Chart */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Biểu Đồ Tiến Trình Điểm Số {currentSubjectObj ? `Môn ${currentSubjectObj.name}` : 'Các Đợt Kiểm Tra'}
                  </h4>
                  <span className="text-[11px] text-slate-400">Thang điểm 10</span>
                </div>
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  <TrendLineChart points={studentChartPoints} height={190} />
                </div>
              </div>

              {/* Explicit Transparent Calculation Rule */}
              <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200 text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Căn Cứ Dữ Liệu & Giải Thích Xu Hướng:</span>
                </div>
                <p className="leading-relaxed">{selectedAnalytics.trendExplanation}</p>
                <p className="text-[11px] text-blue-800/80">
                  * Mọi công thức được tính toán đối chiếu tự động, phân biệt rõ điểm 0 (có tham gia thi) với dữ liệu trống (chưa có điểm).
                </p>
              </div>

              {/* Key Indicators Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500">Bài tập hoàn thành:</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedAnalytics.completedAssignments} / {selectedAnalytics.totalAssignmentsAssigned}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500">Tỷ lệ đúng hạn:</span>
                  <div className="font-bold text-indigo-700 text-sm mt-0.5">
                    {selectedAnalytics.onTimeRate}%
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500">ĐTB Kiểm tra:</span>
                  <div className="font-bold text-amber-600 text-sm mt-0.5">
                    {selectedAnalytics.averageScore ?? '—'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500">Bài quá hạn:</span>
                  <div className="font-bold text-rose-600 text-sm mt-0.5">
                    {selectedAnalytics.overdueAssignments} bài
                  </div>
                </div>
              </div>

              {/* Subject Breakdown Matrix for this Student */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    So Sánh Tiến Độ Giữa Các Môn Của {selectedAnalytics.fullName}
                  </h4>
                  <span className="text-[11px] text-slate-400">Chi tiết từng môn</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Môn học</th>
                        <th className="py-2.5 px-3 text-center">Hoàn thành bài</th>
                        <th className="py-2.5 px-3 text-center">Bài nợ</th>
                        <th className="py-2.5 px-3 text-center">ĐTB Kiểm tra</th>
                        <th className="py-2.5 px-3 text-center">Xu hướng môn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentSubjectBreakdown.map((item) => {
                        const a = item.analytics;
                        const isCurrentActive = selectedSubjectId === item.subject.id;

                        return (
                          <tr
                            key={item.subject.id}
                            className={`hover:bg-slate-50 cursor-pointer ${
                              isCurrentActive ? 'bg-blue-50/50 font-semibold' : ''
                            }`}
                            onClick={() => setSelectedSubjectId(item.subject.id)}
                            title="Bấm để lọc chi tiết theo môn này"
                          >
                            <td className="py-2.5 px-3 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-600" />
                              <span className="text-slate-900">{item.subject.name}</span>
                              {isCurrentActive && (
                                <span className="text-[10px] text-blue-600 font-bold">(Đang chọn)</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {a ? `${a.completedAssignments}/${a.totalAssignmentsAssigned} (${a.completionRate}%)` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {a && a.overdueAssignments > 0 ? (
                                <span className="font-bold text-rose-600">{a.overdueAssignments} bài</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold font-mono text-blue-700">
                              {a?.averageScore ?? '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {a ? <StatusBadge trend={a.scoreTrend} /> : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Warnings / Risk flags */}
              {selectedAnalytics.riskFlags.length > 0 && (
                <div className="p-3.5 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4" /> Các dấu hiệu cảnh báo cần lưu ý:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-800">
                    {selectedAnalytics.riskFlags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400">
              Chọn một học sinh từ danh sách bên trái để xem biểu đồ và phân tích chi tiết
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
