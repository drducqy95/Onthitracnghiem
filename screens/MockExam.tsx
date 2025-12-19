
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Subject, Question, ExamConfig, AppAttributes } from '../types';
import { useStore } from '../store';
import { ChevronLeft, Search, Filter, PlayCircle, Clock, BookOpen, ChevronRight, Settings, Check } from 'lucide-react';

const MockExam: React.FC = () => {
  const { setScreen, startQuiz, startSession } = useStore();
  const [activeTab, setActiveTab] = useState<'Kỳ thi' | 'Tự chọn'>('Kỳ thi');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examConfigs, setExamConfigs] = useState<ExamConfig[]>([]);
  const [attributes, setAttributes] = useState<AppAttributes | null>(null);
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExamType, setFilterExamType] = useState('Tất cả');
  const [filterLevel, setFilterLevel] = useState('Tất cả');
  const [filterSubjectType, setFilterSubjectType] = useState('Tất cả');
  const [showOnlyRoot, setShowOnlyRoot] = useState(true);

  // Self-select config
  const [numQuestions, setNumQuestions] = useState('45');
  const [timeLimit, setTimeLimit] = useState('45');

  useEffect(() => {
    const load = async () => {
      const s = await db.getSubjects();
      const e = await db.getExamConfigs();
      const a = await db.getAttributes();
      setSubjects(s);
      setExamConfigs(e);
      setAttributes(a);
    };
    load();
  }, []);

  const handleStartExam = async (config: ExamConfig) => {
    const questionSets: Question[][] = [];
    for (const sc of config.subjects) {
      const allQ = await db.getQuestionsBySubjectRecursive(sc.subjectId);
      const shuffled = allQ.sort(() => 0.5 - Math.random()).slice(0, sc.count);
      if (shuffled.length === 0) {
        alert(`Môn ${sc.subjectName} chưa có câu hỏi!`);
        return;
      }
      questionSets.push(shuffled);
    }
    startSession(config.name, config.subjects, questionSets);
  };

  const handleStartSelfSelect = async (s: Subject) => {
    const allQ = await db.getQuestionsBySubjectRecursive(s.id);
    if (allQ.length === 0) {
      alert("Môn học này chưa có câu hỏi!");
      return;
    }
    const count = Math.min(parseInt(numQuestions) || 10, allQ.length);
    const shuffled = allQ.sort(() => 0.5 - Math.random()).slice(0, count);
    startQuiz(shuffled, parseInt(timeLimit) || 15);
  };

  const filteredConfigs = examConfigs.filter(c => {
    const matchesExamType = filterExamType === 'Tất cả' || c.examType === filterExamType;
    const matchesLevel = filterLevel === 'Tất cả' || c.level === filterLevel;
    return matchesExamType && matchesLevel;
  });

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExamType = filterExamType === 'Tất cả' || s.examType === filterExamType;
    const matchesLevel = filterLevel === 'Tất cả' || s.level === filterLevel;
    const matchesSubjectType = filterSubjectType === 'Tất cả' || s.type === filterSubjectType;
    const isRoot = !s.parentId;
    const matchesRootFilter = !showOnlyRoot || isRoot;
    
    return matchesSearch && matchesExamType && matchesLevel && matchesSubjectType && matchesRootFilter;
  });

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="p-4 flex items-center">
        <button onClick={() => setScreen('HOME')} className="mr-4">
          <ChevronLeft className="w-6 h-6 text-slate-800" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Thi Thử</h2>
      </div>

      <div className="flex border-b border-white/30 px-6">
        {['Kỳ thi', 'Tự chọn'].map(tab => (
          <button 
            key={tab}
            onClick={() => {
                setActiveTab(tab as any);
                setFilterExamType('Tất cả');
                setFilterLevel('Tất cả');
                setFilterSubjectType('Tất cả');
                setSearchTerm('');
            }}
            className={`flex-1 py-3 text-lg font-bold transition-colors ${activeTab === tab ? 'text-purple-700 border-b-4 border-purple-700' : 'text-slate-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {/* Universal Attribute Filters (shown based on tab requirements) */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center space-x-2 text-purple-700 mb-1">
             <Filter className="w-4 h-4" />
             <span className="text-xs font-bold uppercase">Bộ lọc nâng cao</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
             <select 
               value={filterExamType} onChange={e => setFilterExamType(e.target.value)}
               className="bg-slate-50 border-none rounded-xl p-2 text-xs font-bold text-slate-700 outline-none"
             >
                <option value="Tất cả">Kỳ thi: Tất cả</option>
                {attributes?.examTypes.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
             <select 
               value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
               className="bg-slate-50 border-none rounded-xl p-2 text-xs font-bold text-slate-700 outline-none"
             >
                <option value="Tất cả">Cấp độ: Tất cả</option>
                {attributes?.levels.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
             
             {activeTab === 'Tự chọn' && (
               <>
                 <select 
                   value={filterSubjectType} onChange={e => setFilterSubjectType(e.target.value)}
                   className="bg-slate-50 border-none rounded-xl p-2 text-xs font-bold text-slate-700 outline-none"
                 >
                    <option value="Tất cả">Loại môn: Tất cả</option>
                    {attributes?.subjectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
                 <button 
                   onClick={() => setShowOnlyRoot(!showOnlyRoot)}
                   className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold transition ${showOnlyRoot ? 'bg-purple-100 text-purple-700' : 'bg-slate-50 text-slate-500'}`}
                 >
                   <span>Bộ đề gốc</span>
                   {showOnlyRoot && <Check className="w-3 h-3 ml-1" />}
                 </button>
               </>
             )}
          </div>
        </div>

        {activeTab === 'Kỳ thi' ? (
          <div className="space-y-4">
            {filteredConfigs.length === 0 ? (
              <div className="text-center py-20 text-slate-500 italic bg-white/50 rounded-3xl">
                Không tìm thấy kỳ thi phù hợp bộ lọc.
              </div>
            ) : (
              filteredConfigs.map(config => (
                <div key={config.id} className="bg-white/95 rounded-3xl p-5 shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 uppercase">{config.name}</h3>
                      <div className="flex space-x-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-bold">{config.examType}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full font-bold">{config.level}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleStartExam(config)}
                      className="p-3 bg-purple-600 text-white rounded-full shadow-lg active:scale-90 transition"
                    >
                      <PlayCircle className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {config.subjects.map(sc => (
                      <div key={sc.subjectId} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-xl">
                        <span className="text-slate-700 font-medium">● {sc.subjectName}</span>
                        <div className="flex items-center space-x-3 text-slate-400">
                          <span className="flex items-center"><BookOpen className="w-3 h-3 mr-1" /> {sc.count}</span>
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {sc.time}'</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Global Self-Select Config */}
            <div className="bg-white/95 rounded-3xl p-6 shadow-sm border border-purple-100">
               <h3 className="text-slate-800 font-bold mb-4 flex items-center">
                 <Settings className="w-4 h-4 mr-2 text-purple-600" /> Cấu hình bài thi
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-500 font-bold">SỐ CÂU</label>
                    <input type="number" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 pt-4 text-center font-bold" />
                  </div>
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-slate-500 font-bold">THỜI GIAN (P)</label>
                    <input type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 pt-4 text-center font-bold" />
                  </div>
               </div>
            </div>

            <div className="relative">
              <input 
                type="text" placeholder="Tìm bộ đề theo tên..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white/90 rounded-2xl py-3 pl-12 pr-4 shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-purple-400 transition"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-3">
               {filteredSubjects.length === 0 ? (
                 <div className="text-center py-20 text-slate-500 italic bg-white/50 rounded-3xl">Không tìm thấy bộ đề phù hợp.</div>
               ) : (
                 filteredSubjects.map(s => (
                   <div 
                    key={s.id} onClick={() => handleStartSelfSelect(s)}
                    className="bg-white/95 rounded-[32px] p-5 shadow-sm flex items-center justify-between group active:scale-[0.98] transition cursor-pointer border border-slate-50"
                   >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">📁</span>
                          <h4 className="font-bold text-slate-800 uppercase">{s.name}</h4>
                        </div>
                        <div className="flex space-x-2 mt-1">
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.examType}</span>
                           <span className="text-[10px] text-slate-300">•</span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.level}</span>
                           <span className="text-[10px] text-slate-300">•</span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.type}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-purple-600 transition" />
                   </div>
                 ))
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MockExam;
