import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Subject, Question, ExamResult, SubjectConfig, SubjectResult } from './types';

// 1. ĐỊNH NGHĨA CÁC TYPE CẦN THIẾT
export type ScreenName = 
  | 'HOME' | 'QUIZ' | 'RESULT' | 'REVIEW' 
  | 'ADD_DATA' | 'QUESTION_BANK' | 'QUESTION_LIST' | 'SETTINGS' 
  | 'STUDY'; // Thêm màn hình Study

interface UserSettings {
  darkMode: boolean;
  fontSize: number;
  fontFamily: string;
  themeColor: string;
  backgroundImage: string;
}

// Dữ liệu cho màn hình xem danh sách (QuestionList)
export interface ViewingData {
  title: string;
  questions: Question[];
}

// Trạng thái bài thi đang làm (Quiz)
interface CurrentQuizState {
  questions: Question[];
  userAnswers: Record<string, string>;
  timeLeft: number;
  totalTime: number;
  isFinished: boolean;
}

// Trạng thái phiên thi nhiều môn (Session)
export interface SessionState {
  name: string;
  configs: SubjectConfig[];
  currentIndex: number;
  results: SubjectResult[];
  allQuestions: Question[]; // Mảng 1 chiều (Đã sửa từ Question[][])
  allUserAnswers: Record<string, string>; // Lưu tích lũy đáp án
}

// Trạng thái chế độ ôn tập (Study)
export interface StudySessionState {
  title: string;
  questions: Question[];
  currentIndex: number;
  userAnswers: Record<string, string>;
  showExplanation: Record<string, boolean>;
}

// Interface chính của Store
interface AppState {
  // State
  currentScreen: string;
  settings: UserSettings;
  selectedSubject: Subject | null;
  viewingQuestions: ViewingData | null;
  
  currentQuiz: CurrentQuizState | null;
  currentSession: SessionState | null;
  currentStudySession: StudySessionState | null; // Mới thêm
  
  lastResult: ExamResult | null;
  
  // Actions
  setScreen: (screen: string) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  toggleDarkMode: () => void;
  selectSubject: (subject: Subject | null) => void;
  
  // Xem danh sách câu hỏi (Nhận 1 object data)
  startViewingQuestions: (data: ViewingData) => void; 
  
  // Quiz Actions
  startQuiz: (questions: Question[], timeMinutes: number) => void;
  updateAnswer: (questionId: string, answer: string) => void;
  decrementTime: () => void;
  finishQuiz: () => void;
  
  // Session Actions (Sửa tham số firstQuestions thành mảng 1 chiều)
  startSession: (name: string, configs: SubjectConfig[], firstQuestions: Question[]) => void;
  nextSubject: () => void;
  
  // Study Actions
  startStudy: (title: string, questions: Question[]) => void;
  answerStudyQuestion: (questionId: string, answer: string) => void;
  resetStudyQuestion: (questionId: string) => void;
  setStudyIndex: (index: number) => void;

  setLastResult: (result: ExamResult) => void;
}

// 2. KHỞI TẠO STORE
export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // --- Initial State ---
      currentScreen: 'HOME',
      selectedSubject: null,
      viewingQuestions: null,
      currentQuiz: null,
      currentSession: null,
      currentStudySession: null,
      lastResult: null,
      
      settings: {
        darkMode: false,
        fontSize: 16,
        fontFamily: 'Inter',
        themeColor: '#6C5CE7',
        backgroundImage: ''
      },

      // --- Basic Actions ---
      setScreen: (screen) => set({ currentScreen: screen }),
      
      updateSettings: (newSettings) => set((state) => ({ 
        settings: { ...state.settings, ...newSettings } 
      })),
      
      toggleDarkMode: () => set((state) => ({ 
        settings: { ...state.settings, darkMode: !state.settings.darkMode } 
      })),
      
      selectSubject: (subject) => set({ selectedSubject: subject }),

      // --- Viewing Logic ---
      startViewingQuestions: (data) => set({
        viewingQuestions: data,
        currentScreen: 'QUESTION_LIST'
      }),

      // --- Quiz Logic ---
      startQuiz: (questions, timeMinutes) => set({
        currentQuiz: {
          questions,
          userAnswers: {},
          timeLeft: timeMinutes * 60,
          totalTime: timeMinutes * 60,
          isFinished: false
        },
        currentSession: null, 
        currentScreen: 'QUIZ'
      }),

      updateAnswer: (questionId, answer) => set((state) => {
        if (!state.currentQuiz) return state;
        return {
          currentQuiz: {
            ...state.currentQuiz,
            userAnswers: { ...state.currentQuiz.userAnswers, [questionId]: answer }
          }
        };
      }),

      decrementTime: () => set((state) => {
        if (!state.currentQuiz || state.currentQuiz.isFinished) return state;
        const newTime = state.currentQuiz.timeLeft - 1;
        if (newTime <= 0) {
           return { currentQuiz: { ...state.currentQuiz, timeLeft: 0, isFinished: true } };
        }
        return { currentQuiz: { ...state.currentQuiz, timeLeft: newTime } };
      }),

      finishQuiz: () => set((state) => {
        if (!state.currentQuiz) return state;
        return { currentQuiz: { ...state.currentQuiz, isFinished: true } };
      }),

      // --- Session Logic (Thi nhiều môn) ---
      startSession: (name, configs, firstQuestions) => {
        const firstConfig = configs[0];
        set({
          currentSession: { 
            name, 
            configs, 
            currentIndex: 0, 
            results: [], 
            allQuestions: firstQuestions, // Lưu môn đầu tiên (Mảng 1 chiều)
            allUserAnswers: {} 
          },
          currentQuiz: {
            questions: firstQuestions,
            userAnswers: {},
            timeLeft: firstConfig.time * 60,
            totalTime: firstConfig.time * 60,
            isFinished: false
          },
          currentScreen: 'QUIZ'
        });
      },

      nextSubject: () => set((state) => {
        // Logic chuyển môn phức tạp được xử lý tại Quiz.tsx bằng useStore.setState
        // Hàm này giữ lại để đảm bảo interface không bị lỗi
        return state;
      }),

      // --- Study Logic (Ôn tập) ---
      startStudy: (title, questions) => set({
        currentStudySession: {
          title,
          questions,
          currentIndex: 0,
          userAnswers: {},
          showExplanation: {}
        },
        currentScreen: 'STUDY'
      }),

      answerStudyQuestion: (questionId, answer) => set((state) => {
        if (!state.currentStudySession) return state;
        return {
          currentStudySession: {
            ...state.currentStudySession,
            userAnswers: { ...state.currentStudySession.userAnswers, [questionId]: answer },
            showExplanation: { ...state.currentStudySession.showExplanation, [questionId]: true }
          }
        };
      }),

      resetStudyQuestion: (questionId) => set((state) => {
        if (!state.currentStudySession) return state;
        const newAnswers = { ...state.currentStudySession.userAnswers };
        delete newAnswers[questionId];
        const newExplains = { ...state.currentStudySession.showExplanation };
        delete newExplains[questionId];

        return {
          currentStudySession: {
            ...state.currentStudySession,
            userAnswers: newAnswers,
            showExplanation: newExplains
          }
        };
      }),

      setStudyIndex: (index) => set((state) => {
        if (!state.currentStudySession) return state;
        return {
          currentStudySession: { ...state.currentStudySession, currentIndex: index }
        };
      }),

      // --- Result Logic ---
      setLastResult: (result) => set({ 
        lastResult: result, 
        currentScreen: 'RESULT' 
      }),
    }),
    {
      name: 'medquiz-storage',
      partialize: (state) => ({ settings: state.settings }), // Chỉ lưu settings vào LocalStorage
    }
  )
);