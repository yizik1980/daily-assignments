import { useEffect, useState } from 'react';
import { Child, Task, Schedule, getAllSchedules } from './db';
import './TableView.css';

interface Props {
  children: Child[];
  tasks: Task[];
}

export default function TableView({ children, tasks }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    getAllSchedules().then(setSchedules);
  }, []);

  const getTask = (taskId: number): Task | undefined =>
    tasks.find((t) => t.id === taskId);

  // Generate all hours from 07:00 to 20:00
  const fixedHours = Array.from({ length: 14 }, (_, i) =>
    `${String(i + 7).padStart(2, '0')}:00`
  );

  // Merge fixed hours with any scheduled times outside that range, sorted
  const allTimes = Array.from(
    new Set([...fixedHours, ...schedules.map((s) => s.time)])
  ).sort();

  // For a given time + child: find scheduled task
  const cellTask = (time: string, childId: number): Task | undefined => {
    const s = schedules.find((s) => s.time === time && s.childId === childId);
    return s ? getTask(s.taskId) : undefined;
  };

  // Count how many tasks each child has
  const childCount = (childId: number) =>
    schedules.filter((s) => s.childId === childId).length;

  if (schedules.length === 0) {
    return (
      <div className="tv-empty" dir="rtl">
        <div className="tv-empty-icon">📅</div>
        <p>אין משימות מתוזמנות עדיין</p>
        <p className="tv-empty-hint">עבור ל"לוח שעות" ושבץ משימות לילדים</p>
      </div>
    );
  }

  return (
    <div className="tv-wrap" dir="rtl">
      <div className="tv-scroll">
        <table className="tv-table">
          <thead>
            <tr>
              <th className="tv-time-header">⏰ שעה</th>
              {children.map((child) => (
                <th key={child.id} className="tv-child-header">
                  <div className="tv-child-icon">{child.icon}</div>
                  <div className="tv-child-name">{child.name}</div>
                  <div className="tv-child-count">{childCount(child.id)} משימות</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTimes.map((time, idx) => (
              <tr key={time} className={idx % 2 === 0 ? 'tv-row-even' : 'tv-row-odd'}>
                <td className="tv-time-cell">
                  <span className="tv-time-badge">{time}</span>
                </td>
                {children.map((child) => {
                  const task = cellTask(time, child.id);
                  return (
                    <td key={child.id} className={`tv-task-cell ${task ? 'has-task' : ''}`}>
                      {task ? (
                        <div className="tv-task-chip">
                          <span className="tv-task-chip-icon">{task.icon}</span>
                          <span className="tv-task-chip-title">{task.title}</span>
                        </div>
                      ) : (
                        <span className="tv-empty-cell">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
