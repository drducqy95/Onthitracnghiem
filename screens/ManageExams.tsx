
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Subject, ExamConfig, AppAttributes, SubjectConfig } from '../types';
import { useStore } from '../store';
import { ChevronLeft, Plus, X, Trash2, Save } from 'lucide-react';

const ManageExams: React.FC = () => {
  const { setScreen } = useStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [configs, setConfigs] = useState<ExamConfig[]>([]);
  const [attributes, setAttributes] = useState<AppAttributes | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [form, setForm] = useState<ExamConfig>({
    id: '',
    name: '',
    examType: '',
    level: '',
    subjects: []
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setSubjects(await db.getSubjects());
    setConfigs(await db.getExamConfigs());
    const attr = await db.getAttributes();
    setAttributes(attr);
    setForm(f => ({ ...f, examType: attr.examTypes[0], level: attr.levels[0] }));
  };

  const addSubjectToExam = (s: Subject) => {
    if (form.subjects.find(sc => sc.subjectId === s.id)) return;
    setForm({
      ...form,
      subjects: [...form.subjects, { subjectId: s.id, subjectName: s.name, count: 45, time: 45 }]
    });
  };

  const removeSubject = (id: string) => {
    setForm({ ...form, subjects: form.subjects.filter(s => s.subjectId !== id) });
  };

  const handleSave = async () => {
    if (!form.name || form.subjects.length === 0) return alert("Vui lòng điền đủ thông tin!");
    const finalForm = { ...form, id: form.id || 'ex-' + Date.now() };
    await db.saveExamConfig(finalForm);
    setIsAdding(false);
    setForm({ id: '', name: '', examType: attributes!.examTypes[0], level: attributes!.levels[0], subjects: [] });
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa kỳ thi này?")) {
      await db.deleteExamConfig(id);
      load();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 flex items-center bg-white border-b border-slate-200">
        <button onClick={() => setScreen('SETTINGS')} className="mr-4">
          <ChevronLeft className="w-6 h-6 text-slate-800" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">Quản lý Kỳ thi</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isAdding ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4 border border-purple-100">
             <div className="relative">
               <label className="text-[10px] font-black text-slate-400 uppercase">Tên kỳ thi</label>
               <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border-b border-slate-200 py-2 font-bold outline-none" placeholder="Nhập tên..." />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <select value={form.examType} onChange={e => setForm({...form, examType: e.target.value})} className="bg-slate-50 p-3 rounded-xl text-xs font-bold">
                  {attributes?.examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="bg-slate-50 p-3 rounded-xl text-xs font-bold">
                  {attributes?.levels.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Danh sách môn thi</label>
                {form.subjects.map(sc => (
                  <div key={sc.subjectId} className="p-3 bg-slate-50 rounded-2xl flex flex-col space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">{sc.subjectName}</span>
                        <button onClick={() => removeSubject(sc.subjectId)} className="text-red-400"><X className="w-4 h-4" /></button>
                     </div>
                     <div className="flex space-x-2">
                        <input type="number" placeholder="Số câu" value={sc.count} onChange={e => {
                          const list = [...form.subjects];
                          list.find(item => item.subjectId === sc.subjectId)!.count = parseInt(e.target.value) || 0;
                          setForm({...form, subjects: list});
                        }} className="flex-1 bg-white p-2 rounded-lg text-xs font-bold border border-slate-100" />
                        <input type="number" placeholder="Phút" value={sc.time} onChange={e => {
                          const list = [...form.subjects];
                          list.find(item => item.subjectId === sc.subjectId)!.time = parseInt(e.target.value) || 0;
                          setForm({...form, subjects: list});
                        }} className="flex-1 bg-white p-2 rounded-lg text-xs font-bold border border-slate-100" />
                     </div>
                  </div>
                ))}
                
                <div className="pt-2">
                   <select onChange={e => {
                     const s = subjects.find(sub => sub.id === e.target.value);
                     if (s) addSubjectToExam(s);
                   }} className="w-full bg-purple-50 p-3 rounded-xl text-xs font-bold text-purple-600 border border-purple-100 outline-none">
                     <option value="">+ Thêm môn học</option>
                     {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
             </div>

             <div className="flex space-x-3 pt-4">
                <button onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl">Hủy</button>
                <button onClick={handleSave} className="flex-1 py-4 bg-purple-600 text-white font-bold rounded-2xl shadow-lg">Lưu</button>
             </div>
          </div>
        ) : (
          <>
            <button onClick={() => setIsAdding(true)} className="w-full bg-purple-600 text-white py-4 rounded-3xl font-bold shadow-lg flex items-center justify-center space-x-2">
              <Plus className="w-5 h-5" /> <span>Tạo kỳ thi mới</span>
            </button>

            {configs.map(c => (
              <div key={c.id} className="bg-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 uppercase">{c.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold">{c.subjects.length} môn • {c.examType}</p>
                </div>
                <div className="flex space-x-2">
                   <button onClick={() => { setForm(c); setIsAdding(true); }} className="p-2 bg-slate-50 text-slate-400 rounded-full"><Save className="w-4 h-4" /></button>
                   <button onClick={() => handleDelete(c.id)} className="p-2 bg-red-50 text-red-400 rounded-full"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ManageExams;
