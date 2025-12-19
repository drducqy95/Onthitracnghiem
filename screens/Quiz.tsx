import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { db } from '../db';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
// QUAN TRỌNG: Phải import Question để TypeScript hiểu kiểu dữ liệu
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

  if (!currentQuiz) return null;

  const currentQuestion = currentQuiz.questions[currentIndex];
  const progress = ((currentIndex + 1) / currentQuiz.questions.length) * 100;

  useEffect(() => {
    if (currentQuiz.isFinished || isSubmitting) return;
    const timer = setInterval(() => {
      decrementTime();
    }, 1000);
    if (currentQuiz.timeLeft <= 0) {
        handleSubmit();
    }
    return () => clearInterval(timer);
  }, [currentQuiz.timeLeft, currentQuiz.isFinished, isSubmitting]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (currentQuiz.isFinished || isSubmitting) return;
    setIsSubmitting(true);
    
    // Tính điểm môn hiện tại
    let correctCount = 0;
    currentQuiz.questions.forEach(q => {
      if (currentQuiz.userAnswers[q.id] === q.correctAnswers) correctCount++;
    });

    const score = parseFloat(((correctCount / currentQuiz.questions.length) * 10).toFixed(1));
    const isPassed = (correctCount / currentQuiz.questions.length) >= 0.5;

    if (currentSession) {
      const nextIndex = currentSession.currentIndex + 1;
      
      const subRes: SubjectResult = {
        subjectName: currentSession.configs[currentSession.currentIndex].subjectName,
        score,
        correctCount,
        totalQuestions: currentQuiz.questions.length,
        passed: isPassed
      };

      const updatedResults = [...currentSession.results, subRes];
      
      // Gộp đáp án mới vào danh sách đáp án tổng
      const updatedAllUserAnswers: Record<string, string> = { 
          ...currentSession.allUserAnswers, 
          ...currentQuiz.userAnswers 
      };

      // Nếu còn môn tiếp theo
      if (nextIndex < currentSession.configs.length) {
        const nextConfig = currentSession.configs[nextIndex];
        const allQ = await db.getQuestionsBySubjectRecursive(nextConfig.subjectId);
        const shuffled = allQ.sort(() => 0.5 - Math.random()).slice(0, nextConfig.count);
        
        // Gộp câu hỏi mới vào danh sách tổng (đảm bảo kiểu Question[])
        const updatedAllQuestions: Question[] = [...currentSession.allQuestions, ...shuffled];

        // Cập nhật Store
        useStore.setState({
          currentSession: { 
              ...currentSession, 
              currentIndex: nextIndex,
              results: updatedResults,
              allQuestions: updatedAllQuestions, // Hết lỗi đỏ
              allUserAnswers: updatedAllUserAnswers // Hết lỗi đỏ
          },
          currentQuiz: {
            questions: shuffled,
            userAnswers: {},
            timeLeft: nextConfig.time * 60,
            totalTime: nextConfig.time * 60,
            isFinished: false
          }
        });
        
        setCurrentIndex(0);
        setIsSubmitting(false);
      } else {
        // Đã hết môn -> Tổng kết
        const totalPassed = updatedResults.every(r => r.passed);
        
        const finalResult: ExamResult = {
          id: Date.now().toString(),
          name: currentSession.name,
          date: Date.now(),
          isMultiSubject: true,
          totalPassed,
          subjectResults: updatedResults,
          questions: currentSession.allQuestions, // Đã là Question[] (1 chiều)
          userAnswers: updatedAllUserAnswers
        };

        await db.saveResult(finalResult);
        setLastResult(finalResult);
        finishQuiz();
        setScreen('RESULT');
      }
    } else {
      // Thi đơn lẻ
      const finalResult: ExamResult = {
        id: Date.now().toString(),
        name: useStore.getState().selectedSubject?.name || 'Bài thi tự chọn',
        date: Date.now(),
        isMultiSubject: false,
        totalPassed: isPassed,
        subjectResults: [{
          subjectName: useStore.getState().selectedSubject?.name || 'Môn thi',
          score,
          correctCount,
          totalQuestions: currentQuiz.questions.length,
          passed: isPassed
        }],
        questions: currentQuiz.questions,
        userAnswers: currentQuiz.userAnswers
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
          <button 
            onClick={handleSubmit} 
            className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-700 active:scale-95 transition"
          >
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
          <h2 className="text-base font-semibold text-slate-800 leading-relaxed mb-6">
            {currentQuestion.content}
          </h2>
          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt.label} 
                onClick={() => updateAnswer(currentQuestion.id, opt.label)}
                className={`w-full p-4 rounded-2xl border-2 text-left flex items-start space-x-3 transition-all active:scale-[0.98] ${
                    currentQuiz.userAnswers[currentQuestion.id] === opt.label 
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-100' 
                    : 'border-slate-50 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    currentQuiz.userAnswers[currentQuestion.id] === opt.label 
                    ? 'bg-teal-500 text-white' 
                    : 'bg-white text-slate-400 border border-slate-200'
                }`}>
                    {opt.label}
                </span>
                <span className={`text-sm leading-relaxed ${
                    currentQuiz.userAnswers[currentQuestion.id] === opt.label 
                    ? 'text-teal-900 font-bold' 
                    : 'text-slate-600 font-medium'
                }`}>
                    {opt.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-between space-x-4 z-30">
        <button 
            disabled={currentIndex === 0} 
            onClick={() => setCurrentIndex(currentIndex - 1)} 
            className="flex items-center px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition"
        >
            <ChevronLeft className="w-5 h-5 mr-1" /> Trước
        </button>
        <button 
            disabled={currentIndex === currentQuiz.questions.length - 1} 
            onClick={() => setCurrentIndex(currentIndex + 1)} 
            className="flex items-center px-6 py-3 rounded-2xl bg-teal-600 text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-teal-200 hover:bg-teal-700 active:scale-95 transition"
        >
            Sau <ChevronRight className="w-5 h-5 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default Quiz;