import { useEffect, useState, useRef } from 'react';
import { Child, Task, Schedule, getSchedulesForChild, setSchedule, removeSchedule } from './db';
import './ScheduleView.css';

const START_HOUR = 7;
const END_HOUR = 20;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const TIMELINE_HEIGHT = 650; // px

const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function timeToPercent(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const minutes = h * 60 + m - START_HOUR * 60;
  return Math.min(100, Math.max(0, (minutes / TOTAL_MINUTES) * 100));
}

function minutesToTime(minutes: number): string {
  const total = START_HOUR * 60 + minutes;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface Props {
  children: Child[];
  tasks: Task[];
}

export default function ScheduleView({ children, tasks }: Props) {
  const [selectedChild, setSelectedChild] = useState<Child | null>(children[0] ?? null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [draftTime, setDraftTime] = useState('08:00');
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedChild) {
      getSchedulesForChild(selectedChild.id).then(setSchedules);
    }
  }, [selectedChild]);

  const reload = async () => {
    if (selectedChild) {
      const s = await getSchedulesForChild(selectedChild.id);
      setSchedules(s);
    }
  };

  const getSchedule = (taskId: number): Schedule | undefined =>
    schedules.find((s) => s.taskId === taskId);

  const handleOpenEdit = (task: Task) => {
    const existing = getSchedule(task.id);
    setDraftTime(existing?.time ?? '08:00');
    setEditingTaskId(task.id);
  };

  const handleSave = async () => {
    if (!selectedChild || editingTaskId === null) return;
    await setSchedule(selectedChild.id, editingTaskId, draftTime);
    setEditingTaskId(null);
    await reload();
  };

  const handleRemove = async (taskId: number) => {
    if (!selectedChild) return;
    await removeSchedule(selectedChild.id, taskId);
    await reload();
  };

  // Sort scheduled tasks by time
  const scheduled = schedules
    .map((s) => ({ schedule: s, task: tasks.find((t) => t.id === s.taskId)! }))
    .filter((x) => x.task)
    .sort((a, b) => a.schedule.time.localeCompare(b.schedule.time));

  const unscheduled = tasks.filter((t) => !getSchedule(t.id));

  // Handle click on timeline to set time
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || editingTaskId === null) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percent = Math.max(0, Math.min(1, y / TIMELINE_HEIGHT));
    const minutes = Math.round((percent * TOTAL_MINUTES) / 30) * 30;
    setDraftTime(minutesToTime(minutes));
  };

  return (
    <div className="schedule-view" dir="rtl">
      {/* Child selector */}
      <div className="sv-children-row">
        {children.map((child) => (
          <button
            key={child.id}
            className={`sv-child-btn ${selectedChild?.id === child.id ? 'selected' : ''}`}
            onClick={() => { setSelectedChild(child); setEditingTaskId(null); }}
          >
            <span>{child.icon}</span>
            <span>{child.name}</span>
          </button>
        ))}
      </div>

      {selectedChild && (
        <div className="sv-main">
          {/* Timeline */}
          <div className="sv-timeline-wrap">
            <div
              className={`sv-timeline ${editingTaskId !== null ? 'clickable' : ''}`}
              style={{ height: TIMELINE_HEIGHT }}
              ref={timelineRef}
              onClick={handleTimelineClick}
            >
              {editingTaskId !== null && (
                <div className="sv-click-hint">לחץ על ציר הזמן לבחירת שעה</div>
              )}

              {/* Hour markers */}
              {HOURS.map((hour) => {
                const pct = ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
                return (
                  <div
                    key={hour}
                    className="sv-hour-line"
                    style={{ top: `${pct}%` }}
                  >
                    <span className="sv-hour-label">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                    <div className="sv-line" />
                  </div>
                );
              })}

              {/* Draft time indicator */}
              {editingTaskId !== null && (
                <div
                  className="sv-draft-indicator"
                  style={{ top: `${timeToPercent(draftTime)}%` }}
                >
                  <span className="sv-draft-time">{draftTime}</span>
                  <div className="sv-draft-line" />
                </div>
              )}

              {/* Scheduled task cards */}
              {scheduled.map(({ schedule, task }) => (
                <div
                  key={task.id}
                  className={`sv-task-card ${editingTaskId === task.id ? 'editing' : ''}`}
                  style={{ top: `calc(${timeToPercent(schedule.time)}% + 2px)` }}
                  onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }}
                >
                  <span className="sv-card-time">{schedule.time}</span>
                  <span className="sv-card-icon">{task.icon}</span>
                  <span className="sv-card-title">{task.title}</span>
                  <button
                    className="sv-card-remove"
                    onClick={(e) => { e.stopPropagation(); handleRemove(task.id); }}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Side panel */}
          <div className="sv-side">
            {/* Edit panel */}
            {editingTaskId !== null && (() => {
              const task = tasks.find((t) => t.id === editingTaskId)!;
              return (
                <div className="sv-edit-panel">
                  <div className="sv-edit-title">
                    <span>{task.icon}</span> {task.title}
                  </div>
                  <label className="sv-edit-label">שעת ביצוע</label>
                  <input
                    type="time"
                    min="07:00"
                    max="20:00"
                    value={draftTime}
                    onChange={(e) => setDraftTime(e.target.value)}
                    className="sv-time-input"
                  />
                  <div className="sv-edit-hint">או לחץ על הציר לבחירת שעה</div>
                  <div className="sv-edit-btns">
                    <button className="sv-save-btn" onClick={handleSave}>שמור</button>
                    <button className="sv-cancel-btn" onClick={() => setEditingTaskId(null)}>ביטול</button>
                  </div>
                </div>
              );
            })()}

            {/* Unscheduled tasks */}
            <div className="sv-unscheduled">
              <h3>📋 משימות ללא שעה</h3>
              {unscheduled.length === 0 ? (
                <p className="sv-all-done">כל המשימות מתוזמנות ✅</p>
              ) : (
                unscheduled.map((task) => (
                  <div key={task.id} className="sv-unsched-item">
                    <span>{task.icon}</span>
                    <span className="sv-unsched-title">{task.title}</span>
                    <button
                      className="sv-assign-btn"
                      onClick={() => handleOpenEdit(task)}
                    >
                      + שבץ
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Scheduled summary */}
            {scheduled.length > 0 && (
              <div className="sv-summary">
                <h3>⏱️ לוח זמנים</h3>
                {scheduled.map(({ schedule, task }) => (
                  <div
                    key={task.id}
                    className="sv-summary-item"
                    onClick={() => handleOpenEdit(task)}
                  >
                    <span className="sv-sum-time">{schedule.time}</span>
                    <span>{task.icon}</span>
                    <span className="sv-sum-title">{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
