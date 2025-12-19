
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { AppAttributes } from '../types';
import { useStore } from '../store';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';

const ManageAttributes: React.FC = () => {
  const { setScreen } = useStore();
  const [attr, setAttr] = useState<AppAttributes | null>(null);

  useEffect(() => {
    db.getAttributes().then(setAttr);
  }, []);

  const handleAdd = (key: keyof AppAttributes) => {
    const val = prompt(`Nhập nội dung mới cho ${key}:`);
    if (val && attr) {
      const next = { ...attr, [key]: [...attr[key], val] };
      setAttr(next);
      db.saveAttributes(next);
    }
  };

  const handleRemove = (key: keyof AppAttributes, index: number) => {
    if (attr && confirm("Xóa tùy chọn này?")) {
      const nextList = [...attr[key]];
      nextList.splice(index, 1);
      const next = { ...attr, [key]: nextList };
      setAttr(next);
      db.saveAttributes(next);
    }
  };

  if (!attr) return null;

  const sections: { key: keyof AppAttributes, label: string }[] = [
    { key: 'examTypes', label: 'Tùy chọn Kỳ thi' },
    { key: 'levels', label: 'Tùy chọn Cấp độ' },
    { key: 'subjectTypes', label: 'Tùy chọn Loại môn' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 flex items-center bg-white border-b border-slate-200">
        <button onClick={() => setScreen('SETTINGS')} className="mr-4">
          <ChevronLeft className="w-6 h-6 text-slate-800" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">Cài đặt Thuộc tính</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-20">
        {sections.map(sec => (
          <div key={sec.key} className="space-y-3">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{sec.label}</h3>
                <button onClick={() => handleAdd(sec.key)} className="text-purple-600"><Plus className="w-5 h-5" /></button>
             </div>
             <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                {attr[sec.key].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0">
                     <span className="text-sm font-bold text-slate-700">{item}</span>
                     <button onClick={() => handleRemove(sec.key, idx)} className="text-red-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageAttributes;
