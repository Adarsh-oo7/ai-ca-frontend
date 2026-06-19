'use client';

import React from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  Plus,
  CheckCircle,
  Clock,
  Trash2,
  RefreshCw,
  PlusCircle,
  CalendarCheck,
  ArrowRightLeft,
  Zap,
  Link2,
  Unlink
} from 'lucide-react';
import { ScheduleService } from '@/services/schedule.service';
import { CurriculumService } from '@/services/curriculum.service';

const TASK_TYPES = [
  { value: 'study', label: 'Study New Topic' },
  { value: 'revision', label: 'Spaced Repetition Revision' },
  { value: 'mcq_practice', label: 'MCQ Practice' },
  { value: 'mock_test', label: 'Mock Test' },
  { value: 'doubt_solving', label: 'Doubt Solving' },
  { value: 'notes', label: 'Read Notes' },
];

const PRIORITIES = [
  { value: 1, label: 'Critical' },
  { value: 2, label: 'High' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'Low' },
];

interface StudyTask {
  id: string;
  title: string;
  description: string;
  task_type: string;
  task_type_display: string;
  subject_name?: string;
  duration_minutes: number;
  priority: number;
  scheduled_time: string;
  is_completed: boolean;
  google_event_id?: string;
  is_ai_generated?: boolean;
  ai_reason?: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function SchedulePage() {
  const [tasks, setTasks] = React.useState<StudyTask[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
  
  // Create task modal/form state
  const [title, setTitle] = React.useState('');
  const [taskType, setTaskType] = React.useState('study');
  const [selectedSubject, setSelectedSubject] = React.useState('');
  const [duration, setDuration] = React.useState(60);
  const [priority, setPriority] = React.useState(3);
  const [time, setTime] = React.useState('10:00');
  const [desc, setDesc] = React.useState('');

  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [showAddForm, setShowAddForm] = React.useState(false);
  
  // Google Calendar states
  const [calendarConnected, setCalendarConnected] = React.useState(false);
  const [syncingCalendar, setSyncingCalendar] = React.useState(false);
  const [autoScheduling, setAutoScheduling] = React.useState(false);
  const [rescheduling, setRescheduling] = React.useState(false);

  const loadTasksAndSubjects = React.useCallback(async () => {
    try {
      const taskList = await ScheduleService.getTasks(date);
      setTasks(Array.isArray(taskList) ? taskList : taskList.results || []);

      const subs = await CurriculumService.getSubjects();
      setSubjects(Array.isArray(subs) ? subs : subs.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTasksAndSubjects();
  }, [loadTasksAndSubjects]);

  // Check Google Calendar status
  React.useEffect(() => {
    async function checkCalendar() {
      try {
        const status = await ScheduleService.getCalendarStatus();
        setCalendarConnected(status.connected);
      } catch (e) {
        console.error(e);
      }
    }
    checkCalendar();
  }, []);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      await ScheduleService.generateDailyPlan(date);
      await loadTasksAndSubjects();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoScheduleWeek = async () => {
    setAutoScheduling(true);
    try {
      const startDate = date;
      const endDateObj = new Date(date);
      endDateObj.setDate(endDateObj.getDate() + 6);
      const endDate = endDateObj.toISOString().split('T')[0];
      
      await ScheduleService.autoScheduleWeek(startDate, endDate);
      // Wait a bit for Celery to process, then reload
      setTimeout(() => {
        loadTasksAndSubjects();
        setAutoScheduling(false);
      }, 3000);
    } catch (e) {
      console.error(e);
      setAutoScheduling(false);
    }
  };

  const handleRescheduleMissed = async () => {
    setRescheduling(true);
    try {
      const result = await ScheduleService.rescheduleMissed();
      alert(result.message || 'Rescheduling complete');
      await loadTasksAndSubjects();
    } catch (e) {
      console.error(e);
    } finally {
      setRescheduling(false);
    }
  };

  const handleCompleteTask = async (taskId: string, duration: number) => {
    try {
      await ScheduleService.completeTask(taskId, duration);
      await loadTasksAndSubjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await ScheduleService.deleteTask(taskId);
      await loadTasksAndSubjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await ScheduleService.createTask({
        title,
        task_type: taskType,
        subject: selectedSubject || null,
        duration_minutes: duration,
        priority,
        scheduled_date: date,
        scheduled_time: `${time}:00`,
        description: desc
      });

      setTitle('');
      setDesc('');
      setShowAddForm(false);
      await loadTasksAndSubjects();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const result = await ScheduleService.connectCalendar();
      if (result.auth_url) {
        window.open(result.auth_url, '_blank', 'width=500,height=600');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      await ScheduleService.disconnectCalendar();
      setCalendarConnected(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncCalendar = async () => {
    setSyncingCalendar(true);
    try {
      const result = await ScheduleService.syncToCalendar(date);
      alert(`Synced ${result.synced} tasks to Google Calendar${result.errors > 0 ? ` (${result.errors} errors)` : ''}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err?.response?.data?.error || 'Failed to sync');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const completedHours = tasks.filter(t => t.is_completed).reduce((acc, t) => acc + (t.duration_minutes || 0), 0) / 60.0;
  const plannedHours = tasks.reduce((acc, t) => acc + (t.duration_minutes || 0), 0) / 60.0;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white light-theme:text-zinc-900">Study Calendar</h2>
          <p className="text-zinc-500 text-sm">Add manual assignments, complete revision sets, or query the AI mentor to write schedules.</p>
        </div>

        {/* Date Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-800"
            />
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="flex items-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                <span>Creating Slots...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4.5 w-4.5" />
                <span>AI Generate</span>
              </>
            )}
          </button>

          <button
            onClick={handleAutoScheduleWeek}
            disabled={autoScheduling}
            className="flex items-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/10"
            title="Auto-schedule 7 days starting from selected date"
          >
            {autoScheduling ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Scheduling...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Auto Week</span>
              </>
            )}
          </button>

          <button
            onClick={handleRescheduleMissed}
            disabled={rescheduling}
            className="flex items-center gap-2 py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer"
            title="Reschedule yesterday's missed tasks to today"
          >
            {rescheduling ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Reschedule</span>
          </button>
        </div>
      </div>

      {/* Google Calendar Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 light-theme:bg-white light-theme:border-zinc-200">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${calendarConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500 light-theme:bg-zinc-100 light-theme:text-zinc-400'}`}>
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white light-theme:text-zinc-800">Google Calendar</h4>
            <p className="text-[10px] text-zinc-500">
              {calendarConnected ? '✅ Connected — Sync study tasks to your calendar' : 'Connect to sync tasks and get reminders'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {calendarConnected ? (
            <>
              <button
                onClick={handleSyncCalendar}
                disabled={syncingCalendar}
                className="flex items-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {syncingCalendar ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CalendarCheck className="h-3.5 w-3.5" />
                )}
                <span>Sync Day</span>
              </button>
              <button
                onClick={handleDisconnectCalendar}
                className="flex items-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold rounded-lg text-xs transition-all cursor-pointer light-theme:bg-zinc-100 light-theme:text-zinc-500"
              >
                <Unlink className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleConnectCalendar}
              className="flex items-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Connect Calendar</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid split: Schedule list & Add Task form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Schedule List */}
        <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 light-theme:bg-white light-theme:border-zinc-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider light-theme:text-zinc-800">Scheduled Tasks</h3>
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold">
                <Clock className="h-4 w-4" />
                <span>{completedHours.toFixed(1)} / {plannedHours.toFixed(1)} Hours Studied</span>
              </div>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer light-theme:bg-zinc-100 light-theme:text-zinc-650 light-theme:hover:bg-zinc-200 light-theme:hover:text-zinc-900"
            >
              <Plus className="h-4 w-4" />
              <span>Add Custom Task</span>
            </button>
          </div>

          {loading ? (
            <div className="py-20 text-center text-zinc-500 flex flex-col items-center">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
              <span>Scanning study slots...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 space-y-2 border border-dashed border-zinc-800 rounded-xl">
              <CalendarIcon className="h-10 w-10 text-zinc-700 mx-auto" />
              <p className="text-white font-semibold text-sm">No tasks planned for this date</p>
              <p className="text-xs max-w-xs mx-auto">Click &quot;AI Generate&quot; above to let the mentor plan this day based on your syllabus queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    task.is_completed
                      ? 'bg-zinc-950/40 border-zinc-900 text-zinc-500 light-theme:bg-zinc-50 light-theme:border-zinc-200'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 light-theme:bg-zinc-50 light-theme:border-zinc-200 light-theme:hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => !task.is_completed && handleCompleteTask(task.id, task.duration_minutes)}
                      className={`h-5 w-5 rounded-md flex items-center justify-center transition-all ${
                        task.is_completed
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                          : 'border border-zinc-700 hover:border-indigo-500 cursor-pointer'
                      }`}
                    >
                      {task.is_completed && <CheckCircle className="h-4 w-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-semibold ${task.is_completed ? 'line-through light-theme:text-zinc-400' : 'text-white light-theme:text-zinc-800'}`}>
                          {task.title}
                        </h4>
                        {task.is_ai_generated && (
                          <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" /> AI
                          </span>
                        )}
                        {task.google_event_id && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <CalendarCheck className="h-2.5 w-2.5" /> Synced
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                        <span className="font-semibold">{task.task_type_display}</span>
                        <span>•</span>
                        <span>{task.duration_minutes} mins</span>
                        <span>•</span>
                        <span>{task.subject_name || 'General'}</span>
                        {task.scheduled_time && (
                          <>
                            <span>•</span>
                            <span>{task.scheduled_time.slice(0, 5)}</span>
                          </>
                        )}
                      </div>
                      {task.ai_reason && (
                        <p className="text-[9px] text-zinc-600 mt-0.5 italic">{task.ai_reason}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Form */}
        {showAddForm && (
          <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit space-y-6 light-theme:bg-white light-theme:border-zinc-200">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans light-theme:text-zinc-800">Add Custom Task</h3>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Solve Business Law Mock papers"
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-indigo-500 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-800"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                  Task Type
                </label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-800"
                >
                  {TASK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                  Course Subject Link
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-800"
                >
                  <option value="">Select Subject (Optional)</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid: Duration, Priority, Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                    Duration (Min)
                  </label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-800"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                    Time (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-800"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Notes on what you need to review..."
                  rows={2}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-800"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Create Assignment</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
