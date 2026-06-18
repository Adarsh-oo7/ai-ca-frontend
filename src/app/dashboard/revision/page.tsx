'use client';

import React from 'react';
import {
  Sparkles,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { RevisionService } from '@/services/revision.service';
import { AIService } from '@/services/ai.service';

const QUALITY_SCORES = [
  { value: 5, label: 'Perfect Recall!', color: 'bg-emerald-600 hover:bg-emerald-500' },
  { value: 4, label: 'Correct (Hesitation)', color: 'bg-teal-600 hover:bg-teal-500' },
  { value: 3, label: 'Correct (Difficult)', color: 'bg-indigo-600 hover:bg-indigo-500' },
  { value: 2, label: 'Wrong (Easy to recall)', color: 'bg-amber-600 hover:bg-amber-500' },
  { value: 1, label: 'Wrong (Hard to recall)', color: 'bg-orange-600 hover:bg-orange-500' },
  { value: 0, label: 'Complete Blackout', color: 'bg-red-600 hover:bg-red-500' },
];

export default function RevisionPage() {
  const [dueTasks, setDueTasks] = React.useState<any[]>([]);
  const [activeTaskIdx, setActiveTaskIdx] = React.useState(0);
  const [reveal, setReveal] = React.useState(false);
  
  // AI support guide state
  const [guideText, setGuideText] = React.useState('');
  const [loadingGuide, setLoadingGuide] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [loadingTasks, setLoadingTasks] = React.useState(true);

  const loadDueTasks = React.useCallback(async () => {
    try {
      const tasks = await RevisionService.getDueTasks();
      setDueTasks(Array.isArray(tasks) ? tasks : tasks.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  React.useEffect(() => {
    loadDueTasks();
  }, [loadDueTasks]);

  const handleRevealGuide = async (topicName: string, subjectName: string) => {
    setReveal(true);
    if (guideText || loadingGuide) return;
    setLoadingGuide(true);

    try {
      // Call AI Chat with a short revision guide prompt to refresh memory
      const response = await AIService.sendMessage(
        `Draft a concise active recall cheat sheet for the topic: ${topicName} (Subject: ${subjectName}). Include 3 bullet notes, 1 critical formula or section, and a simple exam-grade application example. Keep it short (max 100 words).`
      );
      setGuideText(response.ai_response);
    } catch (e) {
      console.error(e);
      setGuideText("Failed to retrieve revision guide. Try recalling details from your notes.");
    } finally {
      setLoadingGuide(false);
    }
  };

  const handleSubmitScore = async (score: number) => {
    if (submitting || dueTasks.length === 0) return;
    setSubmitting(true);

    const task = dueTasks[activeTaskIdx];

    try {
      await RevisionService.submitRecallScore(task.id, score, 5); // Default 5 mins spent
      setReveal(false);
      setGuideText('');
      
      // If we are on the last task, reload list, else increment index
      if (activeTaskIdx >= dueTasks.length - 1) {
        await loadDueTasks();
        setActiveTaskIdx(0);
      } else {
        setActiveTaskIdx(prev => prev + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTasks) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Scanning spaced repetition calendars...</span>
      </div>
    );
  }

  const activeTask = dueTasks[activeTaskIdx];

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-black text-white">Active Recall & Revision</h2>
        <p className="text-zinc-500 text-sm">Spaced repetition deck powered by the SM-2 algorithm. Evaluate your retention to schedule next dates.</p>
      </div>

      {dueTasks.length === 0 ? (
        <div className="py-20 text-center text-zinc-500 space-y-2 border border-dashed border-zinc-800 rounded-2xl max-w-2xl bg-zinc-900/40">
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
          <p className="text-white font-bold text-base">You are fully caught up for today!</p>
          <p className="text-xs max-w-xs mx-auto">No spaced repetition revisions are due today. Review your daily schedule tasks to plan ahead.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Revision Flashcard */}
          <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between min-h-[450px]">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                Revision card {activeTaskIdx + 1} of {dueTasks.length}
              </span>
              <span className="text-xs px-2.5 py-1 bg-zinc-850 rounded-lg text-amber-400 font-bold flex items-center gap-1">
                <ShieldAlert className="h-4 w-4" />
                <span>Due Today</span>
              </span>
            </div>

            {/* Flashcard Body */}
            {activeTask && (
              <div className="flex-1 py-8 flex flex-col justify-center text-center space-y-6">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                  {activeTask.subject_name} • {activeTask.chapter_name}
                </span>
                
                <h3 className="text-2xl font-black text-white max-w-xl mx-auto leading-normal">
                  {activeTask.title}
                </h3>

                {/* Reveal details */}
                {!reveal ? (
                  <button
                    onClick={() => handleRevealGuide(activeTask.title, activeTask.subject_name)}
                    className="mx-auto flex items-center gap-2 py-2.5 px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    <BookOpen className="h-4.5 w-4.5" />
                    <span>Reveal AI Study Guide & Recall</span>
                  </button>
                ) : (
                  <div className="max-w-xl mx-auto p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-left text-xs leading-relaxed space-y-3">
                    {loadingGuide ? (
                      <div className="flex items-center gap-2 text-zinc-500 py-4 justify-center">
                        <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                        <span>Querying study materials...</span>
                      </div>
                    ) : (
                      <>
                        <span className="block text-indigo-400 font-bold text-[10px] uppercase">AI Mentor Revision Sheet:</span>
                        <p className="text-zinc-300">{guideText}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recall Grade Options */}
            {reveal && !loadingGuide && (
              <div className="border-t border-zinc-800 pt-6 space-y-4">
                <h4 className="text-xs font-bold text-center text-zinc-400 uppercase tracking-wide">
                  Grade your recall quality:
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  {QUALITY_SCORES.map((score) => (
                    <button
                      key={score.value}
                      onClick={() => handleSubmitScore(score.value)}
                      disabled={submitting}
                      className={`py-3 px-2 rounded-xl text-[10px] font-bold text-white transition-all text-center flex flex-col justify-center items-center h-16 cursor-pointer ${score.color}`}
                    >
                      <span className="text-lg font-black">{score.value}</span>
                      <span className="leading-tight mt-1">{score.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Navigator list */}
          <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit space-y-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">Revision Queue</h3>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {dueTasks.map((t, idx) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setActiveTaskIdx(idx);
                    setReveal(false);
                    setGuideText('');
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    activeTaskIdx === idx
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-white'
                  }`}
                >
                  <h4 className="text-xs font-bold leading-tight">{t.title}</h4>
                  <span className="text-[9px] block mt-1 text-zinc-500">{t.subject_name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
