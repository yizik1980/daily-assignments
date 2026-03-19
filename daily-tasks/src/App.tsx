import { useEffect, useState, useCallback } from 'react';
import './App.css';
import Onboarding from './Onboarding';
import ScheduleView from './ScheduleView';
import TableView from './TableView';
import {
  Child,
  Task,
  TaskCompletion,
  isSetupComplete,
  getChildren,
  getTasks,
  getCompletionsForDate,
  toggleCompletion,
  addChild,
  updateChild,
  deleteChild,
  addTask,
  deleteTask,
} from './db';

const CHILD_ICONS = ['👦', '👧', '🧒', '👶', '🧑', '👱', '🧔', '👩', '🦱', '🧕', '🧑‍🦰', '🧑‍🦱', '🧑‍🦳', '🧑‍🦲', '🐣', '🦊', '🐻', '🦁', '🐯', '🐸', '🌟', '🦄', '🐧', '🐼'];
const TASK_ICONS = [
  // בוקר / היגיינה
  '⏰', '🦷', '🚿', '🛁', '🧴', '🪥', '💊', '🥛', '🥣', '🍳', '☕',
  // ניקיון
  '🧹', '🧺', '🧽', '🪣', '🫧', '🗑️', '🪴', '🧻', '🛁',
  // לבוש / חדר
  '👕', '👟', '🛏️', '🪟', '🧳',
  // לימודים / עבודה
  '📚', '✏️', '📓', '🎒', '🖥️', '📝', '🔬', '📐',
  // טלפון / מדיה
  '📱', '☎️', '💻', '📺', '🎧', '🎮', '📷',
  // פעילות / ספורט
  '🏃', '🚴', '⚽', '🏊', '🧘', '🤸',
  // אוכל / בישול
  '🍽️', '🥗', '🍎', '🥪', '🧃', '🍰',
  // חיות / טבע
  '🐕', '🐱', '🌿', '🌻', '♻️',
  // כללי
  '🎨', '🎵', '🎯', '⭐', '✅', '❤️', '🙏',
];

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

type AppState = 'loading' | 'onboarding' | 'app';
type Tab = 'tasks' | 'schedule' | 'overview' | 'children' | 'taskList';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [children, setChildren] = useState<Child[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [date, setDate] = useState(todayStr());
  const [tab, setTab] = useState<Tab>('tasks');

  const [newChildName, setNewChildName] = useState('');
  const [newChildIcon, setNewChildIcon] = useState('👦');
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [editChildName, setEditChildName] = useState('');
  const [editChildIcon, setEditChildIcon] = useState('👦');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskIcon, setNewTaskIcon] = useState('⏰');

  const loadApp = useCallback(async () => {
    const [c, t, comp] = await Promise.all([
      getChildren(),
      getTasks(),
      getCompletionsForDate(date),
    ]);
    setChildren(c);
    setTasks(t);
    setCompletions(comp);
    setSelectedChild((prev) => prev ?? c[0] ?? null);
    setAppState('app');
  }, [date]);

  useEffect(() => {
    isSetupComplete().then(({ hasChildren, hasTasks }) => {
      if (hasChildren && hasTasks) {
        loadApp();
      } else {
        setAppState('onboarding');
      }
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (appState === 'app') {
      getCompletionsForDate(date).then(setCompletions);
    }
  }, [date, appState]);

  const handleToggle = async (taskId: number) => {
    if (!selectedChild) return;
    await toggleCompletion(selectedChild.id, taskId, date);
    const updated = await getCompletionsForDate(date);
    setCompletions(updated);
  };

  const isCompleted = (taskId: number): boolean => {
    if (!selectedChild) return false;
    const c = completions.find(
      (comp) => comp.childId === selectedChild.id && comp.taskId === taskId
    );
    return !!c?.completed;
  };

  const completedCount = (): number => {
    if (!selectedChild) return 0;
    return completions.filter((c) => c.childId === selectedChild.id && c.completed).length;
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) return;
    await addChild(newChildName.trim(), newChildIcon);
    setNewChildName('');
    const c = await getChildren();
    setChildren(c);
  };

  const handleStartEditChild = (child: Child) => {
    setEditingChild(child);
    setEditChildName(child.name);
    setEditChildIcon(child.icon);
  };

  const handleSaveChild = async () => {
    if (!editingChild || !editChildName.trim()) return;
    await updateChild(editingChild.id, editChildName.trim(), editChildIcon);
    const c = await getChildren();
    setChildren(c);
    if (selectedChild?.id === editingChild.id) {
      setSelectedChild(c.find((x) => x.id === editingChild.id) ?? null);
    }
    setEditingChild(null);
  };

  const handleDeleteChild = async (id: number) => {
    await deleteChild(id);
    const c = await getChildren();
    setChildren(c);
    if (selectedChild?.id === id) setSelectedChild(c[0] || null);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await addTask(newTaskTitle.trim(), newTaskIcon);
    setNewTaskTitle('');
    const t = await getTasks();
    setTasks(t);
  };

  const handleDeleteTask = async (id: number) => {
    await deleteTask(id);
    const t = await getTasks();
    setTasks(t);
  };

  const progress = tasks.length > 0 ? Math.round((completedCount() / tasks.length) * 100) : 0;

  if (appState === 'loading') {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>טוען...</p>
      </div>
    );
  }

  if (appState === 'onboarding') {
    return <Onboarding onComplete={loadApp} />;
  }

  return (
    <div className="app" dir="rtl">
      <header className="header">
        <h1>✅ משימות יומיות</h1>
        {tab === 'tasks' && (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="date-input"
          />
        )}
      </header>

      <nav className="tabs">
        <button className={tab === 'tasks' ? 'tab active' : 'tab'} onClick={() => setTab('tasks')}>
          📋 משימות
        </button>
        <button className={tab === 'schedule' ? 'tab active' : 'tab'} onClick={() => setTab('schedule')}>
          🕐 לוח שעות
        </button>
        <button className={tab === 'overview' ? 'tab active' : 'tab'} onClick={() => setTab('overview')}>
          📊 טבלה כללית
        </button>
        <button className={tab === 'children' ? 'tab active' : 'tab'} onClick={() => setTab('children')}>
          👶 ילדים
        </button>
        <button className={tab === 'taskList' ? 'tab active' : 'tab'} onClick={() => setTab('taskList')}>
          🗂️ משימות
        </button>
      </nav>

      {tab === 'tasks' && (
        <div className="content">
          <div className="children-row">
            {children.map((child) => (
              <button
                key={child.id}
                className={`child-btn ${selectedChild?.id === child.id ? 'selected' : ''}`}
                onClick={() => setSelectedChild(child)}
              >
                <span className="child-icon">{child.icon}</span>
                <span className="child-name">{child.name}</span>
              </button>
            ))}
          </div>

          {selectedChild && (
            <>
              <div className="progress-section">
                <div className="progress-label">
                  <span>{selectedChild.icon} {selectedChild.name}</span>
                  <span>{completedCount()} / {tasks.length} משימות</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                {progress === 100 && tasks.length > 0 && (
                  <div className="congrats">🎉 כל הכבוד! סיימת את כל המשימות!</div>
                )}
              </div>

              <div className="task-list">
                {tasks.map((task) => {
                  const done = isCompleted(task.id);
                  return (
                    <div
                      key={task.id}
                      className={`task-item ${done ? 'done' : ''}`}
                      onClick={() => handleToggle(task.id)}
                    >
                      <span className="task-icon">{task.icon}</span>
                      <span className="task-title">{task.title}</span>
                      <span className="check">{done ? '✅' : '⬜'}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'schedule' && (
        <ScheduleView children={children} tasks={tasks} />
      )}

      {tab === 'overview' && (
        <TableView children={children} tasks={tasks} />
      )}

      {tab === 'children' && (
        <div className="content">
          <h2>ניהול ילדים</h2>

          <div className="add-form">
            <div className="icon-picker">
              {CHILD_ICONS.map((ic) => (
                <button
                  key={ic}
                  className={`icon-btn ${newChildIcon === ic ? 'selected' : ''}`}
                  onClick={() => setNewChildIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
            <div className="form-row">
              <input
                type="text"
                placeholder="שם הילד/ה"
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChild()}
                className="text-input"
              />
              <button className="add-btn" onClick={handleAddChild}>+ הוסף</button>
            </div>
          </div>

          <div className="item-list">
            {children.map((child) => (
              <div key={child.id} className="item-row">
                <span className="item-icon">{child.icon}</span>
                <span className="item-name">{child.name}</span>
                <button className="edit-btn" onClick={() => handleStartEditChild(child)}>✏️</button>
                <button className="delete-btn" onClick={() => handleDeleteChild(child.id)}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit child modal */}
      {editingChild && (
        <div className="modal-backdrop" onClick={() => setEditingChild(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} dir="rtl">
            <h3>עריכת ילד</h3>
            <div className="icon-picker">
              {CHILD_ICONS.map((ic) => (
                <button
                  key={ic}
                  className={`icon-btn ${editChildIcon === ic ? 'selected' : ''}`}
                  onClick={() => setEditChildIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
            <div className="modal-preview">
              <span className="modal-icon">{editChildIcon}</span>
            </div>
            <input
              type="text"
              value={editChildName}
              onChange={(e) => setEditChildName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveChild()}
              className="text-input"
              autoFocus
            />
            <div className="modal-btns">
              <button className="add-btn" onClick={handleSaveChild}>שמור</button>
              <button className="cancel-btn" onClick={() => setEditingChild(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'taskList' && (
        <div className="content">
          <h2>ניהול משימות</h2>

          <div className="add-form">
            <div className="icon-picker">
              {TASK_ICONS.map((ic) => (
                <button
                  key={ic}
                  className={`icon-btn ${newTaskIcon === ic ? 'selected' : ''}`}
                  onClick={() => setNewTaskIcon(ic)}
                >
                  {ic}
                </button>
              ))}
            </div>
            <div className="form-row">
              <input
                type="text"
                placeholder="שם המשימה"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                className="text-input"
              />
              <button className="add-btn" onClick={handleAddTask}>+ הוסף</button>
            </div>
          </div>

          <div className="item-list">
            {tasks.map((task) => (
              <div key={task.id} className="item-row">
                <span className="item-icon">{task.icon}</span>
                <span className="item-name">{task.title}</span>
                <button className="delete-btn" onClick={() => handleDeleteTask(task.id)}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
