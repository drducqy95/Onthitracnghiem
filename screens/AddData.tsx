import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { db } from '../db';
import { Subject, Question, QuestionStatus, AppAttributes } from '../types';
import {
  ChevronLeft, CheckCircle, AlertCircle, Loader2, FileUp,
  FileJson, Table, Globe, Download, BookOpen, Link, Image as ImageIcon, X
} from 'lucide-react';
import * as XLSX from 'xlsx';

const AddData: React.FC = () => {
  const { setScreen, settings } = useStore();
  const [activeTab, setActiveTab] = useState<'Thêm thủ công' | 'Thêm môn học' | 'Import File' | 'Kho dữ liệu'>('Thêm thủ công');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attributes, setAttributes] = useState<AppAttributes | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });
  const [targetSubjectId, setTargetSubjectId] = useState<string>('');
  const [importUrl, setImportUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form dữ liệu câu hỏi (Bao gồm các trường ảnh)
  const [qData, setQData] = useState({
    subjectId: '',
    content: '',
    image: '',
    optionA: '', optionAImage: '',
    optionB: '', optionBImage: '',
    optionC: '', optionCImage: '',
    optionD: '', optionDImage: '',
    correctAnswer: 'A',
    explanation: '',
    explanationImage: ''
  });

  const [sData, setSData] = useState({
    name: '', examType: 'Thi khảo sát', level: 'Đại học', type: 'Môn cơ sở', parentName: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const list = await db.getSubjects();
    const attr = await db.getAttributes();
    setSubjects(list);
    setAttributes(attr);
    if (list.length > 0 && !qData.subjectId) setQData(prev => ({ ...prev, subjectId: list[0].id }));
    if (attr) setSData(prev => ({ ...prev, examType: attr.examTypes[0], level: attr.levels[0], type: attr.subjectTypes[0] }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (field: string) => {
    setQData(prev => ({ ...prev, [field]: '' }));
  };

  // Hàm lưu câu hỏi duy nhất (Để tránh lỗi redeclare)
  const handleSaveQuestion = async () => {
    if (!qData.subjectId || !qData.content.trim() || !qData.optionA.trim()) {
      setStatus({ type: 'error', msg: 'Vui lòng nhập đầy đủ thông tin' });
      return;
    }
    setStatus({ type: 'loading', msg: 'Đang lưu...' });
    try {
      const newQuestion: Question = {
        id: 'q-' + Date.now(),
        subjectId: qData.subjectId,
        content: qData.content,
        image: qData.image || undefined,
        optionA: qData.optionA,
        optionB: qData.optionB,
        optionC: qData.optionC,
        optionD: qData.optionD,
        optionImages: {
          A: qData.optionAImage || undefined,
          B: qData.optionBImage || undefined,
          C: qData.optionCImage || undefined,
          D: qData.optionDImage || undefined
        },
        correctAnswers: qData.correctAnswer,
        explanation: qData.explanation || undefined,
        explanationImage: qData.explanationImage || undefined,
        status: QuestionStatus.UNLEARNED
      };

      await db.saveQuestions([newQuestion]);

      const sub = subjects.find(s => s.id === qData.subjectId);
      if (sub) {
        sub.totalQuestions = (sub.totalQuestions || 0) + 1;
        await db.saveSubjects([sub]);
      }

      setQData(prev => ({
        ...prev, content: '', image: '',
        optionA: '', optionAImage: '', optionB: '', optionBImage: '',
        optionC: '', optionCImage: '', optionD: '', optionDImage: '',
        explanation: '', explanationImage: ''
      }));
      setStatus({ type: 'success', msg: 'Đã lưu câu hỏi!' });
      setTimeout(() => setStatus({ type: 'idle', msg: '' }), 2000);
    } catch (err) { setStatus({ type: 'error', msg: 'Lỗi khi lưu' }); }
  };

  const handleSaveSubject = async () => {
    if (!sData.name.trim()) return;
    setStatus({ type: 'loading', msg: 'Đang lưu môn học...' });
    try {
      const newSub: Subject = {
        id: 'sub-' + Date.now(),
        name: sData.name.trim(),
        examType: sData.examType,
        level: sData.level,
        type: sData.type,
        parentId: sData.parentName || undefined,
        totalQuestions: 0, learnedCount: 0, needReviewCount: 0
      };
      await db.saveSubjects([newSub]);
      await loadData();
      setSData(prev => ({ ...prev, name: '', parentName: '' }));
      setStatus({ type: 'success', msg: 'Đã tạo môn học!' });
      setTimeout(() => setStatus({ type: 'idle', msg: '' }), 2000);
    } catch (err) { setStatus({ type: 'error', msg: 'Lỗi lưu môn học' }); }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!targetSubjectId) {
      setStatus({ type: 'error', msg: 'Vui lòng chọn môn học để nhập!' });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus({ type: 'loading', msg: 'Đang xử lý file Excel...' });
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const questions: Question[] = data.map((row, idx) => ({
          id: `q-${Date.now()}-${idx}`,
          subjectId: targetSubjectId,
          content: (row.Q || row.Question || row.Content || '').toString(),
          optionA: (row['1'] || row.A || row.OptionA || '').toString(),
          optionB: (row['2'] || row.B || row.OptionB || '').toString(),
          optionC: (row['3'] || row.C || row.OptionC || '').toString(),
          optionD: (row['4'] || row.D || row.OptionD || '').toString(),
          correctAnswers: (row.A || row.Correct || row.Answer || 'A').toString(),
          explanation: (row.explain || row.Explanation || '').toString(),
          status: QuestionStatus.UNLEARNED
        }));

        if (questions.length === 0) throw new Error("File không có dữ liệu hợp lệ");

        await db.saveQuestions(questions);

        // Cập nhật số lượng câu hỏi của môn
        const sub = subjects.find(s => s.id === targetSubjectId);
        if (sub) {
          sub.totalQuestions = (sub.totalQuestions || 0) + questions.length;
          await db.saveSubjects([sub]);
        }

        setStatus({ type: 'success', msg: `Đã nhập thành công ${questions.length} câu hỏi!` });
        setTimeout(() => setStatus({ type: 'idle', msg: '' }), 3000);
        loadData();
      } catch (err: any) {
        setStatus({ type: 'error', msg: `Lỗi Excel: ${err.message}` });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus({ type: 'loading', msg: 'Đang phân tích JSON...' });
    const reader = new FileReader();
    reader.onload = async (evt) => {
      await processJsonData(evt.target?.result as string);
    };
    reader.readAsText(file);
  };

  const processJsonData = async (jsonString: string, metadata?: Partial<Subject>) => {
    try {
      const json = JSON.parse(jsonString);
      setStatus({ type: 'loading', msg: 'Đang xử lý dữ liệu...' });

      // Helper để import đệ quy
      const importNode = async (obj: any, parentId?: string) => {
        for (const key in obj) {
          const value = obj[key];
          // Nếu là một Subject (value là object và không phải là question)
          if (typeof value === 'object' && !value.Q) {
            const subId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            const newSub: Subject = {
              id: subId,
              name: key,
              parentId: parentId,
              totalQuestions: 0,
              examType: metadata?.examType || (attributes?.examTypes[0] || 'Thi khảo sát'),
              level: metadata?.level || (attributes?.levels[0] || 'Đại học'),
              type: metadata?.type || (attributes?.subjectTypes[0] || 'Môn cơ sở')
            };
            await db.saveSubjects([newSub]);
            await importNode(value, subId);
          }
          // Nếu là một câu hỏi (Key là số và có trường Q)
          else if (value.Q) {
            if (!parentId) continue; // Phải có subject mới lưu được câu hỏi
            const qId = `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            const newQ: Question = {
              id: qId,
              subjectId: parentId,
              content: value.Q,
              optionA: value['1'] || '',
              optionB: value['2'] || '',
              optionC: value['3'] || '',
              optionD: value['4'] || '',
              correctAnswers: value.A || 'A',
              explanation: value.explain || '',
              status: QuestionStatus.UNLEARNED
            };
            await db.saveQuestions([newQ]);

            // Cập nhật số lượng cho subject cha
            const subjectsList = await db.getSubjects();
            const sub = subjectsList.find(s => s.id === parentId);
            if (sub) {
              sub.totalQuestions = (sub.totalQuestions || 0) + 1;
              await db.saveSubjects([sub]);
            }
          }
        }
      };

      await importNode(json);
      setStatus({ type: 'success', msg: 'Đã nhập dữ liệu JSON thành công!' });
      loadData();
    } catch (err: any) {
      setStatus({ type: 'error', msg: 'Lỗi parse dữ liệu: ' + err.message });
    }
  };

  const handleDownloadRemote = async (url: string, name: string, metadata?: Partial<Subject>) => {
    setStatus({ type: 'loading', msg: `Đang tải ${name}...` });
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Không thể tải file từ server');
      const text = await response.text();
      await processJsonData(text, metadata);
    } catch (err: any) {
      setStatus({ type: 'error', msg: `Lỗi tải: ${err.message}` });
    }
  };

  const remotePacks = [
    { name: 'Sinh lý', url: 'https://raw.githubusercontent.com/drducqy95/Onthitracnghiem/refs/heads/main/sinhlyhoc.json', description: 'Sinh lý học cơ sở.', examType: 'Thi đầu vào', level: 'Chuyên khoa 1', type: 'Môn cơ sở' },
    { name: 'Giải phẫu', url: 'https://raw.githubusercontent.com/drducqy95/Onthitracnghiem/refs/heads/main/Giaiphaufinal.json', description: 'Giải phẫu học đại cương.', examType: 'Thi đầu vào', level: 'Chuyên khoa 1', type: 'Môn cơ sở' },
    { name: 'Nội khoa', url: 'https://raw.githubusercontent.com/drducqy95/Onthitracnghiem/refs/heads/main/Noi_khoa.json', description: 'Kiến thức nội khoa lâm sàng.', examType: 'Thi đầu vào', level: 'Chuyên khoa 1', type: 'Môn chuyên ngành' },
    { name: 'Ngoại khoa', url: 'https://raw.githubusercontent.com/drducqy95/Onthitracnghiem/refs/heads/main/Ngoaikhoa.json', description: 'Kiến thức ngoại khoa lâm sàng.', examType: 'Thi đầu vào', level: 'Chuyên khoa 1', type: 'Môn chuyên ngành' },
    { name: 'Nhận thức chính trị', url: 'https://raw.githubusercontent.com/drducqy95/Onthitracnghiem/refs/heads/main/nhanthucchinhtri2025.json', description: 'Nhận thức chính trị 2025.', examType: 'Thi hết môn', level: 'Chuyên khoa 1', type: 'Môn chính trị quân sự' }
  ];

  const inputStyle = settings.darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800';

  return (
    <div className={`flex flex-col h-full ${settings.darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className={`p-3 flex items-center border-b sticky top-0 z-30 ${settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <button onClick={() => setScreen('HOME')} className="mr-4"><ChevronLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold">Nhập dữ liệu</h2>
      </div>

      <div className={`flex sticky top-[53px] z-20 ${settings.darkMode ? 'bg-slate-900 border-b border-slate-800' : 'bg-white border-b'}`}>
        {(['Thêm thủ công', 'Thêm môn học', 'Import File', 'Kho dữ liệu'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest ${activeTab === tab ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400'}`}>{tab}</button>
        ))}
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto pb-32">
        {status.type !== 'idle' && (
          <div className={`p-4 rounded-2xl flex items-center space-x-3 ${status.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
            <p className="text-sm font-bold">{status.msg}</p>
          </div>
        )}

        {activeTab === 'Thêm thủ công' ? (
          <div className="space-y-5">
            <select value={qData.subjectId} onChange={(e) => setQData({ ...qData, subjectId: e.target.value })} className={`w-full border rounded-2xl p-4 font-bold ${inputStyle}`}>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <div className="space-y-2">
              <textarea value={qData.content} onChange={(e) => setQData({ ...qData, content: e.target.value })} className={`w-full border rounded-2xl p-4 min-h-[100px] ${inputStyle}`} placeholder="Nội dung câu hỏi"></textarea>
              <div className="flex items-center gap-2">
                <label className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"><ImageIcon className="w-4 h-4" /><input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'image')} /></label>
                {qData.image && <img src={qData.image} className="w-10 h-10 rounded object-cover" />}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <div key={opt} className="space-y-1">
                  <input value={qData[`option${opt}` as keyof typeof qData]} onChange={(e) => setQData({ ...qData, [`option${opt}`]: e.target.value })} className={`w-full border rounded-xl p-3 ${inputStyle}`} placeholder={`Đáp án ${opt}`} />
                  <div className="flex items-center gap-2">
                    <label className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded cursor-pointer text-[10px] flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Ảnh {opt}<input type="file" className="hidden" onChange={(e) => handleImageUpload(e, `option${opt}Image`)} /></label>
                    {qData[`option${opt}Image` as keyof typeof qData] && <img src={qData[`option${opt}Image` as keyof typeof qData] as string} className="w-6 h-6 rounded" />}
                  </div>
                </div>
              ))}
            </div>

            <textarea value={qData.explanation} onChange={(e) => setQData({ ...qData, explanation: e.target.value })} className={`w-full border rounded-2xl p-4 ${inputStyle}`} placeholder="Giải thích"></textarea>

            <div className="flex items-center gap-4">
              <select value={qData.correctAnswer} onChange={(e) => setQData({ ...qData, correctAnswer: e.target.value })} className={`border rounded-xl p-3 w-24 font-bold ${inputStyle}`}>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
              </select>
              <button onClick={handleSaveQuestion} className="flex-1 bg-purple-600 text-white rounded-xl py-3 font-bold">LƯU CÂU HỎI</button>
            </div>
          </div>
        ) : activeTab === 'Thêm môn học' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Tên môn học</label>
              <input value={sData.name} onChange={(e) => setSData({ ...sData, name: e.target.value })} className={`w-full border rounded-2xl p-4 ${inputStyle}`} placeholder="Ví dụ: Giải phẫu, Sinh lý..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Kỳ thi</label>
                <select
                  value={sData.examType}
                  onChange={(e) => setSData({ ...sData, examType: e.target.value })}
                  className={`w-full border rounded-xl p-3 text-sm font-bold ${inputStyle}`}
                >
                  {attributes?.examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Cấp độ</label>
                <select
                  value={sData.level}
                  onChange={(e) => setSData({ ...sData, level: e.target.value })}
                  className={`w-full border rounded-xl p-3 text-sm font-bold ${inputStyle}`}
                >
                  {attributes?.levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Loại môn</label>
              <select
                value={sData.type}
                onChange={(e) => setSData({ ...sData, type: e.target.value })}
                className={`w-full border rounded-xl p-3 text-sm font-bold ${inputStyle}`}
              >
                {attributes?.subjectTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Thuộc môn (Cha)</label>
              <select
                value={sData.parentName} // Sử dụng parentName để lưu ID cha trong logic tạm thời
                onChange={(e) => setSData({ ...sData, parentName: e.target.value })}
                className={`w-full border rounded-xl p-3 text-sm font-bold ${inputStyle}`}
              >
                <option value="">Không (Môn gốc)</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <button onClick={handleSaveSubject} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold mt-4 shadow-lg active:scale-95 transition">TẠO MÔN HỌC</button>
          </div>
        ) : activeTab === 'Import File' ? (
          <div className="space-y-8">
            {/* Section 1: JSON Import */}
            <div className={`p-6 rounded-[32px] border-2 border-dashed ${settings.darkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><FileJson className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">Nhập từ JSON</h4>
                  <p className="text-xs text-slate-400 font-medium">Dành cho file Export từ ứng dụng</p>
                </div>
              </div>
              <label className="block w-full py-4 bg-blue-600 text-white text-center rounded-2xl font-bold cursor-pointer active:scale-95 transition">
                CHỌN FILE JSON
                <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
              </label>
            </div>

            {/* Section 2: Excel Import */}
            <div className={`p-6 rounded-[32px] border-2 border-dashed ${settings.darkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-2xl"><Table className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">Nhập từ Excel</h4>
                  <p className="text-xs text-slate-400 font-medium">Cấu trúc: Q, 1, 2, 3, 4, A, explain</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Chọn môn học nhận câu hỏi</label>
                  <select
                    value={targetSubjectId}
                    onChange={(e) => setTargetSubjectId(e.target.value)}
                    className={`w-full border rounded-2xl p-4 font-bold ${inputStyle}`}
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <label className={`block w-full py-4 ${targetSubjectId ? 'bg-green-600' : 'bg-slate-300'} text-white text-center rounded-2xl font-bold cursor-pointer active:scale-95 transition`}>
                  CHỌN FILE EXCEL (.xlsx)
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    disabled={!targetSubjectId}
                    onChange={handleImportExcel}
                  />
                </label>
              </div>
            </div>

            {/* Hướng dẫn */}
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <h5 className="text-xs font-bold text-orange-700 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" /> LƯU Ý CẤU TRÚC EXCEL
              </h5>
              <p className="text-[10px] text-orange-600 leading-relaxed font-medium">
                File Excel cần có các cột tiêu đề ở dòng đầu tiên: <br />
                <b>Q</b>: Nội dung câu hỏi | <b>1, 2, 3, 4</b>: Các đáp án | <b>A</b>: Đáp án đúng (A/B/C/D) | <b>explain</b>: Giải thích (tùy chọn)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 mb-2">
              <h4 className="text-sm font-bold text-purple-700 mb-1">Link tải bộ đề tùy chỉnh</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://example.com/data.json"
                  className={`flex-1 text-xs p-3 rounded-xl border ${inputStyle}`}
                />
                <button
                  onClick={() => handleDownloadRemote(importUrl, 'Dữ liệu tùy chỉnh')}
                  className="p-3 bg-purple-600 text-white rounded-xl active:scale-95 transition"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {remotePacks.map((pack, idx) => (
                <div key={idx} className={`p-5 rounded-[32px] border ${settings.darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'} shadow-sm`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Globe className="w-6 h-6" /></div>
                    <button
                      onClick={() => handleDownloadRemote(pack.url, pack.name, {
                        examType: pack.examType,
                        level: pack.level,
                        type: pack.type
                      } as any)}
                      className="p-3 bg-slate-100 text-slate-600 rounded-full hover:bg-purple-600 hover:text-white transition-all active:scale-90"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white uppercase text-sm mb-1">{pack.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{pack.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddData;