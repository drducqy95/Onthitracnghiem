
import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import { db } from '../db';
import { 
  ChevronLeft, Sun, Database, Download, 
  ClipboardList, Sliders, Type, Palette, 
  Moon, Trash2, AlertTriangle, CheckCircle, Image as ImageIcon,
  Upload, Check, Info
} from 'lucide-react';

const Settings: React.FC = () => {
  const { setScreen, settings, updateSettings } = useStore();
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fontFamilies = [
    'Inter', 'Roboto', 'Be Vietnam Pro', 'Montserrat', 'Open Sans', 
    'Playfair Display', 'Lora', 'Merriweather', 'Oswald', 'Ubuntu', 'Times New Roman', 'Arial', 'Georgia'
  ];

  const themeColors = [
    '#6C5CE7', '#3B82F6', '#10B981', '#F59E0B', 
    '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6'
  ];

  const bgPresets = [
    { name: 'Medical', url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1974&auto=format&fit=crop' },
    { name: 'Dark', url: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?q=80&w=2072&auto=format&fit=crop' },
    { name: 'Lab', url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=2070&auto=format&fit=crop' },
  ];

  const handleClearData = async () => {
    try {
      await db.clearAllData();
      localStorage.removeItem('medquiz_settings');
      setStatus('Đã xóa dữ liệu.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      setStatus('Lỗi xóa');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateSettings({ backgroundImage: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const cardClass = settings.darkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/95 border-slate-100';
  const textClass = settings.darkMode ? 'text-slate-200' : 'text-slate-700';

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <button onClick={() => setScreen('HOME')} className="mr-3 p-1 rounded-full hover:bg-black/10 transition">
            <ChevronLeft className={`w-5 h-5 ${settings.darkMode ? 'text-slate-100' : 'text-slate-800'}`} />
          </button>
          <h2 className={`text-lg font-bold ${settings.darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Cài đặt</h2>
        </div>
        {status && (
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center animate-pulse">
            <CheckCircle className="w-3 h-3 mr-1" /> {status}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-20 space-y-3 hide-scrollbar">
        
        {/* Top Actions Grid: Management & Data */}
        <div className="grid grid-cols-2 gap-2">
           {/* Manage Exams */}
           <button 
            onClick={() => setScreen('MANAGE_EXAMS')}
            className={`${cardClass} p-3 rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-sm border active:scale-95 transition`}
           >
              <ClipboardList className="w-5 h-5 text-purple-500" />
              <span className={`text-[10px] font-bold uppercase ${textClass}`}>Q.Lý Kỳ thi</span>
           </button>

           {/* Manage Attributes */}
           <button 
            onClick={() => setScreen('MANAGE_ATTRIBUTES')}
            className={`${cardClass} p-3 rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-sm border active:scale-95 transition`}
           >
              <Sliders className="w-5 h-5 text-blue-500" />
              <span className={`text-[10px] font-bold uppercase ${textClass}`}>Thuộc tính</span>
           </button>

           {/* Import Data */}
           <button 
            onClick={() => setScreen('ADD_DATA')}
            className="bg-teal-600 p-3 rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-sm text-white active:scale-95 transition"
           >
             <Download className="w-5 h-5" />
             <span className="text-[10px] font-bold uppercase">Nạp dữ liệu</span>
           </button>

           {/* Clear Data */}
           <button 
            onClick={() => setShowConfirmClear(true)}
            className="bg-red-50 border border-red-100 p-3 rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-sm text-red-600 active:scale-95 transition"
           >
             <Trash2 className="w-5 h-5" />
             <span className="text-[10px] font-bold uppercase">Xóa dữ liệu</span>
           </button>
        </div>

        {/* Delete Confirmation Overlay */}
        {showConfirmClear && (
          <div className="bg-red-50 p-3 rounded-2xl border border-red-200 animate-in zoom-in duration-200">
            <div className="flex items-center space-x-2 text-red-700 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Xác nhận xóa hết?</span>
            </div>
            <div className="flex space-x-2">
                <button onClick={() => setShowConfirmClear(false)} className="flex-1 py-2 bg-white text-slate-500 font-bold rounded-xl text-[10px]">Hủy</button>
                <button onClick={handleClearData} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-xl text-[10px]">Xóa Ngay</button>
            </div>
          </div>
        )}

        {/* Appearance Card */}
        <div className={`${cardClass} rounded-[24px] p-4 shadow-sm border space-y-4`}>
          <div className="flex items-center space-x-2 text-purple-500 mb-1">
             <Palette className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Giao diện</span>
          </div>

          {/* Row 1: Dark Mode & Font Size */}
          <div className="flex items-center space-x-4">
             {/* Dark Mode Toggle */}
             <div className="flex items-center justify-between bg-slate-100/50 dark:bg-slate-700/50 p-2 rounded-xl flex-1">
                {settings.darkMode ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <button 
                  onClick={() => updateSettings({ darkMode: !settings.darkMode })} 
                  className={`w-10 h-6 rounded-full transition-colors relative ${settings.darkMode ? 'bg-purple-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.darkMode ? 'translate-x-5' : 'translate-x-1'}`}></div>
                </button>
             </div>

             {/* Font Size Slider */}
             <div className="flex flex-col justify-center flex-[1.5]">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                   <span>Cỡ chữ</span>
                   <span>{Math.round(settings.fontSize * 100)}%</span>
                </div>
                <input 
                  type="range" min="0.8" max="1.3" step="0.05" 
                  value={settings.fontSize} 
                  onChange={(e) => updateSettings({ fontSize: parseFloat(e.target.value) })} 
                  className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-full appearance-none" 
                />
             </div>
          </div>

          {/* Row 2: Font Family */}
          <div>
            <select 
              value={settings.fontFamily} 
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              className={`w-full p-2 text-xs rounded-xl border ${settings.darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} font-bold outline-none`}
            >
              {fontFamilies.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>Font: {font}</option>
              ))}
            </select>
          </div>

          {/* Row 3: Colors */}
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Màu chủ đạo</span>
            <div className="flex justify-between gap-2">
               {themeColors.map(color => (
                 <button 
                  key={color}
                  onClick={() => updateSettings({ themeColor: color })}
                  className={`w-full h-6 rounded-lg transition-all ${settings.themeColor === color ? 'ring-2 ring-offset-1 ring-purple-400 scale-110' : 'opacity-60'}`}
                  style={{ backgroundColor: color }}
                 />
               ))}
            </div>
          </div>

          {/* Row 4: Backgrounds */}
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Hình nền</span>
            <div className="grid grid-cols-5 gap-2">
               {bgPresets.map((preset, idx) => (
                 <button 
                   key={idx}
                   onClick={() => updateSettings({ backgroundImage: preset.url })}
                   className={`relative h-12 rounded-lg overflow-hidden border transition-all ${settings.backgroundImage === preset.url ? 'border-purple-500 ring-2 ring-purple-200' : 'border-transparent opacity-80'}`}
                 >
                    <img src={preset.url} alt="bg" className="w-full h-full object-cover" />
                 </button>
               ))}
               
               {/* Upload Button */}
               <div className="relative h-12">
                   <input 
                     type="file" accept="image/*" className="hidden" 
                     ref={fileInputRef} onChange={handleFileUpload} 
                   />
                   <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full h-full flex items-center justify-center border-2 border-dashed rounded-lg transition ${settings.darkMode ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-400'}`}
                   >
                      <Upload className="w-4 h-4" />
                   </button>
               </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center pb-2">
           <p className="text-[10px] text-slate-400 font-medium">
             Ôn tập trắc nghiệm V1.0 • <span className="text-purple-500">Dr.DucQy95</span>
           </p>
        </div>

      </div>
    </div>
  );
};

export default Settings;
