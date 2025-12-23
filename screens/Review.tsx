import React from 'react'; // Bỏ useState thừa
import { useStore } from '../store';
import { ChevronLeft, Info, CheckCircle, XCircle } from 'lucide-react'; // Bỏ các icon AI thừa

const Review: React.FC = () => {
  const { lastResult, setScreen } = useStore();

  if (!lastResult) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header - Cố định ở trên */}
      <div className="bg-white p-4 border-b border-slate-200 flex items-center sticky top-0 z-20">
        <button
          onClick={() => setScreen('RESULT')}
          className="p-2 hover:bg-slate-100 rounded-full mr-2 transition"
        >
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </button>
        <h2 className="text-lg font-bold text-slate-800">Xem lại bài thi</h2>
      </div>

      {/* Nội dung cuộn - Chứa danh sách câu hỏi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-12 pb-20">
        {lastResult.subjectResults && lastResult.subjectResults.length > 0 ? (
          lastResult.subjectResults.map((sr, sIdx) => {
            // Tính toán vị trí bắt đầu của môn này dựa trên tổng số câu của các môn trước đó
            const startOffset = lastResult.subjectResults
              .slice(0, sIdx)
              .reduce((total, prev) => total + (prev.totalQuestions || 0), 0);

            const subjectQuestions = lastResult.questions.slice(
              startOffset,
              startOffset + (sr.totalQuestions || 0)
            );

            return (
              <div key={`subject-${sIdx}-${sr.subjectId}`} className="space-y-4">
                {/* Header môn học */}
                <div className="flex items-center space-x-2 px-2 py-2 bg-slate-100/50 rounded-2xl border border-slate-200/50 mb-6">
                  <div className="w-1.5 h-6 bg-teal-500 rounded-full" />
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      PHẦN {sIdx + 1}: {sr.subjectName}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Kết quả: {sr.correctCount}/{sr.totalQuestions} câu • {sr.score} điểm
                    </p>
                  </div>
                </div>

                {subjectQuestions.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs italic">
                    Không tìm thấy dữ liệu câu hỏi cho môn này.
                  </div>
                ) : (
                  subjectQuestions.map((q, idx) => {
                    const userAns = lastResult.userAnswers[q.id];
                    const isCorrect = userAns === q.correctAnswers;
                    const options = [
                      { label: 'A', text: q.optionA },
                      { label: 'B', text: q.optionB },
                      { label: 'C', text: q.optionC },
                      { label: 'D', text: q.optionD },
                    ];

                    return (
                      <div key={`q-${q.id}`} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:border-teal-100 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[10px] font-black rounded-full uppercase">
                            Câu {idx + 1}
                          </span>
                          {isCorrect ? (
                            <span className="flex items-center text-green-500 text-[10px] font-black">
                              <CheckCircle className="w-4 h-4 mr-1" /> ĐÚNG
                            </span>
                          ) : (
                            <span className="flex items-center text-red-500 text-[10px] font-black">
                              <XCircle className="w-4 h-4 mr-1" /> SAI
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-semibold text-slate-800 mb-6 leading-relaxed">
                          {q.content}
                        </h3>

                        <div className="space-y-2 mb-6">
                          {options.map(opt => {
                            let style = 'border-slate-50 bg-slate-50 text-slate-600';
                            if (opt.label === q.correctAnswers) {
                              style = 'border-green-500 bg-green-50 text-green-700 font-bold scale-[1.01]';
                            } else if (opt.label === userAns && !isCorrect) {
                              style = 'border-red-500 bg-red-50 text-red-700 font-bold';
                            }

                            return (
                              <div key={opt.label} className={`p-4 rounded-xl border-2 text-sm flex items-start space-x-3 ${style}`}>
                                <span className="font-black shrink-0">{opt.label}.</span>
                                <span className="flex-1">{opt.text}</span>
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
                            <div className="flex items-center text-teal-700 text-[10px] font-black mb-2 uppercase tracking-widest">
                              <Info className="w-4 h-4 mr-1" /> Giải thích
                            </div>
                            <p className="text-sm text-teal-800 leading-relaxed italic">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })
        ) : (
          /* Fallback cho dữ liệu cực cũ */
          lastResult.questions.map((q, idx) => {
            const userAns = lastResult.userAnswers[q.id];
            const isCorrect = userAns === q.correctAnswers;
            return (
              <div key={q.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">Câu {idx + 1}</span>
                  {isCorrect ? <span className="text-green-500 text-[10px] font-bold">ĐÚNG</span> : <span className="text-red-500 text-[10px] font-bold">SAI</span>}
                </div>
                <h3 className="text-sm font-semibold text-slate-800">{q.content}</h3>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Button - Cố định ở dưới */}
      <div className="p-4 bg-white border-t border-slate-100 sticky bottom-0 z-20">
        <button
          onClick={() => setScreen('HOME')}
          className="w-full p-4 bg-slate-800 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 active:scale-95 transition"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
};

export default Review;