import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { db } from '../db'; 
import { Subject, AppAttributes } from '../types'; // Thêm AppAttributes
import { 
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle, 
  XCircle, Info, ArrowLeft, BookOpen, Search, Loader2, Filter 
} from 'lucide-react';

const Study: React.FC = () => {
  const { 
    currentStudySession, 
    answerStudyQuestion, 
    resetStudyQuestion, 
    setStudyIndex, 
    setScreen, 
    startStudy, 
    settings 
  } = useStore();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attributes, setAttributes] = useState<AppAttributes | null>(null); // State lưu thuộc tính
  const [loading, setLoading] = useState(false);

  // --- STATE BỘ LỌC ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExamType, setFilterExamType] = useState('Tất cả');
  const [filterLevel, setFilterLevel] = useState('Tất cả');
  const [filterSubjectType, setFilterSubjectType] = useState('Tất cả');
  const [showOnlyRoot, setShowOnlyRoot] = useState(true);

  // Tải danh sách môn học & Thuộc tính khi vào màn hình
  useEffect(() => {
    const loadData = async () => {
      const list = await db.getSubjects();
      const attr = await db.getAttributes(); // Lấy thuộc tính để điền vào dropdown
      setSubjects(list);
      setAttributes(attr);
    };
    loadData();
  }, []);

  const handleBackToSelection = () => {
    useStore.setState({ currentStudySession: null });
  };

  const handleSelectSubject = async (sub: Subject) => {
    setLoading(true);
    try {
      const questions = await db.getQuestionsBySubjectRecursive(sub.id);
      
      if (questions.length === 0) {
        alert('Bộ đề này chưa có câu hỏi nào!');
        setLoading(false);
        return;
      }
      const shuffled = questions.sort(() => 0.5 - Math.random());
      startStudy(`Ôn tập: ${sub.name}`, shuffled);
      
    } catch (error) {
      console.error(error);
      alert('Lỗi khi tải câu hỏi');
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // PHẦN 1: GIAO DIỆN CHỌN BỘ ĐỀ (CÓ BỘ LỌC)
  // -----------------------------------------------------------
  if (!currentStudySession) {
    // --- LOGIC LỌC ĐA THUỘC TÍNH ---
    const filteredSubjects = subjects.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesExam = filterExamType === 'Tất cả' || s.examType === filterExamType;
      const matchesLevel = filterLevel === 'Tất cả' || s.level === filterLevel;
      const matchesType = filterSubjectType === 'Tất cả' || s.type === filterSubjectType;
      const matchesRoot = showOnlyRoot ? !s.parentId : true;

      return matchesSearch && matchesExam && matchesLevel && matchesType && matchesRoot;
    });

    const dropdownClass = `px-3 py-2 rounded-xl text-xs font-bold border outline-none focus:border-purple-500 appearance-none ${settings.darkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-700 border-slate-200'}`;

    return (
      <div className={`flex flex-col h-[100dvh] ${settings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center space-x-3 sticky top-0 z-20 ${settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
           <button onClick={() => setScreen('HOME')} className="p-2 rounded-full hover:bg-slate-100/10">
              <ChevronLeft className="w-6 h-6" />
           </button>
           <h2 className="text-xl font-bold">Chọn bộ đề ôn tập</h2>
        </div>

        {/* --- KHU VỰC TÌM KIẾM & BỘ LỌC --- */}
        <div className={`p-4 space-y-3 border-b ${settings.darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
           {/* Thanh tìm kiếm */}
           <div className={`flex items-center px-4 py-3 rounded-2xl border ${settings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <Search className="w-5 h-5 opacity-50 mr-3" />
              <input 
                type="text" 
                placeholder="Tìm kiếm môn học..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none flex-1 font-medium"
              />
           </div>

           {/* Hàng bộ lọc ngang */}
           <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-1">
              {/* Nút lọc Root */}
              <button 
                onClick={() => setShowOnlyRoot(!showOnlyRoot)}
                className={`flex items-center px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition shrink-0 ${
                    showOnlyRoot 
                    ? (settings.darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-800 text-white border-slate-800')
                    : (settings.darkMode ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-200')
                }`}
              >
                  <Filter className="w-3 h-3 mr-1" /> {showOnlyRoot ? 'Môn gốc' : 'Tất cả'}
              </button>

              {/* Lọc Kỳ thi */}
              <select value={filterExamType} onChange={(e) => setFilterExamType(e.target.value)} className={dropdownClass}>
                 <option value="Tất cả">Kỳ thi: Tất cả</option>
                 {attributes?.examTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Lọc Cấp độ */}
              <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className={dropdownClass}>
                 <option value="Tất cả">Cấp độ: Tất cả</option>
                 {attributes?.levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              {/* Lọc Loại môn */}
              <select value={filterSubjectType} onChange={(e) => setFilterSubjectType(e.target.value)} className={dropdownClass}>
                 <option value="Tất cả">Loại: Tất cả</option>
                 {attributes?.subjectTypes.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
           </div>
        </div>
        
        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-3 pt-4">
           {loading && (
             <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
           )}
           
           {!loading && filteredSubjects.map(sub => {
              const childCount = subjects.filter(s => s.parentId === sub.id).length;
              return (
                <div 
                  key={sub.id}
                  onClick={() => handleSelectSubject(sub)}
                  className={`p-4 rounded-3xl border flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all ${
                    settings.darkMode 
                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' 
                    : 'bg-white border-slate-100 hover:shadow-md'
                  }`}
                >
                   <div className="flex-1">
                      <h3 className="font-bold text-base mb-1">{sub.name}</h3>
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold opacity-60 uppercase">
                          <span>{sub.totalQuestions || 0} câu</span>
                          {childCount > 0 && <span className="text-purple-500">• {childCount} môn con</span>}
                          {/* Hiển thị tags để biết đang lọc đúng */}
                          <span className="bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-500 dark:text-slate-300">{sub.examType}</span>
                      </div>
                   </div>
                   <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl dark:bg-indigo-900/30 dark:text-indigo-400">
                      <BookOpen className="w-5 h-5" />
                   </div>
                </div>
              );
           })}

           {!loading && filteredSubjects.length === 0 && (
             <div className="text-center py-10 opacity-50 flex flex-col items-center">
                 <Search className="w-10 h-10 mb-2 opacity-20" />
                 <p>Không tìm thấy môn học nào phù hợp</p>
             </div>
           )}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // PHẦN 2: GIAO DIỆN ÔN TẬP (GIỮ NGUYÊN)
  // -----------------------------------------------------------
  
  const { questions, currentIndex, userAnswers } = currentStudySession;
  const currentQuestion = questions[currentIndex];
  
  const userAnswer = userAnswers[currentQuestion.id];
  const isAnswered = !!userAnswer;
  const isCorrect = userAnswer === currentQuestion.correctAnswers;

  const handleSelectOption = (optLabel: string) => {
    if (isAnswered) return;
    answerStudyQuestion(currentQuestion.id, optLabel);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setStudyIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setStudyIndex(currentIndex - 1);
  };

  const options = [
    { label: 'A', text: currentQuestion.optionA },
    { label: 'B', text: currentQuestion.optionB },
    { label: 'C', text: currentQuestion.optionC },
    { label: 'D', text: currentQuestion.optionD },
  ];

  const bgClass = settings.darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900';
  const cardClass = settings.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  return (
    <div className={`flex flex-col h-[100dvh] ${bgClass}`}>
      {/* Header Session */}
      <div className={`px-4 py-3 border-b flex items-center justify-between sticky top-0 z-20 ${settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <button onClick={handleBackToSelection} className="p-2 rounded-full hover:bg-slate-100/10 transition">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
            <h2 className="text-sm font-bold max-w-[200px] truncate">{currentStudySession.title}</h2>
            <span className="text-xs opacity-60 font-medium">Câu {currentIndex + 1} / {questions.length}</span>
        </div>
        <div className="w-10"></div> 
      </div>

      {/* Content Pager */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className={`rounded-3xl p-6 shadow-sm border ${cardClass}`}>
          <h3 className="text-lg font-semibold leading-relaxed mb-6">{currentQuestion.content}</h3>

          <div className="space-y-3">
            {options.map((opt) => {
              let btnClass = settings.darkMode 
                  ? 'border-slate-600 bg-slate-700/50 hover:bg-slate-700' 
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100';
              let icon = <span className="font-bold text-sm">{opt.label}</span>;

              if (isAnswered) {
                if (opt.label === currentQuestion.correctAnswers) {
                   btnClass = 'border-green-500 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                   icon = <CheckCircle className="w-5 h-5 text-green-600" />;
                } else if (opt.label === userAnswer) {
                   btnClass = 'border-red-500 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                   icon = <XCircle className="w-5 h-5 text-red-600" />;
                } else {
                   btnClass = 'opacity-50 border-transparent';
                }
              }

              return (
                <button
                  key={opt.label}
                  onClick={() => handleSelectOption(opt.label)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-2xl border-2 text-left flex items-start space-x-3 transition-all ${btnClass}`}
                >
                  <div className="shrink-0 pt-0.5">{icon}</div>
                  <span className="text-sm font-medium">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`p-4 rounded-2xl border mb-4 ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <div className="font-bold flex items-center text-sm">
                        {isCorrect ? 'CHÍNH XÁC! 🎉' : 'CHƯA ĐÚNG! 😅'}
                    </div>
                </div>

                {currentQuestion.explanation && (
                    <div className={`p-4 rounded-2xl border ${settings.darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                        <div className="flex items-center text-blue-600 text-xs font-bold mb-2">
                            <Info className="w-4 h-4 mr-1" /> GIẢI THÍCH CHI TIẾT
                        </div>
                        <p className={`text-sm italic leading-relaxed ${settings.darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                            {currentQuestion.explanation}
                        </p>
                    </div>
                )}

                <button 
                    onClick={() => resetStudyQuestion(currentQuestion.id)}
                    className="mt-4 flex items-center justify-center w-full py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> Làm lại câu này
                </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Nav */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 border-t flex justify-between items-center z-30 backdrop-blur-md ${settings.darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
         <button 
            disabled={currentIndex === 0}
            onClick={handlePrev}
            className="flex items-center px-5 py-3 rounded-2xl font-bold text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition"
         >
            <ChevronLeft className="w-5 h-5 mr-1" /> Trước
         </button>

         <button 
            disabled={currentIndex === questions.length - 1}
            onClick={handleNext}
            className="flex items-center px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 active:scale-95 transition disabled:opacity-50 disabled:shadow-none"
         >
            Tiếp theo <ChevronRight className="w-5 h-5 ml-1" />
         </button>
      </div>
    </div>
  );
};

export default Study;