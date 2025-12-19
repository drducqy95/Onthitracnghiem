import React from 'react';
import { useStore } from '../store';
import { ChevronLeft, Info } from 'lucide-react';

const QuestionList: React.FC = () => {
  const { viewingQuestions, setScreen, settings } = useStore();

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
    <div className={`flex flex-col h-[100dvh] ${settings.darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center sticky top-0 z-20 ${
          settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <button 
          onClick={() => setScreen('QUESTION_BANK')}
          className={`p-2 rounded-full mr-2 transition ${
              settings.darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
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
            <div key={q.id} className={`rounded-3xl p-6 shadow-sm border ${
                settings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    settings.darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'
                }`}>
                  CÂU {idx + 1}
                </span>
                <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full">
                  ĐÁP ÁN: {q.correctAnswers}
                </span>
              </div>

              <h3 className={`text-base font-semibold mb-6 leading-relaxed ${
                  settings.darkMode ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {q.content}
              </h3>

              <div className="space-y-2 mb-6">
                {options.map(opt => (
                  <div 
                    key={opt.label} 
                    className={`p-3 rounded-xl border-2 text-sm flex items-start space-x-3 ${
                      opt.label === q.correctAnswers 
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
                <div className={`p-4 rounded-2xl border mb-4 ${
                    settings.darkMode 
                        ? 'bg-teal-900/20 border-teal-900/50' 
                        : 'bg-teal-50 border-teal-100'
                }`}>
                  <div className="flex items-center text-teal-600 text-xs font-bold mb-2">
                    <Info className="w-4 h-4 mr-1" /> GIẢI THÍCH
                  </div>
                  <p className={`text-sm leading-relaxed italic ${
                      settings.darkMode ? 'text-teal-400' : 'text-teal-800'
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
  );
};

export default QuestionList;