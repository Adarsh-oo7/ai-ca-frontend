'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Award,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { AssessmentService } from '@/services/assessment.service';

interface Question {
  id: string;
  question_text: string;
  options: Record<string, string>;
  order: number;
}

export default function MockTestRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const testId = params.testId as string;
  const reviewResultId = searchParams.get('review');
  const isReviewMode = !!reviewResultId;

  const [test, setTest] = React.useState<any>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [activeQuestionIdx, setActiveQuestionIdx] = React.useState(0);
  
  const [resultId, setResultId] = React.useState<string>('');
  const [timeLeft, setTimeLeft] = React.useState<number>(0); // Seconds
  
  // States
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [results, setResults] = React.useState<any>(null);
  const [reviewData, setReviewData] = React.useState<any[]>([]);

  // 1. Initial Load
  React.useEffect(() => {
    async function loadTestSession() {
      try {
        const testDetails = await AssessmentService.getMockTestDetails(testId);
        setTest(testDetails);
        setQuestions(testDetails.questions || []);

        if (isReviewMode) {
          // Fetch completed results review
          const reviewRes = await AssessmentService.getMockResultReview(reviewResultId as string);
          setResults(reviewRes.result);
          setReviewData(reviewRes.review || []);
        } else {
          // START TEST: posts to create Result session
          const startRes = await AssessmentService.startTest(testId);
          setResultId(startRes.id);
          setTimeLeft((testDetails.duration_minutes || 60) * 60);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadTestSession();
  }, [testId, isReviewMode, reviewResultId]);

  // 2. Timer Countdown Effect
  React.useEffect(() => {
    if (isReviewMode || timeLeft <= 0 || loading) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest(); // Auto submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isReviewMode, loading]);

  const selectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmitTest = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const submitRes = await AssessmentService.submitTest(testId, resultId, answers);
      // Redirect to review mode for this result session
      router.push(`/dashboard/mock-test/${testId}?review=${submitRes.id}`);
      
      // Force state update if already on this page
      setResults(submitRes);
      const reviewRes = await AssessmentService.getMockResultReview(submitRes.id);
      setReviewData(reviewRes.review || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Loading mock exam tables...</span>
      </div>
    );
  }

  const activeQuestion = questions[activeQuestionIdx];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Back button link */}
      <Link href="/dashboard/mock-test" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-semibold">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Lobby</span>
      </Link>

      {/* REVIEW MODE HUD */}
      {isReviewMode && results ? (
        <div className="space-y-8">
          <div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-wide">
              Attempt Reviewed
            </span>
            <h2 className="text-2xl font-black text-white mt-2">{test?.title}</h2>
          </div>

          {/* Core result counts */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Total Marks</span>
              <span className="text-white text-3xl font-black block mt-2">{results.score} / {results.total_marks}</span>
            </div>
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Accuracy Rate</span>
              <span className="text-white text-3xl font-black block mt-2">{results.accuracy_percentage}%</span>
            </div>
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Breakdown</span>
              <span className="text-emerald-400 font-bold text-sm block mt-2">Correct: {results.correct_count}</span>
              <span className="text-red-400 font-bold text-sm block mt-0.5">Incorrect: {results.incorrect_count}</span>
            </div>
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center flex flex-col justify-center">
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Pass Status</span>
              <span className={`text-xl font-bold mt-1 uppercase ${
                results.score >= test.passing_marks ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {results.score >= test.passing_marks ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          </div>

          {/* AI Coaching feed */}
          <div className="p-6 bg-indigo-600/10 border border-indigo-600/20 rounded-2xl space-y-4">
            <div>
              <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5" />
                <span>AI Mentor feedback</span>
              </h4>
              <p className="text-indigo-300 text-xs leading-relaxed italic mt-2">
                "{results.ai_feedback}"
              </p>
            </div>
            
            {results.weak_areas && results.weak_areas.length > 0 && (
              <div className="pt-3 border-t border-indigo-500/20 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-zinc-500 font-bold uppercase text-[10px]">Weak Areas:</span>
                  <span className="text-red-400 font-semibold">{results.weak_areas.join(', ')}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 font-bold uppercase text-[10px]">Strong Areas:</span>
                  <span className="text-emerald-400 font-semibold">{results.strong_areas.join(', ')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Question lists */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Answers Key Review</h3>
            <div className="space-y-4">
              {reviewData.map((item, idx) => (
                <div key={idx} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-xs font-bold uppercase">Question {idx + 1}</span>
                    <span className={`text-xs font-bold flex items-center gap-1 ${item.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.is_correct ? (
                        <>
                          <CheckCircle2 className="h-4.5 w-4.5" />
                          <span>Correct</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4.5 w-4.5" />
                          <span>Incorrect</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-white text-sm font-semibold">{item.question_text}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(item.options).map(([key, val]: any) => {
                      const isSelected = item.selected_answer === key;
                      const isCorrect = item.correct_answer === key;

                      return (
                        <div
                          key={key}
                          className={`p-3.5 rounded-xl border text-xs font-semibold ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-500/10 text-white'
                              : isSelected
                              ? 'border-red-500 bg-red-500/10 text-white'
                              : 'border-zinc-850 bg-zinc-950 text-zinc-400'
                          }`}
                        >
                          <span className="mr-2 font-bold uppercase">{key}:</span>
                          <span>{val}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <h5 className="text-[10px] text-zinc-500 font-bold uppercase">Explanation:</h5>
                    <p className="text-zinc-300 text-xs leading-relaxed">{item.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* LIVE EXAM MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Question sheet */}
          <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                Question {activeQuestionIdx + 1} of {questions.length}
              </span>
              <div className="flex items-center gap-2 text-indigo-400 text-sm font-black font-mono">
                <Clock className="h-5 w-5" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            </div>

            {activeQuestion && (
              <div className="space-y-6">
                <p className="text-white text-base font-bold leading-relaxed">
                  {activeQuestion.question_text}
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(activeQuestion.options).map(([key, val]: any) => {
                    const isSelected = answers[activeQuestion.id] === key;
                    return (
                      <button
                        key={key}
                        onClick={() => selectOption(activeQuestion.id, key)}
                        className={`w-full p-4 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10 text-white'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                      >
                        <span className="mr-3 font-bold uppercase">{key}:</span>
                        <span>{val}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex gap-4 pt-6 border-t border-zinc-800 justify-between">
              <button
                onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                disabled={activeQuestionIdx === 0}
                className="py-2.5 px-4 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              {activeQuestionIdx < questions.length - 1 ? (
                <button
                  onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                  className="py-2.5 px-4 bg-zinc-850 hover:bg-zinc-855 border border-zinc-800 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitTest}
                  disabled={submitting}
                  className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                      <span>Submitting Paper...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4.5 w-4.5" />
                      <span>Submit Exam Paper</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Navigator Panel */}
          <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit space-y-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Navigator Sheet</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isSelected = answers[q.id] !== undefined;
                const isActive = activeQuestionIdx === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIdx(idx)}
                    className={`h-10 w-10 rounded-lg text-xs font-black flex items-center justify-center border transition-all cursor-pointer ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : isSelected
                        ? 'border-zinc-700 bg-zinc-800 text-zinc-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-white'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            <div className="pt-4 border-t border-zinc-800 space-y-2 text-[10px] text-zinc-500">
              <div className="flex justify-between">
                <span>Completed Tasks</span>
                <span className="text-white font-bold">{Object.keys(answers).length} / {questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Negative Marking value</span>
                <span className="text-red-400 font-bold">{test?.negative_mark_value || 0.25} / error</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
