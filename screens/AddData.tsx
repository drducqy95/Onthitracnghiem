import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { db } from '../db';
import { Subject, Question, QuestionStatus, AppAttributes } from '../types';
import { ChevronLeft, CheckCircle, AlertCircle, Loader2, FileUp, FileJson, Table, Globe, Download, BookOpen, Link } from 'lucide-react';
import * as XLSX from 'xlsx';

const AddData: React.FC = () => {
  const { setScreen, settings } = useStore();
  const [activeTab, setActiveTab] = useState<'Thêm thủ công' | 'Thêm môn học' | 'Import File' | 'Import URL'>('Thêm thủ công');
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attributes, setAttributes] = useState<AppAttributes | null>(null);
  
  // State import
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });
  const [targetSubjectId, setTargetSubjectId] = useState<string>(''); 
  const [importUrl, setImportUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form thêm câu hỏi thủ công
  const [qData, setQData] = useState({
    subjectId: '', content: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', explanation: ''
  });

  // Form thêm môn học
  const [sData, setSData] = useState({
    name: '', examType: 'Thi khảo sát', level: 'Đại học', type: 'Môn cơ sở', parentName: ''
  });

  // Danh sách đề mẫu (URL)
  const presetExams = [
    {
      title: "Nội khoa",
      description: "Đề nội khoa 2018",
      url: "https://raw.githubusercontent.com/drducqy95/Onthitracnghiem/refs/heads/main/Noi_khoa.json",
      type: "JSON"
    },
    {
      title: "Sinh lý học",
      description: "Đề sinh lý học 2018",
      url: "https://raw.githubusercontent.com/drducqy95/Onthitracnghiem/refs/heads/main/sinhlyhoc.json",
      type: "JSON"
    },
    {
      title: "Nhận thức chính trị",
      description: "Học viện Quân Y 2025",
      url: "https://raw.githubusercontent.com/drducqy95/Onthitracnghiem/refs/heads/main/nhanthucchinhtri.json",
      type: "JSON"
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await db.getSubjects();
    const attr = await db.getAttributes();
    setSubjects(list);
    setAttributes(attr);
    
    // Auto select first subject
    if (list.length > 0) {
      if (!qData.subjectId) setQData(prev => ({ ...prev, subjectId: list[0].id }));
    }
    
    if (attr) {
      setSData(prev => ({
        ...prev,
        examType: attr.examTypes[0],
        level: attr.levels[0],
        type: attr.subjectTypes[0]
      }));
    }
  };

  // ==========================================
  // HELPER: TÌM HOẶC TẠO MÔN HỌC
  // ==========================================
  const findOrCreateSubject = async (name: string, parentId: string | undefined = undefined, currentList: Subject[]) => {
    const trimmedName = name.trim();
    let existing = currentList.find(s => 
        s.name.toLowerCase() === trimmedName.toLowerCase() && 
        s.parentId === parentId
    );

    if (existing) return existing;

    const newSubject: Subject = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: trimmedName,
        parentId: parentId,
        examType: (attributes?.examTypes[0] || "Thi khảo sát"),
        level: (attributes?.levels[0] || "Đại học"),
        type: (attributes?.subjectTypes[0] || "Môn cơ sở"),
        totalQuestions: 0,
        learnedCount: 0,
        needReviewCount: 0
    };

    await db.saveSubjects([newSubject]);
    currentList.push(newSubject);
    return newSubject;
  };

  // ==========================================
  // 1. LOGIC IMPORT EXCEL
  // ==========================================
  const processExcelFile = async (buffer: ArrayBuffer, subjectId: string) => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    
    const questionsToSave: Question[] = [];
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;

        const content = String(row[0] || "").trim();
        const optionA = String(row[1] || "").trim();
        
        let correctAnswers = String(row[5] || "A").trim().toUpperCase();
        if (correctAnswers.length > 1) correctAnswers = correctAnswers.charAt(0);
        if (!['A', 'B', 'C', 'D'].includes(correctAnswers)) correctAnswers = 'A';

        if (content && optionA) {
            questionsToSave.push({
                id: `q-ex-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                subjectId: subjectId,
                content,
                optionA,
                optionB: String(row[2] || "").trim(),
                optionC: String(row[3] || "").trim(),
                optionD: String(row[4] || "").trim(),
                correctAnswers,
                explanation: String(row[6] || "").trim(),
                status: QuestionStatus.UNLEARNED
            });
        }
    }
    
    if (questionsToSave.length > 0) {
        await db.saveQuestions(questionsToSave);
        await updateSubjectCount(subjectId, questionsToSave.length);
        return questionsToSave.length;
    }
    return 0;
  };

  // ==========================================
  // 2. LOGIC IMPORT JSON
  // ==========================================
  const processJsonFile = async (jsonContent: string) => {
    const jsonData = JSON.parse(jsonContent);
    let totalImported = 0;
    
    const currentSubjects = await db.getSubjects();
    const questionsBuffer: Question[] = [];

    for (const parentName of Object.keys(jsonData)) {
        if (!jsonData[parentName] || typeof jsonData[parentName] !== 'object') continue;

        const parentSubject = await findOrCreateSubject(parentName, undefined, currentSubjects);
        const childrenData = jsonData[parentName];

        for (const childName of Object.keys(childrenData)) {
             if (!childrenData[childName] || typeof childrenData[childName] !== 'object') continue;

             const childSubject = await findOrCreateSubject(childName, parentSubject.id, currentSubjects);
             const questionsMap = childrenData[childName];
             let childQCount = 0;

             for (const qKey of Object.keys(questionsMap)) {
                 const qObj = questionsMap[qKey];
                 
                 const content = String(qObj["Q"] || qObj["Question"] || "").trim();
                 const optionA = String(qObj["1"] || "").trim();
                 
                 if (content && optionA) {
                     let correctAnswers = String(qObj["A"] || "A").trim().toUpperCase();
                     if (correctAnswers.length > 1) correctAnswers = correctAnswers.charAt(0);

                     questionsBuffer.push({
                        id: `q-js-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        subjectId: childSubject.id,
                        content,
                        optionA,
                        optionB: String(qObj["2"] || "").trim(),
                        optionC: String(qObj["3"] || "").trim(),
                        optionD: String(qObj["4"] || "").trim(),
                        correctAnswers,
                        explanation: String(qObj["explain"] || qObj["explanation"] || "").trim(),
                        status: QuestionStatus.UNLEARNED
                     });
                     childQCount++;
                     totalImported++;
                 }
             }

             if (childQCount > 0) {
                 childSubject.totalQuestions = (childSubject.totalQuestions || 0) + childQCount;
                 await db.saveSubjects([childSubject]);
             }
        }
    }

    if (questionsBuffer.length > 0) {
        await db.saveQuestions(questionsBuffer);
    }

    return totalImported;
  };

  const updateSubjectCount = async (subjectId: string, count: number) => {
    const list = await db.getSubjects();
    const sub = list.find(s => s.id === subjectId);
    if (sub) {
        sub.totalQuestions = (sub.totalQuestions || 0) + count;
        await db.saveSubjects([sub]);
    }
  };

  // ==========================================
  // XỬ LÝ IMPORT
  // ==========================================
  const handleImportUrl = async (url: string) => {
      if (!url) return;
      setImportUrl(url);
      setStatus({ type: 'loading', msg: 'Đang tải dữ liệu từ URL...' });
      try {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Không thể kết nối tới URL");
          const text = await response.text();
          const importedCount = await processJsonFile(text);
          if (importedCount > 0) {
            setStatus({ type: 'success', msg: `Thành công! Đã nhập ${importedCount} câu hỏi.` });
            await loadData();
          } else {
            setStatus({ type: 'error', msg: "Không tìm thấy dữ liệu hợp lệ trong URL." });
          }
      } catch (err: any) {
          console.error(err);
          setStatus({ type: 'error', msg: `Lỗi tải URL: ${err.message}` });
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setStatus({ type: 'loading', msg: `Đang xử lý ${file.name}...` });

    try {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        let importedCount = 0;

        if (fileExt === 'json') {
            const text = await file.text();
            importedCount = await processJsonFile(text);
        } 
        else if (fileExt === 'xlsx' || fileExt === 'xls') {
            if (!targetSubjectId) {
                setStatus({ type: 'error', msg: 'Vui lòng chọn Môn học đích để nhập file Excel!' });
                return;
            }
            const buffer = await file.arrayBuffer();
            importedCount = await processExcelFile(buffer, targetSubjectId);
        } 
        else {
            throw new Error("Định dạng không hỗ trợ!");
        }

        if (importedCount > 0) {
            setStatus({ type: 'success', msg: `Thành công! Đã thêm ${importedCount} câu hỏi.` });
            await loadData();
        } else {
            setStatus({ type: 'error', msg: "Không tìm thấy dữ liệu hợp lệ." });
        }
    } catch (err: any) {
        console.error(err);
        setStatus({ type: 'error', msg: `Lỗi: ${err.message}` });
    }
  };

  const handleSaveSubject = async () => {
    if (!sData.name.trim()) { setStatus({ type: 'error', msg: 'Vui lòng nhập tên môn học' }); return; }
    setStatus({ type: 'loading', msg: 'Đang lưu...' });
    try {
      let finalParentId: string | undefined = undefined;
      if (sData.parentName.trim()) {
        const existingParent = await db.findSubjectByName(sData.parentName);
        if (existingParent) { finalParentId = existingParent.id; } else {
          const newParentId = 'sub-parent-' + Date.now();
          const newParent: Subject = { id: newParentId, name: sData.parentName.trim(), examType: sData.examType, level: sData.level, type: sData.type, totalQuestions: 0, learnedCount: 0, needReviewCount: 0 };
          await db.saveSubjects([newParent]); finalParentId = newParentId;
        }
      }
      const newSubject: Subject = { id: 'sub-' + Date.now(), name: sData.name.trim(), examType: sData.examType, level: sData.level, type: sData.type, parentId: finalParentId, totalQuestions: 0, learnedCount: 0, needReviewCount: 0 };
      await db.saveSubjects([newSubject]); await loadData();
      setSData(prev => ({ ...prev, name: '', parentName: '' }));
      setStatus({ type: 'success', msg: 'Lưu môn học thành công!' }); setTimeout(() => setStatus({ type: 'idle', msg: '' }), 3000);
    } catch (err) { setStatus({ type: 'error', msg: 'Lỗi khi lưu môn học' }); }
  };

  const handleSaveQuestion = async () => {
    if (!qData.subjectId || !qData.content.trim() || !qData.optionA.trim()) { setStatus({ type: 'error', msg: 'Vui lòng nhập đầy đủ thông tin' }); return; }
    setStatus({ type: 'loading', msg: 'Đang lưu...' });
    try {
      const newQuestion: Question = { id: 'q-' + Date.now(), subjectId: qData.subjectId, content: qData.content, optionA: qData.optionA, optionB: qData.optionB, optionC: qData.optionC, optionD: qData.optionD, correctAnswers: qData.correctAnswer, explanation: qData.explanation, status: QuestionStatus.UNLEARNED };
      await db.saveQuestions([newQuestion]);
      await updateSubjectCount(qData.subjectId, 1);
      setQData(prev => ({ ...prev, content: '', optionA: '', optionB: '', optionC: '', optionD: '', explanation: '' }));
      setStatus({ type: 'success', msg: 'Đã thêm câu hỏi!' }); setTimeout(() => setStatus({ type: 'idle', msg: '' }), 3000);
    } catch (err) { setStatus({ type: 'error', msg: 'Lỗi khi lưu câu hỏi' }); }
  };

  const inputStyle = settings.darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-800';

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="p-3 flex items-center bg-white/10 backdrop-blur-sm relative z-30 sticky top-0">
        <button onClick={() => setScreen('HOME')} className="mr-4">
          <ChevronLeft className={`w-6 h-6 ${settings.darkMode ? 'text-white' : 'text-slate-800'}`} />
        </button>
        <h2 className={`text-2xl font-medium ${settings.darkMode ? 'text-white' : 'text-slate-800'}`}>Nhập dữ liệu</h2>
      </div>

      {/* Tabs */}
      <div className={`flex shadow-sm relative z-20 overflow-x-auto hide-scrollbar ${settings.darkMode ? 'bg-slate-900 border-b border-slate-800' : 'bg-white'}`}>
        {(['Thêm thủ công', 'Thêm môn học', 'Import File', 'Import URL'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setStatus({ type: 'idle', msg: '' }); }} className={`flex-1 py-4 px-3 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === tab ? 'text-purple-700 border-b-4 border-purple-700' : 'text-slate-500'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto pb-32 relative z-10">
        {status.type !== 'idle' && (
          <div className={`p-3 rounded-3xl flex items-center space-x-3 mb-2 animate-in slide-in-from-top duration-300 ${status.type === 'loading' ? 'bg-blue-50 text-blue-700' : status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{status.msg}</p>
          </div>
        )}

        {/* Tab 1: Thủ công */}
        {activeTab === 'Thêm thủ công' && (
          <div className="space-y-4">
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">MÔN HỌC</label>
              <select value={qData.subjectId} onChange={(e) => setQData({...qData, subjectId: e.target.value})} className={`w-full border rounded-2xl p-3 outline-none focus:ring-2 focus:ring-purple-400 appearance-none font-medium ${inputStyle}`}>
                {subjects.length === 0 ? <option value="">Chưa có môn học nào</option> : subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">NỘI DUNG</label>
              <textarea value={qData.content} onChange={(e) => setQData({...qData, content: e.target.value})} className={`w-full border rounded-2xl p-3 min-h-[100px] outline-none focus:ring-2 focus:ring-purple-400 font-medium ${inputStyle}`}></textarea>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <div key={opt} className="relative">
                    <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">ĐÁP ÁN {opt}</label>
                    <input type="text" value={qData[`option${opt}` as keyof typeof qData]} onChange={(e) => setQData({...qData, [`option${opt}`]: e.target.value})} className={`w-full border rounded-2xl p-3 outline-none focus:ring-2 focus:ring-purple-400 font-medium ${inputStyle}`} />
                </div>
                ))}
            </div>

            {/* --- PHẦN BỔ SUNG: GIẢI THÍCH --- */}
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">GIẢI THÍCH (TÙY CHỌN)</label>
              <textarea 
                value={qData.explanation} 
                onChange={(e) => setQData({...qData, explanation: e.target.value})} 
                className={`w-full border rounded-2xl p-3 min-h-[80px] outline-none focus:ring-2 focus:ring-purple-400 font-medium ${inputStyle}`}
                placeholder="Nhập giải thích chi tiết cho đáp án đúng..."
              ></textarea>
            </div>
            {/* -------------------------------- */}

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">ĐÚNG</label>
                <select value={qData.correctAnswer} onChange={(e) => setQData({...qData, correctAnswer: e.target.value})} className={`w-full border rounded-2xl p-3 outline-none focus:ring-2 focus:ring-purple-400 appearance-none font-medium text-center ${inputStyle}`}>
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                </select>
              </div>
              <button onClick={handleSaveQuestion} disabled={status.type === 'loading'} className="w-full bg-[#6C5CE7] rounded-2xl text-white font-medium shadow-lg shadow-purple-100 active:scale-95 transition">Lưu</button>
            </div>
          </div>
        )}

        {/* Tab 2: Thêm môn */}
        {activeTab === 'Thêm môn học' && (
           <div className="space-y-6">
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">TÊN MÔN HỌC</label>
              <input type="text" value={sData.name} onChange={(e) => setSData({...sData, name: e.target.value})} className={`w-full border rounded-2xl p-3 font-medium outline-none focus:ring-2 focus:ring-purple-400 ${inputStyle}`} placeholder="VD: Tim mạch" />
            </div>
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">BẬC (CHA)</label>
              <input type="text" value={sData.parentName} onChange={(e) => setSData({...sData, parentName: e.target.value})} className={`w-full border rounded-2xl p-3 font-medium outline-none focus:ring-2 focus:ring-purple-400 ${inputStyle}`} placeholder="VD: Nội khoa (Để trống nếu là môn gốc)" />
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="relative">
                 <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">KỲ THI</label>
                 <select value={sData.examType} onChange={(e) => setSData({...sData, examType: e.target.value})} className={`w-full border rounded-2xl p-3 font-medium outline-none focus:ring-2 focus:ring-purple-400 appearance-none ${inputStyle}`}>
                   {attributes?.examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
               </div>
               <div className="relative">
                 <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">CẤP ĐỘ</label>
                 <select value={sData.level} onChange={(e) => setSData({...sData, level: e.target.value})} className={`w-full border rounded-2xl p-3 font-medium outline-none focus:ring-2 focus:ring-purple-400 appearance-none ${inputStyle}`}>
                   {attributes?.levels.map(l => <option key={l} value={l}>{l}</option>)}
                 </select>
               </div>
            </div>

            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">LOẠI MÔN</label>
              <select value={sData.type} onChange={(e) => setSData({...sData, type: e.target.value})} className={`w-full border rounded-2xl p-3 font-medium outline-none focus:ring-2 focus:ring-purple-400 appearance-none ${inputStyle}`}>
                {attributes?.subjectTypes.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <button onClick={handleSaveSubject} disabled={status.type === 'loading'} className="w-full bg-[#6C5CE7] py-5 rounded-3xl text-white font-medium text-lg shadow-xl shadow-purple-100 active:scale-95 transition">Tạo Môn Học</button>
          </div>
        )}

        {/* Tab 3: Import File */}
        {activeTab === 'Import File' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-[40px] border flex flex-col items-center text-center space-y-4 ${settings.darkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-100'}`}>
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-purple-600 shadow-sm"><FileUp className="w-8 h-8" /></div>
               <div><h3 className={`text-lg font-medium ${settings.darkMode ? 'text-purple-300' : 'text-purple-900'}`}>Import dữ liệu</h3><p className={`text-sm ${settings.darkMode ? 'text-purple-400' : 'text-purple-600/70'}`}>JSON (Cấu trúc Mẹ-Con) & Excel (Chọn môn)</p></div>
            </div>
            
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">CHỌN MÔN (BẮT BUỘC NẾU DÙNG EXCEL)</label>
              <select value={targetSubjectId} onChange={(e) => setTargetSubjectId(e.target.value)} className={`w-full border rounded-2xl p-3 outline-none focus:ring-2 focus:ring-purple-400 appearance-none font-medium ${inputStyle}`}>
                <option value="">-- Mặc định (Tự động với JSON) --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="pt-2">
              <input type="file" accept=".json,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={status.type === 'loading'} 
                className={`w-full py-6 rounded-[32px] text-white font-medium text-lg shadow-xl flex items-center justify-center space-x-3 active:scale-95 transition bg-purple-600 shadow-purple-200`}
              >
                {status.type === 'loading' ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6" />}
                <span>Chọn tập tin...</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100">
                   <div className="flex items-center text-orange-700 text-[10px] font-black uppercase mb-1"><FileJson className="w-3 h-3 mr-1" /> JSON (Tự tạo môn)</div>
                   <p className="text-[10px] text-orange-800 leading-tight">Cấu trúc: "Môn Mẹ" {`->`} "Môn Con" {`->`} "Question Object".</p>
                </div>
                 <div className="p-3 bg-green-50 rounded-2xl border border-green-100">
                   <div className="flex items-center text-green-700 text-[10px] font-black uppercase mb-1"><Table className="w-3 h-3 mr-1" /> Excel (Cần chọn môn)</div>
                   <p className="text-[10px] text-green-800 leading-tight">Cột A: Nội dung, B-E: Đáp án, F: Kết quả, G: Giải thích.</p>
                </div>
            </div>
          </div>
        )}

        {/* Tab 4: Import URL */}
        {activeTab === 'Import URL' && (
          <div className="space-y-6">
             <div className={`p-6 rounded-[40px] border flex flex-col items-center text-center space-y-4 ${settings.darkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-100'}`}>
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-purple-600 shadow-sm"><Globe className="w-8 h-8" /></div>
               <div><h3 className={`text-lg font-medium ${settings.darkMode ? 'text-purple-300' : 'text-purple-900'}`}>Import từ Internet</h3><p className={`text-sm ${settings.darkMode ? 'text-purple-400' : 'text-purple-600/70'}`}>Nhập link JSON trực tiếp (Github, Web...)</p></div>
            </div>

            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-[10px] text-slate-500 font-medium z-10">URL DỮ LIỆU JSON</label>
              <div className="flex items-center">
                 <input type="text" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} className={`w-full border rounded-2xl p-3 pr-12 font-medium text-xs outline-none focus:ring-2 focus:ring-purple-400 ${inputStyle}`} placeholder="https://..." />
                <Link className="absolute right-4 w-4 h-4 text-slate-300" />
              </div>
            </div>
            
            <button onClick={() => handleImportUrl(importUrl)} disabled={status.type === 'loading' || !importUrl} className="w-full bg-[#6C5CE7] py-5 rounded-3xl text-white font-medium text-lg shadow-xl shadow-purple-100 flex items-center justify-center space-x-3 active:scale-95 transition disabled:opacity-50">
              {status.type === 'loading' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}<span>Tải và Nhập</span>
            </button>

            {/* List Đề Mẫu */}
            <div className="pt-6 border-t border-slate-200/50">
               <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${settings.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Bộ đề có sẵn (Khuyên dùng)</h3>
               <div className="space-y-3">
                 {presetExams.map((exam, idx) => (
                   <div key={idx} onClick={() => handleImportUrl(exam.url)} className={`p-3 rounded-3xl border flex items-center justify-between group cursor-pointer active:scale-95 transition-all ${settings.darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-100 hover:border-purple-200 hover:shadow-md'}`}>
                     <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1"><BookOpen className="w-4 h-4 text-purple-500" /><span className={`font-medium ${settings.darkMode ? 'text-white' : 'text-slate-800'}`}>{exam.title}</span></div>
                        <p className="text-xs text-slate-400 mb-2">{exam.description}</p>
                     </div>
                     <div className="p-2 bg-purple-50 text-purple-600 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors"><Download className="w-4 h-4" /></div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddData;
