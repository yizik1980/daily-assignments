export interface Child {
  id: number;
  name: string;
  icon: string;
}

export interface Task {
  id: number;
  title: string;
  icon: string;
}

export interface TaskCompletion {
  id?: number;
  childId: number;
  taskId: number;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface Schedule {
  id?: number;
  childId: number;
  taskId: number;
  time: string; // "HH:MM"
}

const DB_NAME = 'DailyTasksDB';
const DB_VERSION = 3;

let db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains('children')) {
        const childStore = database.createObjectStore('children', { keyPath: 'id' });
        childStore.createIndex('name', 'name', { unique: false });
      }

      if (!database.objectStoreNames.contains('tasks')) {
        const taskStore = database.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('title', 'title', { unique: false });
      }

      if (!database.objectStoreNames.contains('completions')) {
        const completionStore = database.createObjectStore('completions', {
          keyPath: 'id',
          autoIncrement: true,
        });
        completionStore.createIndex('childId', 'childId', { unique: false });
        completionStore.createIndex('date', 'date', { unique: false });
        completionStore.createIndex('childDate', ['childId', 'date'], { unique: false });
      }

      if (!database.objectStoreNames.contains('schedules')) {
        const scheduleStore = database.createObjectStore('schedules', {
          keyPath: 'id',
          autoIncrement: true,
        });
        scheduleStore.createIndex('childId', 'childId', { unique: false });
        scheduleStore.createIndex('childTask', ['childId', 'taskId'], { unique: true });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore<T>(database: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function bulkAdd(database: IDBDatabase, storeName: string, items: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach((item) => store.add(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Public API

export async function isSetupComplete(): Promise<{ hasChildren: boolean; hasTasks: boolean }> {
  const database = await openDB();
  const [children, tasks] = await Promise.all([
    getAllFromStore<Child>(database, 'children'),
    getAllFromStore<Task>(database, 'tasks'),
  ]);
  return { hasChildren: children.length > 0, hasTasks: tasks.length > 0 };
}

export async function getChildren(): Promise<Child[]> {
  const database = await openDB();
  return getAllFromStore<Child>(database, 'children');
}

export async function getTasks(): Promise<Task[]> {
  const database = await openDB();
  return getAllFromStore<Task>(database, 'tasks');
}

export async function saveChildren(children: { name: string; icon: string }[]): Promise<void> {
  const database = await openDB();
  const items = children.map((c, i) => ({ id: i + 1, ...c }));
  await bulkAdd(database, 'children', items);
}

export async function saveTasks(tasks: { title: string; icon: string }[]): Promise<void> {
  const database = await openDB();
  const items = tasks.map((t, i) => ({ id: i + 1, ...t }));
  await bulkAdd(database, 'tasks', items);
}

export async function addChild(name: string, icon: string): Promise<void> {
  const database = await openDB();
  const children = await getAllFromStore<Child>(database, 'children');
  const maxId = children.reduce((max, c) => Math.max(max, c.id), 0);
  return new Promise((resolve, reject) => {
    const tx = database.transaction('children', 'readwrite');
    tx.objectStore('children').add({ id: maxId + 1, name, icon });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateChild(id: number, name: string, icon: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('children', 'readwrite');
    tx.objectStore('children').put({ id, name, icon });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteChild(id: number): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('children', 'readwrite');
    tx.objectStore('children').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addTask(title: string, icon: string): Promise<void> {
  const database = await openDB();
  const tasks = await getAllFromStore<Task>(database, 'tasks');
  const maxId = tasks.reduce((max, t) => Math.max(max, t.id), 0);
  return new Promise((resolve, reject) => {
    const tx = database.transaction('tasks', 'readwrite');
    tx.objectStore('tasks').add({ id: maxId + 1, title, icon });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTask(id: number): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('tasks', 'readwrite');
    tx.objectStore('tasks').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCompletionsForDate(date: string): Promise<TaskCompletion[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('completions', 'readonly');
    const store = tx.objectStore('completions');
    const index = store.index('date');
    const request = index.getAll(date);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function toggleCompletion(
  childId: number,
  taskId: number,
  date: string
): Promise<void> {
  const database = await openDB();
  const completions = await getCompletionsForDate(date);
  const existing = completions.find(
    (c) => c.childId === childId && c.taskId === taskId
  );

  return new Promise((resolve, reject) => {
    const tx = database.transaction('completions', 'readwrite');
    const store = tx.objectStore('completions');
    if (existing) {
      store.put({ ...existing, completed: !existing.completed });
    } else {
      store.add({ childId, taskId, date, completed: true });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Schedule API ─────────────────────────────────────────────

export async function getAllSchedules(): Promise<Schedule[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('schedules', 'readonly');
    const request = tx.objectStore('schedules').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getSchedulesForChild(childId: number): Promise<Schedule[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('schedules', 'readonly');
    const index = tx.objectStore('schedules').index('childId');
    const request = index.getAll(childId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setSchedule(
  childId: number,
  taskId: number,
  time: string
): Promise<void> {
  const database = await openDB();
  const existing = await getSchedulesForChild(childId);
  const entry = existing.find((s) => s.taskId === taskId);

  return new Promise((resolve, reject) => {
    const tx = database.transaction('schedules', 'readwrite');
    const store = tx.objectStore('schedules');
    if (entry) {
      store.put({ ...entry, time });
    } else {
      store.add({ childId, taskId, time });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeSchedule(childId: number, taskId: number): Promise<void> {
  const database = await openDB();
  const existing = await getSchedulesForChild(childId);
  const entry = existing.find((s) => s.taskId === taskId);
  if (!entry?.id) return;

  return new Promise((resolve, reject) => {
    const tx = database.transaction('schedules', 'readwrite');
    tx.objectStore('schedules').delete(entry.id!);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
