import { Subject, Question, ExamResult, ExamConfig, AppAttributes } from './types';

const DB_NAME = 'MedQuizDB_V2';
const DB_VERSION = 2;

export class Database {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('subjects')) {
          db.createObjectStore('subjects', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('questions')) {
          const qStore = db.createObjectStore('questions', { keyPath: 'id' });
          qStore.createIndex('subjectId', 'subjectId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('results')) {
          db.createObjectStore('results', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('examConfigs')) {
          db.createObjectStore('examConfigs', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('attributes')) {
          db.createObjectStore('attributes', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Attributes
  async getAttributes(): Promise<AppAttributes> {
    const defaultAttr: AppAttributes = {
      examTypes: ['Thi đầu vào', 'Thi hết môn', 'Thi đầu ra'],
      levels: ['Đại học', 'Cao học', 'Chuyên khoa 1', 'Chuyên khoa 2'],
      subjectTypes: ['Môn cơ sở', 'Môn chuyên ngành', 'Môn chính trị quân sự', 'Môn ngoại ngữ', 'Khác']
    };
    try {
      const res = await this.performTransaction<any>('attributes', 'readonly', (store) => store.get('global'));
      return res || defaultAttr;
    } catch { 
      return defaultAttr; 
    }
  }

  async saveAttributes(attr: AppAttributes): Promise<void> {
    return this.performTransaction('attributes', 'readwrite', (store) => {
      store.put({ ...attr, id: 'global' });
    });
  }

  // Exam Presets
  async getExamConfigs(): Promise<ExamConfig[]> {
    return this.performTransaction('examConfigs', 'readonly', (store) => store.getAll());
  }
  
  async saveExamConfig(config: ExamConfig): Promise<void> {
    return this.performTransaction('examConfigs', 'readwrite', (store) => {
      store.put(config);
    });
  }

  async deleteExamConfig(id: string): Promise<void> {
    return this.performTransaction('examConfigs', 'readwrite', (store) => {
      store.delete(id);
    });
  }

  // Subject Management
  async getSubjects(): Promise<Subject[]> {
    return this.performTransaction('subjects', 'readonly', (store) => store.getAll());
  }

  async saveSubjects(subjects: Subject[]): Promise<void> {
    return this.performTransaction('subjects', 'readwrite', (store) => {
      subjects.forEach(s => store.put(s));
    });
  }

  async findSubjectByName(name: string): Promise<Subject | null> {
    const subjects = await this.getSubjects();
    return subjects.find(s => s.name.toLowerCase() === name.toLowerCase()) || null;
  }

  // --- HÀM XÓA BỘ ĐỀ (Đã sửa lại đúng chuẩn Native IDB) ---
  async deleteSubject(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    // 1. Đệ quy: Xóa các môn con trước
    const allSubjects = await this.getSubjects();
    const children = allSubjects.filter(s => s.parentId === id);
    for (const child of children) {
        await this.deleteSubject(child.id);
    }

    // 2. Transaction: Xóa câu hỏi và môn học hiện tại
    return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['questions', 'subjects'], 'readwrite');
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);

        // a. Xóa câu hỏi
        const qStore = transaction.objectStore('questions');
        const index = qStore.index('subjectId');
        // Tạo range chỉ chứa các câu hỏi có subjectId = id cần xóa
        const keyRange = IDBKeyRange.only(id);
        
        // Mở cursor để duyệt và xóa
        const cursorRequest = index.openCursor(keyRange);
        cursorRequest.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
            if (cursor) {
                cursor.delete(); // Xóa bản ghi hiện tại
                cursor.continue(); // Tiếp tục duyệt
            }
        };

        // b. Xóa môn học
        const sStore = transaction.objectStore('subjects');
        sStore.delete(id);
    });
  }

  // Question Management
  async saveQuestions(questions: Question[]): Promise<void> {
    return this.performTransaction('questions', 'readwrite', (store) => {
      questions.forEach(q => store.put(q));
    });
  }

  // Thêm hàm lấy tất cả câu hỏi (cho chức năng Export JSON)
  async getAllQuestions(): Promise<Question[]> {
    return this.performTransaction('questions', 'readonly', (store) => store.getAll());
  }

  async getQuestionsBySubject(subjectId: string): Promise<Question[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction('questions', 'readonly');
      const store = transaction.objectStore('questions');
      const index = store.index('subjectId');
      const request = index.getAll(subjectId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getQuestionsBySubjectRecursive(subjectId: string): Promise<Question[]> {
    const allSubjects = await this.getSubjects();
    const findChildren = (pid: string): string[] => {
      const children = allSubjects.filter(s => s.parentId === pid).map(s => s.id);
      return [pid, ...children.flatMap(findChildren)];
    };
    const targetIds = Array.from(new Set(findChildren(subjectId)));
    const results = await Promise.all(targetIds.map(id => this.getQuestionsBySubject(id)));
    return results.flat();
  }

  // History / Results
  async saveResult(result: ExamResult): Promise<void> {
    return this.performTransaction('results', 'readwrite', (store) => {
      store.add(result);
    });
  }

  async getHistory(): Promise<ExamResult[]> {
    return this.performTransaction('results', 'readonly', (store) => store.getAll());
  }

  // Maintenance
  async clearAllData(): Promise<void> {
    const stores = ['subjects', 'questions', 'results', 'examConfigs', 'attributes'];
    await Promise.all(stores.map(s => this.performTransaction(s, 'readwrite', (store) => store.clear())));
  }

  // Helper cho Native IDB
  private async performTransaction<T>(
    storeName: string, 
    mode: IDBTransactionMode, 
    callback: (store: IDBObjectStore) => IDBRequest<T> | void
  ): Promise<T> {
    await this.init(); // Đảm bảo DB đã init
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      try {
        const transaction = this.db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = callback(store);
        
        if (request) {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } else {
          transaction.oncomplete = () => resolve(null as T);
          transaction.onerror = () => reject(transaction.error);
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const db = new Database();