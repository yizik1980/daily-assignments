import { useState } from 'react';
import { saveChildren, saveTasks } from './db';
import './Onboarding.css';

const CHILD_ICONS = ['👦', '👧', '🧒', '👶', '🧑', '👱', '🧔', '👩', '🦱', '🧕', '🧑‍🦰', '🧑‍🦱', '🧑‍🦳', '🧑‍🦲', '🐣', '🦊', '🐻', '🦁', '🐯', '🐸', '🌟', '🦄', '🐧', '🐼'];
const TASK_ICONS = [
  '⏰', '🦷', '🚿', '🛁', '🧴', '🪥', '💊', '🥛', '🥣', '🍳', '☕',
  '🧹', '🧺', '🧽', '🪣', '🫧', '🗑️', '🪴', '🧻',
  '👕', '👟', '🛏️', '🪟', '🧳',
  '📚', '✏️', '📓', '🎒', '🖥️', '📝', '🔬', '📐',
  '📱', '☎️', '💻', '📺', '🎧', '🎮', '📷',
  '🏃', '🚴', '⚽', '🏊', '🧘', '🤸',
  '🍽️', '🥗', '🍎', '🥪', '🧃', '🍰',
  '🐕', '🐱', '🌿', '🌻', '♻️',
  '🎨', '🎵', '🎯', '⭐', '✅', '❤️', '🙏',
];

interface ChildEntry {
  name: string;
  icon: string;
}

interface TaskEntry {
  title: string;
  icon: string;
}

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 — children
  const [children, setChildren] = useState<ChildEntry[]>([{ name: '', icon: '👦' }]);

  // Step 2 — tasks
  const [tasks, setTasks] = useState<TaskEntry[]>([{ title: '', icon: '⏰' }]);

  const [saving, setSaving] = useState(false);

  // ── Step 1 helpers ──────────────────────────────────────────
  const updateChild = (index: number, field: keyof ChildEntry, value: string) => {
    setChildren((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const addChildRow = () => setChildren((prev) => [...prev, { name: '', icon: '👦' }]);

  const removeChildRow = (index: number) =>
    setChildren((prev) => prev.filter((_, i) => i !== index));

  const validChildren = children.filter((c) => c.name.trim());

  const handleStep1Next = () => {
    if (validChildren.length === 0) return;
    setStep(2);
  };

  // ── Step 2 helpers ──────────────────────────────────────────
  const updateTask = (index: number, field: keyof TaskEntry, value: string) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addTaskRow = () => setTasks((prev) => [...prev, { title: '', icon: '⏰' }]);

  const removeTaskRow = (index: number) =>
    setTasks((prev) => prev.filter((_, i) => i !== index));

  const validTasks = tasks.filter((t) => t.title.trim());

  const handleFinish = async () => {
    if (validTasks.length === 0) return;
    setSaving(true);
    await saveChildren(validChildren);
    await saveTasks(validTasks);
    onComplete();
  };

  return (
    <div className="onboarding" dir="rtl">
      <div className="ob-card">
        {/* Step indicator */}
        <div className="ob-steps">
          <div className={`ob-step ${step === 1 ? 'active' : 'done'}`}>
            <span className="ob-step-num">{step > 1 ? '✓' : '1'}</span>
            <span>ילדים</span>
          </div>
          <div className="ob-step-line" />
          <div className={`ob-step ${step === 2 ? 'active' : ''}`}>
            <span className="ob-step-num">2</span>
            <span>משימות שבועיות</span>
          </div>
        </div>

        {step === 1 && (
          <>
            <h2>👨‍👩‍👧‍👦 הוסף את הילדים</h2>
            <p className="ob-subtitle">הכנס את שמות הילדים ובחר אייקון לכל אחד</p>

            <div className="ob-rows">
              {children.map((child, i) => (
                <div key={i} className="ob-row">
                  <div className="ob-icon-select">
                    <select
                      value={child.icon}
                      onChange={(e) => updateChild(i, 'icon', e.target.value)}
                      className="ob-select"
                    >
                      {CHILD_ICONS.map((ic) => (
                        <option key={ic} value={ic}>{ic}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder={`שם ילד ${i + 1}`}
                    value={child.name}
                    onChange={(e) => updateChild(i, 'name', e.target.value)}
                    className="ob-input"
                    autoFocus={i === 0}
                  />
                  {children.length > 1 && (
                    <button className="ob-remove" onClick={() => removeChildRow(i)}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <button className="ob-add-row" onClick={addChildRow}>
              + הוסף ילד נוסף
            </button>

            <button
              className="ob-next"
              onClick={handleStep1Next}
              disabled={validChildren.length === 0}
            >
              המשך למשימות ←
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>📋 הגדר משימות שבועיות</h2>
            <p className="ob-subtitle">הכנס את המשימות היומיות שכל הילדים צריכים לבצע</p>

            <div className="ob-rows">
              {tasks.map((task, i) => (
                <div key={i} className="ob-row">
                  <div className="ob-icon-select">
                    <select
                      value={task.icon}
                      onChange={(e) => updateTask(i, 'icon', e.target.value)}
                      className="ob-select"
                    >
                      {TASK_ICONS.map((ic) => (
                        <option key={ic} value={ic}>{ic}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder={`משימה ${i + 1}`}
                    value={task.title}
                    onChange={(e) => updateTask(i, 'title', e.target.value)}
                    className="ob-input"
                    autoFocus={i === 0}
                  />
                  {tasks.length > 1 && (
                    <button className="ob-remove" onClick={() => removeTaskRow(i)}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <button className="ob-add-row" onClick={addTaskRow}>
              + הוסף משימה נוספת
            </button>

            <div className="ob-footer">
              <button className="ob-back" onClick={() => setStep(1)}>
                ← חזור
              </button>
              <button
                className="ob-next"
                onClick={handleFinish}
                disabled={validTasks.length === 0 || saving}
              >
                {saving ? 'שומר...' : 'סיום והתחל 🎉'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
