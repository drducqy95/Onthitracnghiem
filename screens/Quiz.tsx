import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { db } from '../db';
import { Clock, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { ExamResult, SubjectResult, Question } from '../types';

const Quiz: React.FC = () => {
  const {
    currentQuiz,
    currentSession,
    updateAnswer,
    finishQuiz,
    decrementTime,
    setScreen,
    setLastResult
  } = useStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentQuiz) {
      setScreen('HOME');
    }
  }, [currentQuiz, setScreen]);

  useEffect(() => {
    if (!currentQuiz || currentQuiz.isFinished || isSubmitting) return;
    const timer = setInterval(() => {
      decrementTime();
    }, 1000);
    if (currentQuiz.timeLeft <= 0) {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [currentQuiz?.timeLeft, currentQuiz?.isFinished, isSubmitting]);

  if (!currentQuiz || currentQuiz.questions.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6 text-center">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Lỗi tải bài thi</h2>
      <p className="text-slate-500 mb-6">Không tìm thấy câu hỏi nào trong bài thi này.</p>
      <button onClick={() => setScreen('HOME')} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold">Quay lại trang chủ</button>
    </div>
  );

  const currentQuestion = currentQuiz.questions[currentIndex];
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / currentQuiz.questions.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (currentQuiz.isFinished || isSubmitting) return;
    setIsSubmitting(true);

    // 1. Tính điểm môn hiện tại
    let correctCount = 0;
    currentQuiz.questions.forEach(q => {
      if (currentQuiz.userAnswers[q.id] === q.correctAnswers) correctCount++;
    });

    const score = parseFloat(((correctCount / currentQuiz.questions.length) * 10).toFixed(1));
    const isPassed = (correctCount / currentQuiz.questions.length) >= 0.5;

    // Gộp đáp án hiện tại vào danh sách đáp án tổng của phiên
    const updatedAllUserAnswers = {
      ...currentSession?.allUserAnswers,
      ...currentQuiz.userAnswers
    };

    // Lấy state mới nhất để tránh closure stale state
    const { currentSession: freshSession } = useStore.getState();

    if (freshSession) {
      const nextIndex = freshSession.currentIndex + 1;

      const subRes: SubjectResult = {
        subjectId: freshSession.configs[freshSession.currentIndex].subjectId,
        subjectName: freshSession.configs[freshSession.currentIndex].subjectName,
        score,
        correctCount,
        totalQuestions: currentQuiz.questions.length,
        passed: isPassed
      };

      const updatedResults = [...freshSession.results, subRes];

      // Nếu còn môn tiếp theo trong kỳ thi
      if (nextIndex < freshSession.configs.length) {
        const nextConfig = freshSession.configs[nextIndex];

        // --- LOGIC SLICE ---
        const startIdx = freshSession.configs
          .slice(0, nextIndex)
          .reduce((total, cfg) => total + cfg.count, 0);

        const nextQuestions = freshSession.allQuestions.slice(startIdx, startIdx + nextConfig.count);

        useStore.setState({
          currentSession: {
            ...freshSession,
            currentIndex: nextIndex,
            results: updatedResults,
            allUserAnswers: updatedAllUserAnswers
          },
          currentQuiz: {
            questions: nextQuestions,
            userAnswers: {},
            timeLeft: nextConfig.time * 60,
            totalTime: nextConfig.time * 60,
            isFinished: false
          }
        });

        setCurrentIndex(0);
        setIsSubmitting(false);
      } else {
        // Hết tất cả các môn -> Lưu lịch sử tổng hợp
        const totalPassed = updatedResults.every(r => r.passed);

        const finalResult: ExamResult = {
          id: Date.now().toString(),
          name: freshSession.name,
          date: Date.now(),
          isMultiSubject: true,
          totalPassed,
          subjectResults: updatedResults,
          questions: freshSession.allQuestions,
          userAnswers: updatedAllUserAnswers,
          originalConfig: {
            name: freshSession.name,
            configs: freshSession.configs
          }
        };

        await db.saveResult(finalResult);
        setLastResult(finalResult);
        finishQuiz();
        setScreen('RESULT');
      }
    } else {
      // Trường hợp thi đơn lẻ (Tự chọn)
      const finalResult: ExamResult = {
        id: Date.now().toString(),
        name: useStore.getState().selectedSubject?.name || 'Bài thi tự chọn',
        date: Date.now(),
        isMultiSubject: false,
        totalPassed: isPassed,
        subjectResults: [{
          subjectId: useStore.getState().selectedSubject?.id || '',
          subjectName: useStore.getState().selectedSubject?.name || 'Môn thi',
          score,
          correctCount,
          totalQuestions: currentQuiz.questions.length,
          passed: isPassed
        }],
        questions: currentQuiz.questions,
        userAnswers: currentQuiz.userAnswers,
        originalConfig: {
          name: useStore.getState().selectedSubject?.name || 'Bài thi tự chọn',
          configs: [{
            subjectId: useStore.getState().selectedSubject?.id || '',
            subjectName: useStore.getState().selectedSubject?.name || 'Môn thi',
            count: currentQuiz.questions.length,
            time: Math.ceil(currentQuiz.totalTime / 60)
          }],
          totalTime: currentQuiz.totalTime
        }
      };

      await db.saveResult(finalResult);
      setLastResult(finalResult);
      finishQuiz();
      setScreen('RESULT');
    }
  };

  const options = [
    { label: 'A', text: currentQuestion.optionA },
    { label: 'B', text: currentQuestion.optionB },
    { label: 'C', text: currentQuestion.optionC },
    { label: 'D', text: currentQuestion.optionD },
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 sticky top-0 z-20">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {currentSession ? `${currentSession.name} (${currentSession.currentIndex + 1}/${currentSession.configs.length})` : 'Luyện tập'}
            </span>
            <h1 className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
              {currentSession ? currentSession.configs[currentSession.currentIndex].subjectName : (useStore.getState().selectedSubject?.name || 'Tự chọn')}
            </h1>
          </div>
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-bold shadow-sm ${currentQuiz.timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-teal-50 text-teal-700'}`}>
            <Clock className="w-4 h-4" />
            <span>{formatTime(currentQuiz.timeLeft)}</span>
          </div>
          <button onClick={handleSubmit} className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition">
            Nộp bài
          </button>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-6">
          <div className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full mb-4 uppercase tracking-wider">
            Câu {currentIndex + 1} / {currentQuiz.questions.length}
          </div>

          <h2 className="text-base font-semibold text-slate-800 leading-relaxed mb-4">
            {currentQuestion.content}
          </h2>

          {/* HIỂN THỊ HÌNH ẢNH CÂU HỎI (NẾU CÓ) */}
          {currentQuestion.image && (
            <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
              <img
                src={currentQuestion.image}
                alt="Minh họa câu hỏi"
                className="w-full h-auto object-contain max-h-[300px]"
              />
            </div>
          )}

          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => updateAnswer(currentQuestion.id, opt.label)}
                className={`w-full p-4 rounded-2xl border-2 text-left flex items-start space-x-3 transition-all active:scale-[0.98] ${currentQuiz.userAnswers[currentQuestion.id] === opt.label
                  ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-100'
                  : 'border-slate-50 bg-slate-50 hover:bg-slate-100'
                  }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${currentQuiz.userAnswers[currentQuestion.id] === opt.label
                  ? 'bg-teal-500 text-white'
                  : 'bg-white text-slate-400 border border-slate-200'
                  }`}>
                  {opt.label}
                </span>
                <div className="flex flex-col flex-1">
                  <span className={`text-sm leading-relaxed ${currentQuiz.userAnswers[currentQuestion.id] === opt.label
                    ? 'text-teal-900 font-bold'
                    : 'text-slate-600 font-medium'
                    }`}>
                    {opt.text}
                  </span>
                  {/* HÌNH ẢNH TRONG ĐÁP ÁN (NẾU CÓ) */}
                  {currentQuestion.optionImages?.[opt.label as keyof typeof currentQuestion.optionImages] && (
                    <img
                      src={currentQuestion.optionImages[opt.label as keyof typeof currentQuestion.optionImages]}
                      className="mt-2 rounded-lg max-h-32 object-contain w-fit"
                      alt={`Ảnh đáp án ${opt.label}`}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-between space-x-4 z-30">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
          className="flex items-center px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold disabled:opacity-30 hover:bg-slate-50 transition"
        >
          <ChevronLeft className="w-5 h-5 mr-1" /> Trước
        </button>
        <button
          disabled={currentIndex === currentQuiz.questions.length - 1}
          onClick={() => setCurrentIndex(currentIndex + 1)}
          className="flex items-center px-6 py-3 rounded-2xl bg-teal-600 text-white font-bold disabled:opacity-30 shadow-lg shadow-teal-200 hover:bg-teal-700 active:scale-95 transition"
        >
          Sau <ChevronRight className="w-5 h-5 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default Quiz;