
import React from 'react';
import { useStore } from '../store';
import { Trophy, CheckCircle2, XCircle, Home, Eye, RotateCcw, Award, AlertCircle } from 'lucide-react';

const Result: React.FC = () => {
  const { lastResult, setScreen, setLastResult } = useStore();

  if (!lastResult) return null;

  const isPass = lastResult.totalPassed;

  return (
    <div className="min-h-full bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200 mt-8 mb-8 text-center border border-slate-100">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isPass ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {isPass ? <Trophy className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
        </div>
        
        <h2 className={`text-4xl font-black mb-2 ${isPass ? 'text-green-500' : 'text-red-500'}`}>
          {isPass ? 'ĐẠT' : 'KHÔNG ĐẠT'}
        </h2>
        <p className="font-semibold text-slate-400 uppercase tracking-widest mb-6">
          {lastResult.name}
        </p>

        <div className="space-y-3 mb-8">
           {lastResult.subjectResults.map((sr, i) => (
             <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-left">
                   <p className="text-xs font-bold text-slate-800 uppercase">{sr.subjectName}</p>
                   <p className="text-[10px] text-slate-400 font-bold">{sr.correctCount}/{sr.totalQuestions} câu • {sr.score}đ</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black ${sr.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                   {sr.passed ? 'ĐẠT' : 'X'}
                </div>
             </div>
           ))}
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setScreen('REVIEW')}
            className="w-full flex items-center justify-center p-4 bg-teal-600 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition"
          >
            <Eye className="w-5 h-5 mr-2" />
            Xem chi tiết bài làm
          </button>
          
          <div className="grid grid-cols-2 gap-3">
             <button
              onClick={() => { setLastResult(null); setScreen('HOME'); }}
              className="flex items-center justify-center p-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition"
            >
              <Home className="w-5 h-5 mr-2" />
              Trang chủ
            </button>
            <button
              onClick={() => setScreen('MOCK_EXAM')}
              className="flex items-center justify-center p-4 bg-orange-50 text-orange-600 rounded-2xl font-bold hover:bg-orange-100 transition"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Thi lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;
