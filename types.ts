
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
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswers: string;
  explanation?: string;
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
  subjectName: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean; // >= 70%
}

export interface ExamResult {
  id: string;
  name: string; // Subject name or Exam template name
  date: number;
  isMultiSubject: boolean;
  totalPassed: boolean; 
  subjectResults: SubjectResult[];
  // For single quiz retry compatibility:
  questions: Question[];
  userAnswers: Record<string, string>;
  // Metadata for retry
  configRef?: any; 
}

export type Screen = 'HOME' | 'MOCK_EXAM' | 'STUDY' | 'QUESTION_BANK' | 'HISTORY' | 'ADD_DATA' | 'SETTINGS' | 'QUIZ' | 'RESULT' | 'REVIEW' | 'QUESTION_LIST' | 'MANAGE_EXAMS' | 'MANAGE_ATTRIBUTES';
