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
  CheckCircle2
} from 'lucide-react';
import { AIService } from '@/services/ai.service';
import { AnalyticsService } from '@/services/analytics.service';

export default function AnalyticsPage() {
  const [predictions, setPredictions] = React.useState<any[]>([]);
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadAnalytics() {
      try {
        const preds = await AIService.getPredictions();
        setPredictions(Array.isArray(preds) ? preds : preds.results || []);

        const hist = await AnalyticsService.getStudyHoursHistory();
        setHistory(hist);
      } catch (e) {
        console.error(e);
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
