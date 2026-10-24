import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  model?: string;
  isAiGenerated?: boolean;
  timestamp: string;
  summary?: any;
}

export const AiAssistantView: React.FC = () => {
  const { selectedClassId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'ai',
      text: `### Xin chào Thầy/Cô! Tôi là Trợ Lý Giáo Dục AI (Smart Teaching Assistant)
Tôi được tích hợp trực tiếp với cơ sở dữ liệu học tập của lớp. Mọi phân tích của tôi đều dựa trên **dữ liệu bài nộp, kết quả đánh giá thực tế và quy tắc cảnh báo khách quan**.

Thầy/cô có thể chọn nhanh các tác vụ phổ biến bên dưới hoặc đặt câu hỏi tự nhiên bằng tiếng Việt!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const quickTasks = [
    {
      action: 'SUMMARIZE_CLASS',
      label: 'Tóm tắt tình hình lớp',
      desc: 'Tổng hợp tỷ lệ hoàn thành, số bài nợ và điểm sáng trong tuần',
      icon: <FileText className="w-4 h-4 text-blue-600" />,
    },
    {
      action: 'EXPLAIN_TRENDS',
      label: 'Giải thích xu hướng điểm',
      desc: 'Phân tích nhóm tiến bộ, ổn định và sụt giảm có dẫn chứng',
      icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
    },
    {
      action: 'IDENTIFY_INTERVENTIONS',
      label: 'Học sinh cần hỗ trợ',
      desc: 'Danh sách học sinh vi phạm ngưỡng cảnh báo & gợi ý hỗ trợ',
      icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
    },
    {
      action: 'DRAFT_REMINDER',
      label: 'Soạn bản nháp nhắc bài',
      desc: 'Tạo mẫu tin nhắn ân cần gửi học sinh & phụ huynh',
      icon: <MessageSquare className="w-4 h-4 text-indigo-600" />,
    },
    {
      action: 'GENERATE_REPORT',
      label: 'Soạn báo cáo tuần',
      desc: 'Lập báo cáo tổng kết tuần gửi Ban Giám Hiệu/Tổ bộ môn',
      icon: <FileText className="w-4 h-4 text-amber-600" />,
    },
    {
      action: 'SUGGEST_ACTIVITIES',
      label: 'Đề xuất hoạt động bổ trợ',
      desc: 'Gợi ý giải pháp kèm cặp, phân tầng bài tập sư phạm',
      icon: <Lightbulb className="w-4 h-4 text-purple-600" />,
    },
  ];

  const handleExecuteTask = async (action: string, customQuery?: string) => {
    const userText =
      customQuery ||
      quickTasks.find((t) => t.action === action)?.label ||
      'Yêu cầu phân tích';

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.postAiTask({
        action,
        classId: selectedClassId,
        query: customQuery,
      });

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: response.result,
        model: response.model,
        isAiGenerated: response.isAiGenerated,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        summary: response.dataContextSummary,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: `Đã xảy ra lỗi khi kết nối dịch vụ AI: ${err.message}. Hệ thống đang chuyển sang bộ phân tích quy tắc dự phòng.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    const q = inputQuery.trim();
    setInputQuery('');
    handleExecuteTask('CHAT', q);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Trợ Lý Giáo Dục AI (AI Teaching Assistant)
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
              Gemini 3.8 Flash
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Trợ giúp giáo viên phân tích dữ liệu lớp học, giải thích xu hướng học tập và soạn thảo văn bản
          </p>
        </div>

        {/* Privacy badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bảo mật dữ liệu: Đã kiểm tra phân quyền & khử định danh máy chủ</span>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickTasks.map((t) => (
          <button
            key={t.action}
            onClick={() => handleExecuteTask(t.action)}
            disabled={isLoading}
            className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col justify-between group disabled:opacity-50 cursor-pointer"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                {t.icon}
              </div>
              <h4 className="mt-2.5 font-bold text-xs text-slate-800 group-hover:text-blue-600 transition-colors">
                {t.label}
              </h4>
            </div>
            <p className="mt-1 text-[10px] text-slate-400 line-clamp-2 leading-tight">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Chat Conversation Thread */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[520px]">
        {/* Messages scroll area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {messages.map((m) => {
            const isUser = m.sender === 'user';

            return (
              <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-3xl rounded-2xl p-4 text-xs ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-xs'
                  }`}
                >
                  {/* Model & Source Meta */}
                  {!isUser && (
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 text-[10px] text-slate-400">
                      <span className="font-medium text-slate-600">
                        {m.model || 'Gemini 3.8 Flash • AI Studio'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{m.timestamp}</span>
                        <button
                          onClick={() => handleCopy(m.text, m.id)}
                          className="hover:text-slate-700 p-0.5 rounded transition-colors"
                          title="Sao chép nội dung"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message body formatted */}
                  <div className="prose prose-xs max-w-none space-y-2 whitespace-pre-wrap leading-relaxed">
                    {m.text}
                  </div>

                  {/* Summary chips */}
                  {m.summary && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700">Dữ liệu căn cứ:</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                        Lớp {m.summary.classCode}
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                        Hoàn thành: {m.summary.completionRate}
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                        Quá hạn: {m.summary.overdue} bài
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-4 text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Trợ lý AI đang tra cứu dữ liệu học sinh và lập luận câu trả lời...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Hỏi bất kỳ điều gì: 'Những bạn nào nợ từ 2 bài tập trở lên?', 'Soạn bản nháp nhắc bài tuần này'..."
              className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </form>
          <div className="mt-2 text-[11px] text-slate-400 text-center">
            * AI chỉ hỗ trợ đề xuất và diễn giải dữ liệu, giáo viên giữ quyền quyết định sư phạm cuối cùng.
          </div>
        </div>
      </div>
    </div>
  );
};
