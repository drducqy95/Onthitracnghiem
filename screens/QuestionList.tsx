import React, { useState } from 'react';
import { useStore } from '../store';
import { db } from '../db';
import { Question } from '../types';
import { ChevronLeft, Info, Edit2, X, Check, Image as ImageIcon, Trash2, Loader2, AlertCircle } from 'lucide-react';

const QuestionList: React.FC = () => {
  const { viewingQuestions, setScreen, startViewingQuestions, settings } = useStore();
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

  // Kiểm tra an toàn: Nếu không có dữ liệu hoặc không có mảng câu hỏi
  if (!viewingQuestions || !viewingQuestions.questions) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen space-y-4 ${settings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>
        <p className="text-slate-500 font-medium">Đang tải hoặc không có dữ liệu...</p>
        <button
          onClick={() => setScreen('QUESTION_BANK')}
          className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-col h-[100dvh] ${settings.darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center sticky top-0 z-20 ${settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
          <button
            onClick={() => setScreen('QUESTION_BANK')}
            className={`p-2 rounded-full mr-2 transition ${settings.darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
              }`}
          >
            <ChevronLeft className={`w-6 h-6 ${settings.darkMode ? 'text-white' : 'text-slate-600'}`} />
          </button>
          <div className="flex-1 overflow-hidden">
            <h2 className={`text-lg font-bold truncate ${settings.darkMode ? 'text-white' : 'text-slate-800'}`}>
              {viewingQuestions.title}
            </h2>
            <p className={`text-xs font-medium uppercase tracking-tight ${settings.darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
              Tổng số {viewingQuestions.questions?.length || 0} câu
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          {viewingQuestions.questions.map((q, idx) => {
            const options = [
              { label: 'A', text: q.optionA },
              { label: 'B', text: q.optionB },
              { label: 'C', text: q.optionC },
              { label: 'D', text: q.optionD },
            ];

            return (
              <div key={q.id} className={`rounded-3xl p-6 shadow-sm border ${settings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                }`}>
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${settings.darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'
                    }`}>
                    CÂU {idx + 1}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full">
                      ĐÁP ÁN: {q.correctAnswers}
                    </span>
                    <button
                      onClick={() => setEditingQuestion({ ...q })}
                      className={`p-2 rounded-xl transition ${settings.darkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className={`text-base font-semibold mb-6 leading-relaxed ${settings.darkMode ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                  {q.content}
                </h3>

                <div className="space-y-2 mb-6">
                  {options.map(opt => (
                    <div
                      key={opt.label}
                      className={`p-3 rounded-xl border-2 text-sm flex items-start space-x-3 ${opt.label === q.correctAnswers
                        ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                        : settings.darkMode
                          ? 'border-slate-700 bg-slate-700/50 text-slate-300'
                          : 'border-slate-50 bg-slate-50 text-slate-600'
                        }`}
                    >
                      <span className="font-bold shrink-0">{opt.label}.</span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className={`p-4 rounded-2xl border mb-4 ${settings.darkMode
                    ? 'bg-teal-900/20 border-teal-900/50'
                    : 'bg-teal-50 border-teal-100'
                    }`}>
                    <div className="flex items-center text-teal-600 text-xs font-bold mb-2">
                      <Info className="w-4 h-4 mr-1" /> GIẢI THÍCH
                    </div>
                    <p className={`text-sm leading-relaxed italic ${settings.darkMode ? 'text-teal-400' : 'text-teal-800'
                      }`}>
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-[32px] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto hide-scrollbar ${settings.darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-slate-800'}`}>Chỉnh sửa câu hỏi</h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className={`p-2 rounded-full ${settings.darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
              >
                <X className={`w-5 h-5 ${settings.darkMode ? 'text-slate-400' : 'text-slate-600'}`} />
              </button>
            </div>

            {/* Câu hỏi */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-2">Nội dung câu hỏi</label>
              <textarea
                value={editingQuestion.content}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                className={`w-full border rounded-2xl p-4 min-h-[100px] font-medium outline-none focus:ring-2 focus:ring-purple-400 ${settings.darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              />
              <div className="flex items-center gap-3">
                <label className={`p-3 rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold ${settings.darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  <ImageIcon className="w-4 h-4" />
                  {editingQuestion.image ? 'Đổi ảnh' : 'Thêm ảnh Q'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setEditingQuestion({ ...editingQuestion, image: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {editingQuestion.image && (
                  <div className="relative group">
                    <img src={editingQuestion.image} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                    <button
                      onClick={() => setEditingQuestion({ ...editingQuestion, image: undefined })}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Đáp án */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <div key={opt} className="space-y-2">
                  <div className="flex items-center justify-between pr-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-2">Đáp án {opt}</label>
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={editingQuestion.correctAnswers === opt}
                      onChange={() => setEditingQuestion({ ...editingQuestion, correctAnswers: opt })}
                      className="w-4 h-4 accent-purple-600"
                    />
                  </div>
                  <input
                    value={editingQuestion[`option${opt}` as keyof Question] as string || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, [`option${opt}`]: e.target.value })}
                    className={`w-full border rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 ${settings.darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                  <div className="flex items-center gap-2">
                    <label className={`p-1.5 rounded-lg cursor-pointer flex items-center gap-1 text-[10px] font-bold ${settings.darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      <ImageIcon className="w-3 h-3" /> Ảnh
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setEditingQuestion({
                              ...editingQuestion,
                              optionImages: { ...editingQuestion.optionImages, [opt]: reader.result as string }
                            });
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {editingQuestion.optionImages?.[opt] && (
                      <div className="relative group">
                        <img src={editingQuestion.optionImages[opt]} className="w-8 h-8 rounded object-cover border border-slate-200" />
                        <button
                          onClick={() => setEditingQuestion({
                            ...editingQuestion,
                            optionImages: { ...editingQuestion.optionImages, [opt]: undefined }
                          })}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Giải thích */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-2">Giải thích</label>
              <textarea
                value={editingQuestion.explanation || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                className={`w-full border rounded-2xl p-4 min-h-[80px] text-sm outline-none focus:ring-2 focus:ring-purple-400 ${settings.darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                placeholder="Nhập giải thích chi tiết..."
              />
              <div className="flex items-center gap-3">
                <label className={`p-3 rounded-xl cursor-pointer flex items-center gap-2 text-xs font-bold ${settings.darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  <ImageIcon className="w-4 h-4" /> {editingQuestion.explanationImage ? 'Đổi ảnh' : 'Thêm ảnh giải thích'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setEditingQuestion({ ...editingQuestion, explanationImage: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {editingQuestion.explanationImage && (
                  <div className="relative group">
                    <img src={editingQuestion.explanationImage} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                    <button
                      onClick={() => setEditingQuestion({ ...editingQuestion, explanationImage: undefined })}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Status Messages */}
            {status.type !== 'idle' && (
              <div className={`p-4 rounded-2xl flex items-center space-x-3 ${status.type === 'success' ? 'bg-green-50 text-green-600' : status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                {status.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : status.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                <p className="text-sm font-bold">{status.msg}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setEditingQuestion(null)}
                className={`flex-1 py-4 font-bold rounded-2xl ${settings.darkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  if (!editingQuestion) return;
                  setStatus({ type: 'loading', msg: 'Đang lưu câu hỏi...' });
                  try {
                    await db.saveQuestions([editingQuestion]);

                    // Cập nhật UI trong store
                    if (viewingQuestions) {
                      const updatedQuestions = viewingQuestions.questions.map(q =>
                        q.id === editingQuestion.id ? editingQuestion : q
                      );
                      startViewingQuestions({
                        ...viewingQuestions,
                        questions: updatedQuestions
                      });
                    }

                    setStatus({ type: 'success', msg: 'Đã cập nhật câu hỏi thành công!' });
                    setTimeout(() => {
                      setEditingQuestion(null);
                      setStatus({ type: 'idle', msg: '' });
                    }, 1000);
                  } catch (err) {
                    setStatus({ type: 'error', msg: 'Lỗi khi lưu câu hỏi' });
                  }
                }}
                className={`flex-[2] py-4 bg-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-purple-200 active:scale-95 transition-all`}
              >
                LƯU THAY ĐỔI
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionList;