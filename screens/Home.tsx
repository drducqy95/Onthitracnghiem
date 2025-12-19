
import React from 'react';
import { useStore } from '../store';
import { Timer, BookOpen, Database, History, PlusCircle, Settings } from 'lucide-react';

const Home: React.FC = () => {
  const { setScreen } = useStore();

  const menuItems = [
    { id: 'MOCK_EXAM', label: 'Thi Thử', icon: Timer },
    { id: 'STUDY', label: 'Ôn Tập', icon: BookOpen },
    { id: 'QUESTION_BANK', label: 'Ngân Hàng Câu Hỏi', icon: Database },
    { id: 'HISTORY', label: 'Lịch Sử Thi', icon: History },
    { id: 'ADD_DATA', label: 'Thêm Dữ Liệu', icon: PlusCircle },
    { id: 'SETTINGS', label: 'Cài Đặt', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 space-y-4">
      <div className="absolute top-10 left-0 right-0 text-center">
        <h1 className="text-3xl font-medium text-slate-800 tracking-wide">Ôn Thi Trắc Nghiệm</h1>
      </div>

      <div className="w-full flex flex-col space-y-3 pt-20">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id as any)}
            className="w-full bg-[#6C5CE7] hover:bg-[#5b4bc4] text-white py-4 px-8 rounded-full shadow-lg flex items-center justify-center space-x-3 transition-all active:scale-95"
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xl font-medium tracking-wide">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Home;
