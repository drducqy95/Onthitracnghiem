
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { ExamResult } from '../types';
import { useStore } from '../store';
import { ChevronLeft, Calendar, Award, PlayCircle, Eye } from 'lucide-react';

const History: React.FC = () => {
  const { setScreen, setLastResult, startQuiz } = useStore();
  const [history, setHistory] = useState<ExamResult[]>([]);

  useEffect(() => {
    const load = async () => {
      const list = await db.getHistory();
      setHistory(list.sort((a, b) => b.date - a.date));
    };
    load();
  }, []);

  const viewResult = (res: ExamResult) => {
    setLastResult(res);
    setScreen('RESULT');
  };

  const retryExam = async (res: ExamResult) => {
    // If it's single subject, just retry those specific questions or same config
    if (!res.isMultiSubject) {
      const shuffled = [...res.questions].sort(() => 0.5 - Math.random());
      startQuiz(shuffled, 45); // Default time or extract from meta
    } else {
      // For multi-subject, suggest going back to mock exam to select that template
      setScreen('MOCK_EXAM');
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="p-4 flex items-center">
        <button onClick={() => setScreen('HOME')} className="mr-4">
          <ChevronLeft className="w-6 h-6 text-slate-800" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Lịch sử thi</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {history.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-medium bg-white/50 rounded-3xl">Chưa có kết quả thi nào.</div>
        ) : (
          history.map(res => (
            <div 
              key={res.id} 
              className="bg-white/95 rounded-[32px] p-5 shadow-sm border border-slate-100 flex flex-col space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 uppercase leading-tight">{res.name}</h3>
                  <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <Calendar className="w-3 h-3 mr-1" /> {new Date(res.date).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-black ${res.totalPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {res.totalPassed ? 'ĐẠT' : 'K. ĐẠT'}
                </div>
              </div>

              <div className="flex space-x-2">
                 <button 
                  onClick={() => viewResult(res)}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-slate-50 text-slate-600 rounded-2xl text-xs font-bold"
                 >
                   <Eye className="w-4 h-4" /> <span>Xem kết quả</span>
                 </button>
                 <button 
                  onClick={() => retryExam(res)}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-purple-50 text-purple-600 rounded-2xl text-xs font-bold"
                 >
                   <PlayCircle className="w-4 h-4" /> <span>Thi lại</span>
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
