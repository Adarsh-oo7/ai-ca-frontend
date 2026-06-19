'use client';

import React from 'react';
import {
  ClipboardCheck,
  Award,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Flame
} from 'lucide-react';
import { CurriculumService } from '@/services/curriculum.service';
import { AssessmentService } from '@/services/assessment.service';

export default function MCQPage() {
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [chapters, setChapters] = React.useState<any[]>([]);
  const [topics, setTopics] = React.useState<any[]>([]);
  
  // Selection state
  const [selectedSubject, setSelectedSubject] = React.useState('');
  const [selectedChapter, setSelectedChapter] = React.useState('');
  const [selectedTopic, setSelectedTopic] = React.useState('');
  const [difficulty, setDifficulty] = React.useState('medium');
  const [count, setCount] = React.useState(5);
  
  // Drill execution state
  const [practiceTest, setPracticeTest] = React.useState<any>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [activeQuestionIdx, setActiveQuestionIdx] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [results, setResults] = React.useState<any>(null);
  const [reviewData, setReviewData] = React.useState<any[]>([]);
  
  const [loadingCurriculum, setLoadingCurriculum] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => {
    async function loadInitial() {
      try {
        const subs = await CurriculumService.getSubjects();
        setSubjects(Array.isArray(subs) ? subs : subs.results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCurriculum(false);
      }
    }
    loadInitial();
  }, []);

  const handleSubjectChange = async (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedChapter('');
    setSelectedTopic('');
    setChapters([]);
    setTopics([]);
    if (!subjectId) return;

    try {
      const chaps = await CurriculumService.getChapters(subjectId);
      setChapters(Array.isArray(chaps) ? chaps : chaps.results || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChapterChange = async (chapterId: string) => {
    setSelectedChapter(chapterId);
    setSelectedTopic('');
    setTopics([]);
    if (!chapterId) return;

    try {
      const topList = await CurriculumService.getTopics(chapterId);
      setTopics(Array.isArray(topList) ? topList : topList.results || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGeneratePractice = async () => {
    if (!selectedTopic) return;
    setGenerating(true);
    setResults(null);
    setAnswers({});
    setActiveQuestionIdx(0);

    try {
      const test = await AssessmentService.generatePracticeTest(selectedTopic, difficulty, count);
      setPracticeTest(test);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const selectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmitPractice = async () => {
    if (!practiceTest || submitting) return;
    setSubmitting(true);

    try {
      // 1. Start test to get result_id
      const startRes = await AssessmentService.startTest(practiceTest.id);
      const resultId = startRes.id;

      // 2. Submit responses
      const submitRes = await AssessmentService.submitTest(practiceTest.id, resultId, answers);
      setResults(submitRes);

      // 3. Fetch review responses with correct answers
      const reviewRes = await AssessmentService.getMockResultReview(resultId);
      setReviewData(reviewRes.review || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCurriculum) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Loading practice setups...</span>
      </div>
    );
  }

  const activeQuestions = practiceTest?.questions || [];
  const activeQuestion = activeQuestions[activeQuestionIdx];

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-black text-white">AI MCQ Practice</h2>
        <p className="text-zinc-500 text-sm">Generate custom multi-level multiple choice questions on any topic to audit your understanding.</p>
      </div>

      {/* RENDER results screen if evaluated */}
      {results ? (
        <div className="space-y-8">
          {/* Dashboard aggregate */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Correct answers</span>
              <span className="text-white text-3xl font-black block mt-2">{results.correct_count} / {practiceTest.total_questions}</span>
            </div>
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Accuracy percentage</span>
              <span className="text-white text-3xl font-black block mt-2">{results.accuracy_percentage}%</span>
            </div>
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Final Score</span>
              <span className="text-white text-3xl font-black block mt-2">{results.score} Marks</span>
            </div>
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Readiness Boost</span>
              <span className={`text-3xl font-black block mt-2 ${results.readiness_impact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {results.readiness_impact >= 0 ? `+${results.readiness_impact}` : results.readiness_impact}%
              </span>
            </div>
          </div>

          {/* Mentor feedback */}
          <div className="p-6 bg-indigo-600/10 border border-indigo-600/20 rounded-2xl">
            <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5" />
              <span>Mentor Assessment Analysis</span>
            </h4>
            <p className="text-indigo-300 text-xs leading-relaxed italic">
              "{results.ai_feedback}"
            </p>
          </div>

          {/* Question Review index */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Review Practice Sheet</h3>
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
                              ? 'border-emerald-500 bg-emerald-500/10 text-white light-theme:text-emerald-950 light-theme:bg-emerald-50 light-theme:border-emerald-300'
                              : isSelected
                              ? 'border-red-500 bg-red-500/10 text-white light-theme:text-red-950 light-theme:bg-red-50 light-theme:border-red-300'
                              : 'border-zinc-850 bg-zinc-950 text-zinc-400 light-theme:border-zinc-200 light-theme:bg-white light-theme:text-zinc-700'
                          }`}
                        >
                          <span className="mr-2 font-bold uppercase">{key}:</span>
                          <span>{val}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation card */}
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <h5 className="text-[10px] text-zinc-500 font-bold uppercase">Explanation:</h5>
                    <p className="text-zinc-300 text-xs leading-relaxed">{item.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setResults(null)}
            className="py-2.5 px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Start Another Session
          </button>
        </div>
      ) : practiceTest ? (
        /* PRACTICE EXAM HUD */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Active Question sheet */}
          <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                Question {activeQuestionIdx + 1} of {activeQuestions.length}
              </span>
              <span className="text-xs px-2.5 py-1 bg-zinc-800 rounded-lg text-indigo-400 font-bold">
                {practiceTest.title}
              </span>
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
                            ? 'border-indigo-500 bg-indigo-500/10 text-white light-theme:text-indigo-950 light-theme:bg-indigo-50 light-theme:border-indigo-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-700 light-theme:hover:text-indigo-650 light-theme:hover:border-indigo-300'
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

            {/* Bottom Actions navigation */}
            <div className="flex gap-4 pt-6 border-t border-zinc-800 justify-between light-theme:border-zinc-200">
              <button
                onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                disabled={activeQuestionIdx === 0}
                className="py-2.5 px-4 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-650 light-theme:hover:text-indigo-600 light-theme:hover:bg-zinc-50"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous Question</span>
              </button>

              {activeQuestionIdx < activeQuestions.length - 1 ? (
                <button
                  onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                  className="py-2.5 px-4 bg-zinc-850 hover:bg-zinc-855 border border-zinc-800 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-700 light-theme:hover:text-indigo-600 light-theme:hover:bg-zinc-50"
                >
                  <span>Next Question</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitPractice}
                  disabled={submitting}
                  className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                      <span>Grading Sheet...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4.5 w-4.5" />
                      <span>Submit Practice Test</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Question navigation map panel */}
          <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit space-y-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Question navigator</h3>
            <div className="grid grid-cols-5 gap-2">
              {activeQuestions.map((q: any, idx: number) => {
                const isSelected = answers[q.id] !== undefined;
                const isActive = activeQuestionIdx === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIdx(idx)}
                    className={`h-10 w-10 rounded-lg text-xs font-black flex items-center justify-center border transition-all cursor-pointer ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-500/10 text-white light-theme:text-indigo-950 light-theme:bg-indigo-50 light-theme:border-indigo-300'
                        : isSelected
                        ? 'border-zinc-700 bg-zinc-800 text-zinc-300 light-theme:border-zinc-300 light-theme:bg-zinc-200 light-theme:text-zinc-800'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-white light-theme:border-zinc-200 light-theme:bg-white light-theme:text-zinc-400 light-theme:hover:text-indigo-650'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        /* SELECTION FORM */
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-xl space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure Practice Drill</h3>
          </div>

          <div className="space-y-4">
            {/* Subject Select */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Course Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-955 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-900"
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter Select */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => handleChapterChange(e.target.value)}
                disabled={!selectedSubject}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-900"
              >
                <option value="">Select Chapter</option>
                {chapters.map((chap) => (
                  <option key={chap.id} value={chap.id}>
                    {chap.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Select */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                disabled={!selectedChapter}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-900"
              >
                <option value="">Select Topic</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Grid: Difficulty & Question count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-900"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                  Question count
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-900"
                >
                  <option value="5">5 Questions</option>
                  <option value="10">10 Questions</option>
                  <option value="15">15 Questions</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleGeneratePractice}
              disabled={!selectedTopic || generating}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/10"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Curating Practice Sheet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>Generate AI Practice Set</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
