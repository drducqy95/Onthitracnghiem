import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Subject, AppAttributes, Question } from '../types';
import { useStore } from '../store';
import {
  ChevronLeft, Search, Filter, Edit2, X, Check,
  AlertCircle, Loader2, Share2, Trash2, Eye, BookOpen
} from 'lucide-react';

const QuestionBank: React.FC = () => {
  // Lấy các action từ store (bao gồm cả startStudy mới thêm)
  const { setScreen, startViewingQuestions, startStudy, settings } = useStore();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attributes, setAttributes] = useState<AppAttributes | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Trạng thái loading/error
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

  // Các state cho bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExamType, setFilterExamType] = useState('Tất cả');
  const [filterLevel, setFilterLevel] = useState('Tất cả');
  const [showOnlyRoot, setShowOnlyRoot] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const list = await db.getSubjects();
    const attr = await db.getAttributes();
    setSubjects(list);
    setAttributes(attr);
  };

  // --- 1. LOGIC XEM DANH SÁCH CÂU HỎI (FIX LỖI TYPE) ---
  const handleViewQuestions = async (sub: Subject) => {
    setStatus({ type: 'loading', msg: `Đang tải dữ liệu môn ${sub.name}...` });
    try {
      // Lấy câu hỏi đệ quy (Mẹ + Con)
      const questions = await db.getQuestionsBySubjectRecursive(sub.id);

      if (!questions || questions.length === 0) {
        setStatus({ type: 'error', msg: 'Bộ đề này chưa có câu hỏi nào!' });
        setTimeout(() => setStatus({ type: 'idle', msg: '' }), 2000);
        return;
      }

      // Gọi store đúng chuẩn object ViewingData
      startViewingQuestions({
        title: sub.name,
        questions: questions
      });

      // (Store sẽ tự chuyển màn hình sang QUESTION_LIST)

    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Lỗi khi tải câu hỏi' });
    }
  };

  // --- 2. LOGIC BẮT ĐẦU ÔN TẬP (MỚI) ---
  const handleStartStudy = async (sub: Subject) => {
    setStatus({ type: 'loading', msg: `Chuẩn bị chế độ ôn tập...` });
    try {
      const questions = await db.getQuestionsBySubjectRecursive(sub.id);

      if (!questions || questions.length === 0) {
        setStatus({ type: 'error', msg: 'Không thể ôn tập vì chưa có câu hỏi!' });
        setTimeout(() => setStatus({ type: 'idle', msg: '' }), 2000);
        return;
      }

      // Gọi store để vào màn hình Study
      startStudy(`Ôn tập: ${sub.name}`, questions);

    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Lỗi khởi tạo ôn tập' });
    }
  };

  // --- 3. LOGIC XÓA BỘ ĐỀ (ĐỆ QUY) ---
  const handleDeleteSubject = async () => {
    if (!editingSubject) return;

    const confirmDelete = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn xóa bộ đề "${editingSubject.name}"?\n\nHành động này sẽ xóa toàn bộ câu hỏi và các bộ đề con bên trong. Không thể hoàn tác!`
    );

    if (!confirmDelete) return;

    setStatus({ type: 'loading', msg: 'Đang xóa dữ liệu...' });

    try {
      await db.deleteSubject(editingSubject.id);
      await loadSubjects();
      setEditingSubject(null);
      setStatus({ type: 'success', msg: 'Đã xóa thành công!' });
      setTimeout(() => setStatus({ type: 'idle', msg: '' }), 2000);
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', msg: `Lỗi: ${err.message}` });
    }
  };

  // --- 4. LOGIC CẬP NHẬT THÔNG TIN ---
  const handleUpdateSubject = async () => {
    if (!editingSubject) return;
    setStatus({ type: 'loading', msg: 'Đang lưu thay đổi...' });

    try {
      if (editingSubject.parentId === editingSubject.id) {
        setStatus({ type: 'error', msg: 'Môn học không thể là cha của chính nó' });
        return;
      }

      await db.saveSubjects([editingSubject]);
      await loadSubjects();
      setEditingSubject(null);
      setStatus({ type: 'success', msg: 'Cập nhật thành công!' });
      setTimeout(() => setStatus({ type: 'idle', msg: '' }), 2000);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Lỗi khi lưu thông tin' });
    }
  };

  // --- 5. LOGIC XUẤT JSON ---
  const handleExportJson = async () => {
    setStatus({ type: 'loading', msg: 'Đang xuất dữ liệu...' });
    try {
      const allQuestions = await db.getAllQuestions();

      // Helper tạo cây thư mục
      const buildHierarchy = (parentId?: string) => {
        const children = subjects.filter(s => s.parentId === parentId);
        const result: Record<string, any> = {};

        children.forEach(sub => {
          const subQuestions = allQuestions.filter(q => q.subjectId === sub.id);
          const subObj: Record<string, any> = {};

          // Map câu hỏi
          subQuestions.forEach((q, idx) => {
            subObj[(idx + 1).toString()] = {
              "Q": q.content,
              "1": q.optionA, "2": q.optionB, "3": q.optionC, "4": q.optionD,
              "A": q.correctAnswers,
              "explain": q.explanation
            };
          });

          // Đệ quy con
          const grandChildren = buildHierarchy(sub.id);
          if (Object.keys(grandChildren).length > 0) {
            Object.assign(subObj, grandChildren);
          }

          result[sub.name] = subObj;
        });
        return result;
      };

      const hierarchy = buildHierarchy(undefined);

      const blob = new Blob([JSON.stringify(hierarchy, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MedQuiz_Export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus({ type: 'success', msg: 'Xuất file JSON thành công!' });
      setTimeout(() => setStatus({ type: 'idle', msg: '' }), 3000);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Lỗi khi xuất dữ liệu' });
    }
  };

  // Filtering Logic
  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = filterExamType === 'Tất cả' || s.examType === filterExamType;
    const matchesLevel = filterLevel === 'Tất cả' || s.level === filterLevel;
    const matchesRoot = showOnlyRoot ? !s.parentId : true;

    return matchesSearch && matchesExam && matchesLevel && matchesRoot;
  });

  return (
    <div className={`flex flex-col h-[100dvh] ${settings.darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-20 ${settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center">
          <button
            onClick={() => setScreen('HOME')}
            className={`p-2 rounded-full mr-2 transition ${settings.darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
          >
            <ChevronLeft className={`w-6 h-6 ${settings.darkMode ? 'text-white' : 'text-slate-600'}`} />
          </button>
          <h2 className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-slate-800'}`}>Ngân hàng câu hỏi</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExportJson}
            className={`p-2 rounded-full transition ${settings.darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            title="Xuất dữ liệu ra JSON"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setScreen('ADD_DATA')}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-full shadow-lg active:scale-95 transition"
          >
            + Thêm mới
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {status.type === 'loading' && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <span className="font-bold text-slate-700">{status.msg}</span>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className={`p-4 border-b space-y-4 ${settings.darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm môn học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 border-none rounded-2xl font-medium outline-none focus:ring-2 focus:ring-purple-400 ${settings.darkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 text-slate-900 placeholder-slate-400'}`}
          />
        </div>

        <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-2">
          <button
            onClick={() => setShowOnlyRoot(!showOnlyRoot)}
            className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition ${showOnlyRoot
                ? (settings.darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-800 text-white border-slate-800')
                : (settings.darkMode ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-200')
              }`}
          >
            <Filter className="w-3 h-3 mr-1" /> {showOnlyRoot ? 'Chỉ hiện môn gốc' : 'Hiện tất cả'}
          </button>

          <select
            value={filterExamType} onChange={(e) => setFilterExamType(e.target.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border outline-none focus:border-purple-500 ${settings.darkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-800 border-slate-200'}`}
          >
            <option value="Tất cả">Kỳ thi: Tất cả</option>
            {attributes?.examTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border outline-none focus:border-purple-500 ${settings.darkMode ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-800 border-slate-200'}`}
          >
            <option value="Tất cả">Cấp độ: Tất cả</option>
            {attributes?.levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Subjects List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {filteredSubjects.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p>Không tìm thấy môn học nào</p>
          </div>
        ) : (
          filteredSubjects.map(sub => {
            const childCount = subjects.filter(s => s.parentId === sub.id).length;
            return (
              <div
                key={sub.id}
                className={`p-4 rounded-3xl border shadow-sm flex items-center justify-between group cursor-pointer transition-all ${settings.darkMode
                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    : 'bg-white border-slate-100 hover:shadow-md'
                  }`}
                onClick={() => handleViewQuestions(sub)} // Mặc định click vào là xem câu hỏi
              >
                <div className="flex-1">
                  <h3 className={`text-base font-bold mb-1 ${settings.darkMode ? 'text-white' : 'text-slate-800'}`}>{sub.name}</h3>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>{sub.totalQuestions || 0} câu hỏi</span>
                    {childCount > 0 && <span className="text-purple-500">• {childCount} môn con</span>}
                    {sub.parentId && <span className="text-orange-500">• Môn con</span>}
                  </div>
                </div>

                {/* Action Buttons Group */}
                <div className="flex items-center space-x-2">
                  {/* Nút Ôn tập */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartStudy(sub); }}
                    className={`p-3 rounded-2xl transition ${settings.darkMode ? 'bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    title="Ôn tập (Hiện đáp án ngay)"
                  >
                    <BookOpen className="w-5 h-5" />
                  </button>

                  {/* Nút Chỉnh sửa */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingSubject(sub); }}
                    className={`p-3 rounded-2xl transition ${settings.darkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    title="Chỉnh sửa / Xóa"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Chỉnh sửa bộ đề</h3>
              <button onClick={() => setEditingSubject(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {status.type !== 'idle' && status.type !== 'loading' && (
              <div className={`mb-4 p-3 rounded-2xl flex items-center space-x-2 text-sm font-bold ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                }`}>
                {status.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                <span>{status.msg}</span>
              </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Tên bộ đề</label>
                <input
                  type="text"
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Kỳ thi</label>
                  <select
                    value={editingSubject.examType}
                    onChange={(e) => setEditingSubject({ ...editingSubject, examType: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 text-sm font-bold"
                  >
                    {attributes?.examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Cấp độ</label>
                  <select
                    value={editingSubject.level}
                    onChange={(e) => setEditingSubject({ ...editingSubject, level: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 text-sm font-bold"
                  >
                    {attributes?.levels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Loại môn</label>
                <select
                  value={editingSubject.type}
                  onChange={(e) => setEditingSubject({ ...editingSubject, type: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 text-sm font-bold"
                >
                  {attributes?.subjectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-1 block">Thuộc môn (Cha)</label>
                <select
                  value={editingSubject.parentId || ""}
                  onChange={(e) => setEditingSubject({ ...editingSubject, parentId: e.target.value || undefined })}
                  className="w-full border border-slate-300 rounded-xl p-3 pt-4 outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50 text-sm font-medium"
                >
                  <option value="">Không (Bộ đề gốc)</option>
                  {subjects
                    .filter(s => s.id !== editingSubject.id)
                    .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                  }
                </select>
              </div>
            </div>

            {/* Footer Button Group */}
            <div className="flex items-center justify-between pt-6 mt-2 border-t border-slate-100">
              {/* Nút Xóa (Trái) */}
              <button
                onClick={handleDeleteSubject}
                disabled={status.type === 'loading'}
                className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 active:scale-95 transition-transform"
                title="Xóa bộ đề này"
              >
                <Trash2 className="w-6 h-6" />
              </button>

              {/* Nhóm Hủy/Lưu (Phải) */}
              <div className="flex gap-3 flex-1 justify-end ml-4">
                <button
                  className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl"
                  onClick={() => { setEditingSubject(null); setStatus({ type: 'idle', msg: '' }); }}
                  disabled={status.type === 'loading'}
                >
                  Hủy
                </button>
                <button
                  className="px-8 py-4 bg-[#6C5CE7] text-white font-bold rounded-2xl shadow-lg shadow-purple-200 active:scale-95 transition-transform disabled:opacity-50"
                  onClick={handleUpdateSubject}
                  disabled={status.type === 'loading'}
                >
                  {status.type === 'loading' ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;