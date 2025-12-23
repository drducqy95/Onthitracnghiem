import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { ExamResult } from '../types';
import { useStore } from '../store';
import { ChevronLeft, Calendar, PlayCircle, Eye, Layers, CheckCircle2 } from 'lucide-react';

const History: React.FC = () => {
  const { setScreen, setLastResult, startQuiz } = useStore();
  const [history, setHistory] = useState<ExamResult[]>([]);

  useEffect(() => {
    const load = async () => {
      const list = await db.getHistory();
      // Sắp xếp lịch sử mới nhất lên đầu
      setHistory(list.sort((a, b) => b.date - a.date));
    };
    load();
  }, []);

  const viewResult = (res: ExamResult) => {
    setLastResult(res);
    setScreen('RESULT');
  };

  const retryExam = async (res: ExamResult) => {
    // TRƯỜNG HỢP 1: Kỳ thi tổ hợp (nhiều môn)
    if (res.isMultiSubject && res.originalConfig) {
      const firstConfig = res.originalConfig.configs[0];
      if (!firstConfig) return;

      // Chế độ hoàn hảo: Slice môn đầu tiên từ bộ câu hỏi đã lưu
      const firstSubjectQuestions = res.questions.slice(0, firstConfig.count);

      useStore.setState({
        currentSession: {
          name: res.originalConfig.name,
          configs: res.originalConfig.configs,
          currentIndex: 0,
          results: [],
          allQuestions: res.questions,
          allUserAnswers: {},
          isRetryMode: true
        },
        currentQuiz: {
          questions: firstSubjectQuestions,
          userAnswers: {},
          timeLeft: (firstConfig.time || 45) * 60,
          totalTime: (firstConfig.time || 45) * 60,
          isFinished: false
        }
      });
      setScreen('QUIZ');
    }
    // TRƯỜNG HỢP 2: Thi đơn lẻ hoặc Bản ghi cũ không có config
    else {
      // Nếu có config thì lấy time từ config, không thì mặc định 45
      const time = res.originalConfig?.totalTime
        ? res.originalConfig.totalTime / 60
        : (res.originalConfig?.configs?.[0]?.time || 45);

      startQuiz(res.questions, time);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50">
      {/* Header */}
      <div className="p-4 flex items-center bg-white border-b sticky top-0 z-10">
        <button
          onClick={() => setScreen('HOME')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors mr-2"
        >
          <ChevronLeft className="w-6 h-6 text-slate-800" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">Lịch sử thi</h2>
      </div>

      {/* List History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {history.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-medium bg-white/50 rounded-[32px] border border-dashed border-slate-300">
            Chưa có kết quả thi nào.
          </div>
        ) : (
          history.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-[32px] p-5 shadow-sm border border-slate-100 flex flex-col space-y-4"
            >
              {/* Thông tin chung */}
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1 pr-2">
                  <h3 className="font-bold text-slate-800 uppercase leading-tight text-sm sm:text-base">
                    {res.name}
                  </h3>
                  <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(res.date).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${res.totalPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                  {res.totalPassed ? 'ĐẠT' : 'K. ĐẠT'}
                </div>
              </div>

              {/* HIỂN THỊ CHI TIẾT THEO TỪNG MÔN TRONG KỲ THI */}
              <div className="bg-slate-50/80 rounded-2xl p-3 space-y-2 border border-slate-100">
                <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-1">
                  <Layers className="w-3 h-3 mr-1 text-purple-500" />
                  Kết quả chi tiết môn học
                </div>
                {res.subjectResults.map((sr, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium truncate max-w-[70%]">
                      ● {sr.subjectName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">{sr.correctCount}/{sr.totalQuestions}</span>
                      <span className={`font-bold ${sr.passed ? 'text-green-600' : 'text-red-500'}`}>
                        {sr.score}đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Nhóm nút bấm */}
              <div className="flex gap-2">
                <button
                  onClick={() => viewResult(res)}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Xem lại bài làm</span>
                </button>
                <button
                  onClick={() => retryExam(res)}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-100 transition-all active:scale-95"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Thi lại đề này</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default History;