
export enum QuestionStatus {
  UNLEARNED = 0,
  LEARNED = 1,
  FREQUENT_MISTAKE = 2
}

export interface Subject {
  id: string;
  name: string;
  parentId?: string;
  examType?: string;
  level?: string;
  type?: string;
  totalQuestions?: number;
  learnedCount?: number;
  needReviewCount?: number;
}

export interface Question {
  id: string;
  subjectId: string;
  content: string;
  image?: string; // Hình ảnh nội dung câu hỏi
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionImages?: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
  };
  correctAnswers: string;
  explanation?: string;
  explanationImage?: string; // Hình ảnh phần giải thích
  status: QuestionStatus;
}

export interface SubjectConfig {
  subjectId: string;
  subjectName: string;
  count: number;
  time: number;
}

export interface ExamConfig {
  id: string;
  name: string;
  examType: string;
  level: string;
  subjects: SubjectConfig[];
}

export interface AppAttributes {
  examTypes: string[];
  levels: string[];
  subjectTypes: string[];
}

export interface SubjectResult {
  subjectId: string; // Thêm subjectId để mapping
  subjectName: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean; // >= 70%
}

export interface ExamResult {
  id: string;
  name: string;
  date: number;
  isMultiSubject: boolean;
  totalPassed: boolean;
  subjectResults: SubjectResult[];
  questions: Question[]; // Lưu toàn bộ câu hỏi của lần thi này
  userAnswers: Record<string, string>;
  originalConfig?: { // Lưu cấu hình để thi lại đúng môn/số câu
    name: string;
    configs: SubjectConfig[];
    totalTime?: number; // Lưu tổng thời gian (cho thi đơn lẻ)
  };
  isRetryMode?: boolean;
}

export type Screen = 'HOME' | 'MOCK_EXAM' | 'STUDY' | 'QUESTION_BANK' | 'HISTORY' | 'ADD_DATA' | 'SETTINGS' | 'QUIZ' | 'RESULT' | 'REVIEW' | 'QUESTION_LIST' | 'MANAGE_EXAMS' | 'MANAGE_ATTRIBUTES';
