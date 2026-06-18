'use client';

import React from 'react';
import {
  Flame,
  Award,
  Sparkles,
  ClipboardCheck,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  Smile,
  Frown,
  Meh
} from 'lucide-react';
import { AccountabilityService } from '@/services/accountability.service';

const MOODS = [
  { value: 'great', emoji: '😊', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'bad', emoji: '😟', label: 'Bad' },
  { value: 'terrible', emoji: '😞', label: 'Terrible' },
];

export default function CheckinPage() {
  const [didStudy, setDidStudy] = React.useState(true);
  const [hours, setHours] = React.useState(4.0);
  const [mood, setMood] = React.useState<'great' | 'good' | 'okay' | 'bad' | 'terrible'>('okay');
  const [productivity, setProductivity] = React.useState(7);
  const [problems, setProblems] = React.useState('');
  const [notes, setNotes] = React.useState('');
  
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [todayCheckin, setTodayCheckin] = React.useState<any>(null);

  const loadCheckinHistory = React.useCallback(async () => {
    try {
      const history = await AccountabilityService.getCheckinHistory();
      const checkins = Array.isArray(history) ? history : history.results || [];
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecord = checkins.find((c: any) => c.date === todayStr);
      if (todayRecord) {
        setTodayCheckin(todayRecord);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCheckinHistory();
  }, [loadCheckinHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const res = await AccountabilityService.submitDailyCheckin({
        did_study: didStudy,
        hours_completed: didStudy ? hours : 0,
        problems_faced: problems,
        mood,
        productivity_rating: productivity,
        notes,
        date: todayStr
      });
      setTodayCheckin(res);
      await loadCheckinHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Loading daily accountability metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-black text-white">Daily Check-in</h2>
        <p className="text-zinc-500 text-sm">Log your study stats daily. Your AI mentor will review your focus areas and draft recovery strategies.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side Form / Completed Status */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {todayCheckin ? (
            <div className="space-y-6 py-8 text-center flex flex-col items-center justify-center">
              <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
                <ClipboardCheck className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Today's Check-in Complete!</h3>
                <p className="text-zinc-500 text-xs max-w-xs mx-auto">
                  You completed your review. Check your personal mentor feedback on the right panel.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm pt-6 border-t border-zinc-800 text-center">
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase font-bold">Hours Logged</span>
                  <span className="text-white font-black text-lg">{todayCheckin.hours_completed}h</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase font-bold">Productivity</span>
                  <span className="text-white font-black text-lg">{todayCheckin.productivity_rating}/10</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase font-bold">Mood Status</span>
                  <span className="text-white font-black text-lg">{todayCheckin.mood_display.split(' ')[0]}</span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Submit Daily Review</h3>
              </div>

              {/* Toggle Study */}
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-white">Did you study today?</h4>
                  <p className="text-zinc-500 text-[10px]">Toggling this maps consistency checkins.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDidStudy(!didStudy)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    didStudy
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {didStudy ? 'Yes, Studied' : 'No, Missed'}
                </button>
              </div>

              {/* Hours Completed */}
              {didStudy && (
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                    Study Hours Logged Today
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="14"
                      step="0.5"
                      value={hours}
                      onChange={(e) => setHours(parseFloat(e.target.value))}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-white font-bold text-sm px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg min-w-[65px] text-center">
                      {hours}h
                    </span>
                  </div>
                </div>
              )}

              {/* Mood buttons */}
              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                  How was your focus/mood today?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(m.value as any)}
                      className={`py-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                        mood === m.value
                          ? 'border-indigo-500 bg-indigo-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-955 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-lg">{m.emoji}</span>
                      <span className="text-[9px] font-bold uppercase">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Productivity rating */}
              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                  Productivity Rating
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={productivity}
                    onChange={(e) => setProductivity(parseInt(e.target.value))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="text-white font-bold text-sm px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg min-w-[50px] text-center">
                    {productivity}/10
                  </span>
                </div>
              </div>

              {/* Problems faced */}
              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                  Did you face any conceptual problems or blockers?
                </label>
                <textarea
                  value={problems}
                  onChange={(e) => setProblems(e.target.value)}
                  placeholder="e.g. Had difficulty understanding compound journal entries or quant ratios..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none animate-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                  Study Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="General notes on today's learning style or topics reviewed..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none animate-all"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/10"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Log...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Submit Daily Check-in</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Side AI Feedback */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Mentor feedback</h3>
          </div>

          {!todayCheckin ? (
            <p className="text-zinc-500 text-xs leading-relaxed text-center py-20 px-4">
              Submit your check-in on the left. Your AI mentor will review your focus parameters and post dynamic coaching suggestions here immediately.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Comment */}
              <div className="p-4 bg-indigo-600/10 border border-indigo-600/20 rounded-xl space-y-2">
                <span className="text-indigo-400 text-[10px] uppercase font-bold font-sans">Mentor Notes:</span>
                <p className="text-indigo-300 text-xs italic leading-relaxed">
                  "{todayCheckin.ai_feedback}"
                </p>
              </div>

              {/* Action list */}
              {todayCheckin.ai_suggestions && todayCheckin.ai_suggestions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">Suggested Adjustments:</h4>
                  <div className="space-y-2">
                    {todayCheckin.ai_suggestions.map((step: string, idx: number) => (
                      <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <span className="text-zinc-300 text-xs leading-normal">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
