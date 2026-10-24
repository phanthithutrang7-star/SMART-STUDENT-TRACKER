import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  UploadCloud,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Student, Assignment, AssignmentSubmission, Assessment, AssessmentResult, StudentAnalytics } from '../../types/index.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { Modal } from '../common/Modal.tsx';

export const StudentPortalView: React.FC = () => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.studentId || 'std_01';

  const [student, setStudent] = useState<Student | null>(null);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Submit Modal
  const [submittingAssignment, setSubmittingAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      const [detail, asgs, asms] = await Promise.all([
        api.getStudentDetail(studentId),
        api.getAssignments(),
        api.getAssessments(),
      ]);

      setStudent(detail.student);
      setAnalytics(detail.analytics);
      setSubmissions(detail.submissions);
      setResults(detail.results);
      setAssignments(asgs);
      setAssessments(asms);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSubmit = (asg: Assignment) => {
    setSubmittingAssignment(asg);
    setSubmissionContent('');
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;
    try {
      setIsSubmitting(true);
      const existingSub = submissions.find((s) => s.assignmentId === submittingAssignment.id);
      if (!existingSub) return;

      const isLate = new Date() > new Date(submittingAssignment.dueDate);
      const nextStatus = isLate ? 'LATE_SUBMITTED' : 'SUBMITTED';

      await api.updateSubmission(existingSub.id, {
        submissionStatus: nextStatus,
        feedback: submissionContent.trim() ? `[Bài làm của học sinh]: ${submissionContent}` : undefined,
        note: isLate ? 'Học sinh nộp bài muộn sau hạn chót' : 'Học sinh nộp bài trực tuyến đúng hạn',
      });

      alert(isLate ? 'Đã nộp bài (Hệ thống ghi nhận nộp muộn).' : 'Nộp bài thành công! Thầy/cô sẽ sớm chấm điểm.');
      setSubmittingAssignment(null);
      loadStudentData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !student || !analytics) {
    return <div className="p-8 text-center text-xs text-slate-400">Đang tải góc học tập cá nhân...</div>;
  }

  const now = new Date();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold">
              Góc Học Tập Cá Nhân
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
              Xin chào, {student.fullName}!
            </h1>
            <p className="text-xs text-blue-200 mt-0.5">
              Mã học sinh: <strong>{student.studentCode}</strong> • Lớp: <strong>{analytics.className}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge trend={analytics.scoreTrend} />
          </div>
        </div>
      </div>

      {/* Progress KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tỷ lệ hoàn thành</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{analytics.completionRate}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Đã làm {analytics.completedAssignments} / {analytics.totalAssignmentsAssigned} bài
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Nộp đúng hạn</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">{analytics.onTimeRate}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {analytics.lateSubmittedAssignments} bài nộp muộn
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Điểm kiểm tra TB</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {analytics.averageScore ?? '—'} <span className="text-xs font-normal text-slate-400">/ 10</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Thang điểm 10</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Bài cần hoàn thành</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{analytics.overdueAssignments}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">Bài tập quá hạn</div>
        </div>
      </div>

      {/* Homework List & Deadlines */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Danh Sách Bài Tập Của Tôi</h3>
          </div>
          <span className="text-xs text-slate-500">
            Tổng cộng: <strong>{submissions.length}</strong> bài tập
          </span>
        </div>

        <div className="space-y-3">
          {submissions.map((sub) => {
            const asg = assignments.find((a) => a.id === sub.assignmentId);
            if (!asg) return null;

            const isPastDue = asg.dueDate ? new Date(asg.dueDate) < now : false;
            const canSubmitOnline =
              sub.submissionStatus === 'NOT_STARTED' || sub.submissionStatus === 'NEEDS_REVISION';

            return (
              <div
                key={sub.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={sub.submissionStatus} />
                    {isPastDue && sub.submissionStatus === 'NOT_STARTED' && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Quá hạn
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{asg.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-1">{asg.description}</p>
                  <div className="text-[11px] text-slate-400">
                    Hạn nộp:{' '}
                    <strong className={isPastDue ? 'text-rose-600' : 'text-slate-700'}>
                      {new Date(asg.dueDate).toLocaleDateString('vi-VN')}
                    </strong>
                    {sub.score !== null && sub.score !== undefined && (
                      <span className="ml-3 font-semibold text-emerald-600">
                        • Điểm của bạn: {sub.score}/10
                      </span>
                    )}
                  </div>

                  {sub.feedback && (
                    <div className="p-2 bg-slate-50 rounded text-[11px] text-slate-700 mt-1 border border-slate-100 flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Nhận xét của thầy/cô:</strong> {sub.feedback}
                      </div>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {canSubmitOnline && (
                    <button
                      onClick={() => handleOpenSubmit(asg)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Nộp bài ngay</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Online Submission Modal */}
      <Modal
        isOpen={!!submittingAssignment}
        onClose={() => setSubmittingAssignment(null)}
        title={`Nộp Bài Tập: ${submittingAssignment?.title}`}
        maxWidth="md"
      >
        {submittingAssignment && (
          <form onSubmit={handleSubmitHomework} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div>
                Hạn chót: <strong>{new Date(submittingAssignment.dueDate).toLocaleString('vi-VN')}</strong>
              </div>
              <div className="text-slate-600">{submittingAssignment.description}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nội Dung Bài Làm / Đường Dẫn Link Tài Liệu
              </label>
              <textarea
                rows={4}
                required
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder="Dán câu trả lời hoặc đường link Google Docs / Drive bài làm của em..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubmittingAssignment(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Đang nộp...' : 'Gửi Bài Làm'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
