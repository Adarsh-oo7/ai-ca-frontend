'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import {
  LineChart as LineChartIcon,
  ShieldCheck,
  Flame,
  Award,
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Clock,
  CheckSquare,
  Smile
} from 'lucide-react';
import { AIService } from '@/services/ai.service';
import { AnalyticsService } from '@/services/analytics.service';

export default function AnalyticsPage() {
  const [predictions, setPredictions] = React.useState<any[]>([]);
  const [history, setHistory] = React.useState<any[]>([]);
  const [prevDay, setPrevDay] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadAnalytics() {
      try {
        const preds = await AIService.getPredictions();
        setPredictions(Array.isArray(preds) ? preds : preds.results || []);

        const hist = await AnalyticsService.getStudyHoursHistory();
        setHistory(hist);

        const prevDayData = await AnalyticsService.getPreviousDayActivities();
        setPrevDay(prevDayData);
      } catch (e) {
        console.error("Failed to load analytics: ", e);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Synthesizing historical study grids...</span>
      </div>
    );
  }

  const latestPred = predictions[0] || null;

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-black text-white">Analytics Command Console</h2>
        <p className="text-zinc-500 text-sm">Review aggregate exam readiness coefficients, pass statistics, and study time logs.</p>
      </div>

      {prevDay && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 light-theme:bg-white light-theme:border-zinc-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4 light-theme:border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 light-theme:bg-indigo-50 light-theme:text-indigo-600">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white light-theme:text-zinc-900">Yesterday's Action Report</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Performance timeline log for {new Date(prevDay.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              prevDay.is_present 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-zinc-800 text-zinc-500 border border-zinc-750 light-theme:bg-zinc-150 light-theme:text-zinc-500'
            }`}>
              {prevDay.is_present ? 'Checked In • Present' : 'Absent'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl hover:border-zinc-800 transition-all light-theme:bg-zinc-50 light-theme:border-zinc-200">
              <div className="flex items-center justify-between text-zinc-550 text-xs font-bold uppercase tracking-wider">
                <span>Hours Studied</span>
                <Clock className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white light-theme:text-zinc-900">{prevDay.hours_studied}h</span>
                {prevDay.check_in_time && (
                  <span className="text-[10px] text-zinc-500">({prevDay.check_in_time} - {prevDay.check_out_time || 'N/A'})</span>
                )}
              </div>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl hover:border-zinc-800 transition-all light-theme:bg-zinc-50 light-theme:border-zinc-200">
              <div className="flex items-center justify-between text-zinc-555 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                <span>Tasks Done</span>
                <CheckSquare className="h-4 w-4 text-purple-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-white light-theme:text-zinc-900">{prevDay.tasks_completed}</span>
                <span className="text-zinc-500 text-sm">/ {prevDay.tasks_total} planned</span>
              </div>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl hover:border-zinc-800 transition-all light-theme:bg-zinc-50 light-theme:border-zinc-200">
              <div className="flex items-center justify-between text-zinc-550 text-xs font-bold uppercase tracking-wider">
                <span>MCQ Accuracy</span>
                <Award className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-white light-theme:text-zinc-900">{prevDay.mcq_accuracy}%</span>
                <span className="text-zinc-500 text-sm">({prevDay.mcq_correct}/{prevDay.mcq_total})</span>
              </div>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl hover:border-zinc-800 transition-all light-theme:bg-zinc-50 light-theme:border-zinc-200">
              <div className="flex items-center justify-between text-zinc-550 text-xs font-bold uppercase tracking-wider">
                <span>Log State</span>
                <Smile className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2">
                {prevDay.check_in ? (
                  <div className="flex flex-col">
                    <span className="text-sm font-extrabold text-white light-theme:text-zinc-900">{prevDay.check_in.mood}</span>
                    <span className="text-[10px] text-zinc-500">Productivity: {prevDay.check_in.productivity_rating}/10</span>
                  </div>
                ) : (
                  <span className="text-zinc-500 text-xs italic">No check-in log</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4 light-theme:bg-zinc-50 light-theme:border-zinc-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white light-theme:text-zinc-900">AI Daily Mentorship Summary</h4>
              </div>
              
              {prevDay.ai_summary ? (
                <div className="space-y-4">
                  <p className="text-zinc-355 text-zinc-300 text-xs leading-relaxed light-theme:text-zinc-700 italic">
                    "{prevDay.ai_summary.summary_text}"
                  </p>
                  {prevDay.ai_summary.key_insights && prevDay.ai_summary.key_insights.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-zinc-900 light-theme:border-zinc-200">
                      <h5 className="text-[10px] font-bold text-white uppercase tracking-wider light-theme:text-zinc-900">Key Daily Insights</h5>
                      <ul className="space-y-1.5">
                        {prevDay.ai_summary.key_insights.map((insight: string, idx: number) => (
                          <li key={idx} className="text-[11px] text-zinc-400 flex items-start gap-1.5 light-theme:text-zinc-650">
                            <span className="text-indigo-400 mt-0.5">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-550 text-xs space-y-1.5">
                  <TrendingUp className="h-6 w-6 text-zinc-700 mx-auto" />
                  <p className="font-semibold text-white light-theme:text-zinc-700">No performance summaries generated</p>
                  <p className="text-[10px]">Study or check-in to see personalized Daily Mentor feedback.</p>
                </div>
              )}

              {prevDay.check_in && (
                <div className="pt-4 border-t border-zinc-900 space-y-3 light-theme:border-zinc-200">
                  {prevDay.check_in.notes && (
                    <div className="text-[11px]">
                      <span className="text-zinc-550 text-zinc-500 font-bold block">Student Log Notes:</span>
                      <span className="text-zinc-300 light-theme:text-zinc-700">{prevDay.check_in.notes}</span>
                    </div>
                  )}
                  
                  {prevDay.check_in.problems_faced && (
                    <div className="text-[11px] bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg">
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <AlertOctagon className="h-3 w-3" /> Problems Faced:
                      </span>
                      <p className="text-zinc-300 light-theme:text-zinc-600 mt-1">{prevDay.check_in.problems_faced}</p>
                    </div>
                  )}

                  {prevDay.check_in.ai_feedback && (
                    <div className="text-[11px] bg-indigo-950/20 border border-indigo-900/30 p-2.5 rounded-lg light-theme:bg-indigo-50/50 light-theme:border-indigo-100">
                      <span className="text-indigo-400 font-bold block light-theme:text-indigo-700">AI Check-in Feedback:</span>
                      <p className="text-zinc-300 light-theme:text-zinc-600 mt-1">{prevDay.check_in.ai_feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-zinc-950 border border-zinc-850 rounded-xl p-5 space-y-4 light-theme:bg-zinc-50 light-theme:border-zinc-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white light-theme:text-zinc-900">Task Completion Breakdown</h4>
              
              {prevDay.tasks && prevDay.tasks.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {prevDay.tasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      className={`p-3 border rounded-xl flex items-center justify-between gap-3 text-xs ${
                        task.is_completed 
                          ? 'bg-emerald-950/10 border-emerald-900/30 text-emerald-400 light-theme:bg-emerald-50 light-theme:border-emerald-100' 
                          : 'bg-zinc-900 border-zinc-850 text-zinc-400 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-600'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-white light-theme:text-zinc-900 block leading-tight">{task.title}</span>
                        <span className="text-[10px] text-zinc-500 font-medium block">
                          {task.task_type} • {task.duration_minutes}m duration
                          {task.actual_duration > 0 && ` (Actual: ${task.actual_duration}m)`}
                        </span>
                        {task.subject && (
                          <span className="inline-block text-[9px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-450 uppercase font-semibold mt-1 light-theme:bg-zinc-150 light-theme:text-zinc-600">
                            {task.subject}
                          </span>
                        )}
                      </div>

                      <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        task.status === 'completed' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : (task.status === 'skipped' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400')
                      }`}>
                        {task.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No study tasks were scheduled or logged for yesterday.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {latestPred && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Gauges & Factors */}
          <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Success Metrics</h3>
            
            {/* Core Readiness Scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Pass Probability</span>
                <span className="text-emerald-400 text-3xl font-black block mt-2">{latestPred.pass_probability}%</span>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Readiness Coefficient</span>
                <span className="text-indigo-400 text-3xl font-black block mt-2">{latestPred.readiness_score}%</span>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Risk factor</span>
                <span className={`text-3xl font-black block mt-2 ${
                  latestPred.risk_score > 60 ? 'text-red-400' : (latestPred.risk_score > 30 ? 'text-amber-400' : 'text-emerald-400')
                }`}>
                  {latestPred.risk_score}%
                </span>
              </div>
            </div>

            {/* Preparation Factors */}
            <div className="space-y-4 pt-4 border-t border-zinc-850">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Preparation Factor Breakdowns</h4>
              
              <div className="space-y-3">
                {/* Hours */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Study Hours Target Ratio</span>
                    <span className="text-white font-bold">{Math.round(latestPred.study_hours_factor * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${latestPred.study_hours_factor * 100}%` }} />
                  </div>
                </div>

                {/* Consistency */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Attendance Consistency Ratio</span>
                    <span className="text-white font-bold">{Math.round(latestPred.consistency_factor * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${latestPred.consistency_factor * 100}%` }} />
                  </div>
                </div>

                {/* Revision */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Revision Compliance Ratio</span>
                    <span className="text-white font-bold">{Math.round(latestPred.revision_factor * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{ width: `${latestPred.revision_factor * 100}%` }} />
                  </div>
                </div>

                {/* Test score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">MCQ Test Accuracy Ratio</span>
                    <span className="text-white font-bold">{Math.round(latestPred.test_score_factor * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${latestPred.test_score_factor * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right: AI recommendations */}
          <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Coaching Advice</h3>
            </div>

            <div className="space-y-4">
              {latestPred.recommendations.map((rec: string, idx: number) => (
                <div key={idx} className="p-3 bg-zinc-955 bg-zinc-950 border border-zinc-800 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span className="text-zinc-300 text-xs leading-normal">{rec}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Historical Hours Line Chart */}
      {history.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Studied Hours Timeline</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" tickFormatter={(str) => str.slice(5)} />
                <YAxis stroke="#71717a" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="hours_studied" name="Hours Studied" stroke="#6366f1" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
