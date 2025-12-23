
import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { db } from './db';
import Home from './screens/Home';
import MockExam from './screens/MockExam';
import Study from './screens/Study';
import QuestionBank from './screens/QuestionBank';
import AddData from './screens/AddData';
import Settings from './screens/Settings';
import Quiz from './screens/Quiz';
import Result from './screens/Result';
import Review from './screens/Review';
import History from './screens/History';
import QuestionList from './screens/QuestionList';
import ManageExams from './screens/ManageExams';
import ManageAttributes from './screens/ManageAttributes';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [isDbReady, setIsDbReady] = useState(false);
  const { currentScreen, settings } = useStore();

  useEffect(() => {
    const setup = async () => {
      try {
        await db.init();
        setIsDbReady(true);
      } catch (err) {
        console.error("Database initialization failed", err);
      }
    };
    setup();
  }, []);

  if (!isDbReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
        <h1 className="text-xl font-bold text-purple-800">Khởi động hệ thống...</h1>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'HOME': return <Home />;
      case 'MOCK_EXAM': return <MockExam />;
      case 'STUDY': return <Study />;
      case 'QUESTION_BANK': return <QuestionBank />;
      case 'ADD_DATA': return <AddData />;
      case 'SETTINGS': return <Settings />;
      case 'QUIZ': return <Quiz />;
      case 'RESULT': return <Result />;
      case 'REVIEW': return <Review />;
      case 'HISTORY': return <History />;
      case 'QUESTION_LIST': return <QuestionList />;
      case 'MANAGE_EXAMS': return <ManageExams />;
      case 'MANAGE_ATTRIBUTES': return <ManageAttributes />;
      default: return <Home />;
    }
  };

  // The custom background image from settings
  const backgroundImage = settings.backgroundImage;

  return (
    <div
      className={`min-h-screen flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden transition-all duration-300 ${settings.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}
      style={{
        fontFamily: `"${settings.fontFamily}", sans-serif`,
        fontSize: `${settings.fontSize}rem`
      }}
    >
      {['HOME', 'MOCK_EXAM', 'STUDY', 'QUESTION_BANK', 'HISTORY', 'ADD_DATA', 'SETTINGS', 'MANAGE_EXAMS', 'MANAGE_ATTRIBUTES'].includes(currentScreen) && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className={`absolute inset-0 backdrop-blur-[2px] ${settings.darkMode ? 'bg-black/60' : 'bg-white/20'}`}></div>
        </div>
      )}

      <main className="flex-1 z-10 overflow-y-auto overflow-x-hidden hide-scrollbar relative">
        {renderScreen()}
      </main>
    </div>
  );
};

export default App;
