'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Award,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Plus,
  Play
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AnalyticsService } from '@/services/analytics.service';
import { ScheduleService } from '@/services/schedule.service';
import { useRouter } from 'next/navigation';

export default function CommandCenter() {
  const router = useRouter();
  const [stats, setStats] = React.useState<any>(null);
  const [schedule, setSchedule] = React.useState<any>(null);
  const [loadingPlan, setLoadingPlan] = React.useState(false);
  const [loadingData, setLoadingData] = React.useState(true);

  const loadDashboardData = React.useCallback(async () => {
    try {
      const statsData = await AnalyticsService.getDashboardStats();
      setStats(statsData);
      
      const scheduleData = await ScheduleService.getTodaySchedule();
      setSchedule(scheduleData);
    } catch (e) {
      console.error("Error loading dashboard details:", e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    try {
      await ScheduleService.generateDailyPlan();
      await loadDashboardData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleCompleteTask = async (taskId: string, currentDuration: number) => {
    try {
      await ScheduleService.completeTask(taskId, currentDuration);
      await loadDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Syncing with personal AI mentor...</span>
      </div>
    );
  }

  const tasks = schedule?.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.is_completed);

  return (
    <div className="space-y-8 max-w-6xl">
      
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Pass Prob */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Pass Probability</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-white text-4xl font-black">{stats?.pass_probability || 50}%</span>
            <span className="text-emerald-400 text-xs font-bold font-mono">+{stats?.readiness_score ? Math.round(stats.readiness_score * 0.1) : 5}%</span>
          </div>
          <span className="text-zinc-500 text-[10px] mt-2">Adjusts based on mock test aggregate accuracy.</span>
        </div>

        {/* Study time today */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Today's Study time</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-white text-4xl font-black">{stats?.today_hours || 0}h</span>
            <span className="text-zinc-500 text-sm">/ {schedule?.hours_planned || 4}h planned</span>
          </div>
          <span className="text-zinc-500 text-[10px] mt-2">Hours logged on completed tasks.</span>
        </div>

        {/* Total studied hours */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total hours studied</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-white text-4xl font-black">{stats?.total_study_hours || 0}h</span>
          </div>
          <span className="text-zinc-500 text-[10px] mt-2">Aggregated across all subjects.</span>
        </div>

        {/* Streak */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between">
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Consistency streak</span>
          <div className="flex items-center gap-2 mt-4">
            <Flame className="h-8 w-8 text-amber-500 fill-amber-500/15" />
            <span className="text-white text-4xl font-black">{stats?.streak || 0} Days</span>
          </div>
          <span className="text-zinc-500 text-[10px] mt-2">Longest streak: {stats?.longest_streak || 0} days.</span>
        </div>

      </div>

      {/* Grid Layout: Today's tasks & AI feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Today's Checklist */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Today's Study Plan</h3>
              <p className="text-zinc-500 text-xs">Complete scheduled tasks to feed active memory.</p>
            </div>
            {tasks.length > 0 && (
              <span className="text-xs px-2.5 py-1 bg-zinc-800 rounded-lg text-zinc-400 font-mono">
                {completedTasks.length} / {tasks.length} Done
              </span>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center space-y-4">
              <Calendar className="h-12 w-12 text-zinc-600" />
              <div className="space-y-1">
                <p className="text-white font-semibold text-sm">No tasks scheduled for today</p>
                <p className="text-zinc-500 text-xs">Let the AI engine curate a personalized study path.</p>
              </div>
              <button
                onClick={handleGeneratePlan}
                disabled={loadingPlan}
                className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                {loadingPlan ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Curating Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Today's Plan</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    task.is_completed
                      ? 'bg-zinc-950/40 border-zinc-900 text-zinc-500'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
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
                      <h4 className={`text-sm font-semibold ${task.is_completed ? 'line-through' : 'text-white'}`}>
                        {task.title}
                      </h4>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {task.task_type_display} • {task.duration_minutes} mins • {task.subject_name || 'General'}
                      </p>
                    </div>
                  </div>

                  {!task.is_completed && task.topic && (
                    <button
                      onClick={() => router.push(`/dashboard/learn?topic=${task.topic}`)}
                      className="p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-indigo-400" />
                      <span>Start</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: AI Insights & Coaching */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Advisor Comments */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mentor Recommendations</h3>
            </div>
            
            <ul className="space-y-3">
              {stats?.recommendations?.map((rec: string, idx: number) => (
                <li key={idx} className="flex gap-2.5 items-start">
                  <span className="text-indigo-400 font-mono text-sm font-bold">{idx + 1}.</span>
                  <p className="text-zinc-300 text-xs leading-relaxed">{rec}</p>
                </li>
              )) || (
                <p className="text-zinc-500 text-xs">No notifications yet. Generating initial assessment metrics.</p>
              )}
            </ul>
          </div>

          {/* AI Focus quote */}
          {schedule?.ai_summary && (
            <div className="p-6 bg-indigo-600/10 border border-indigo-600/20 rounded-2xl">
              <p className="text-indigo-300 text-xs italic leading-relaxed">
                "{schedule.ai_summary}"
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Analytics Chart section */}
      {stats?.weekly_progress && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Study time analysis (last 7 days)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekly_progress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="planned_hours" name="Planned Hours" fill="#27272a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed_hours" name="Studied Hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
