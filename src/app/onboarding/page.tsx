'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowRight, ArrowLeft, Calendar, Flame, Check } from 'lucide-react';
import { AuthService } from '@/services/auth.service';

const EXAM_ATTEMPTS = [
  { value: 'may_2025', label: 'May 2025' },
  { value: 'nov_2025', label: 'November 2025' },
  { value: 'may_2026', label: 'May 2026' },
  { value: 'nov_2026', label: 'November 2026' },
  { value: 'may_2027', label: 'May 2027' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'manglish', label: 'Manglish' },
];

const STUDY_TIMES = [
  { value: 'early_morning', label: 'Early Morning (4-7 AM)' },
  { value: 'morning', label: 'Morning (7-10 AM)' },
  { value: 'afternoon', label: 'Afternoon (12-3 PM)' },
  { value: 'evening', label: 'Evening (4-7 PM)' },
  { value: 'night', label: 'Night (8-11 PM)' },
  { value: 'late_night', label: 'Late Night (11 PM - 2 AM)' },
];

const SUBJECTS = [
  { code: 'accounting', name: 'Paper 1: Accounting' },
  { code: 'business_laws', name: 'Paper 2: Business Laws' },
  { code: 'quantitative_aptitude', name: 'Paper 3: Quantitative Aptitude' },
  { code: 'business_economics', name: 'Paper 4: Business Economics' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState('');
  const [examAttempt, setExamAttempt] = React.useState('may_2026');
  const [dailyHours, setDailyHours] = React.useState(4.0);
  const [language, setLanguage] = React.useState('en');
  const [studyTime, setStudyTime] = React.useState('evening');
  const [strongSubjects, setStrongSubjects] = React.useState<string[]>([]);
  const [weakSubjects, setWeakSubjects] = React.useState<string[]>([]);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const toggleStrongSubject = (code: string) => {
    if (strongSubjects.includes(code)) {
      setStrongSubjects(strongSubjects.filter((c) => c !== code));
    } else {
      setStrongSubjects([...strongSubjects, code]);
      setWeakSubjects(weakSubjects.filter((c) => c !== code));
    }
  };

  const toggleWeakSubject = (code: string) => {
    if (weakSubjects.includes(code)) {
      setWeakSubjects(weakSubjects.filter((c) => c !== code));
    } else {
      setWeakSubjects([...weakSubjects, code]);
      setStrongSubjects(strongSubjects.filter((c) => c !== code));
    }
  };

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      setError('Please tell us your preferred name.');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    // Estimate exam date based on attempt selection
    let examDateStr = '2026-06-01';
    if (examAttempt.includes('may')) {
      const year = examAttempt.split('_')[1];
      examDateStr = `${year}-05-15`;
    } else {
      const year = examAttempt.split('_')[1];
      examDateStr = `${year}-11-15`;
    }

    try {
      await AuthService.completeOnboarding({
        preferred_name: name,
        exam_attempt: examAttempt,
        exam_date: examDateStr,
        daily_study_hours: dailyHours,
        preferred_language: language,
        preferred_study_time: studyTime,
        strong_subjects: strongSubjects,
        weak_subjects: weakSubjects,
        onboarding_completed: true
      });
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg glass p-8 rounded-2xl border border-zinc-800 shadow-2xl relative z-10">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
            Step {step} of 3
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full transition-all ${
                  s <= step ? 'bg-indigo-500' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        {/* STEP 1: Basic Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Let's set up your profile</h3>
              <p className="text-zinc-400 text-sm">Tell your AI mentor who you are and when you plan to clear CA Foundation.</p>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Preferred Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How should your mentor call you?"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Target Exam Attempt
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXAM_ATTEMPTS.map((attempt) => (
                  <button
                    key={attempt.value}
                    onClick={() => setExamAttempt(attempt.value)}
                    className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all text-left ${
                      examAttempt === attempt.value
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {attempt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Commitments */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Determine your schedule</h3>
              <p className="text-zinc-400 text-sm">How many hours can you commit daily, and what is your style?</p>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Daily Study Budget (Hours)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="0.5"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="text-white font-bold text-lg px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg min-w-[70px] text-center">
                  {dailyHours}h
                </span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Preferred Study block
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STUDY_TIMES.map((time) => (
                  <button
                    key={time.value}
                    onClick={() => setStudyTime(time.value)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all text-left ${
                      studyTime === time.value
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {time.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Preferred Explanation Language
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => setLanguage(lang.value)}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all text-center ${
                      language === lang.value
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Subjects */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Subject Familiarity</h3>
              <p className="text-zinc-400 text-sm">Select your strong and weak papers to optimize revision focus.</p>
            </div>

            <div className="space-y-4">
              {SUBJECTS.map((sub) => (
                <div key={sub.code} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <span className="text-white text-sm font-semibold">{sub.name}</span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleStrongSubject(sub.code)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        strongSubjects.includes(sub.code)
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-zinc-800 hover:text-white'
                      }`}
                    >
                      Strong
                    </button>
                    <button
                      onClick={() => toggleWeakSubject(sub.code)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        weakSubjects.includes(sub.code)
                          ? 'border-red-500 bg-red-500/10 text-red-400'
                          : 'border-zinc-800 hover:text-white'
                      }`}
                    >
                      Weak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-zinc-900">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer text-sm"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 text-sm"
            >
              <span>{loading ? 'Initializing Engine...' : 'Complete Setup'}</span>
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>

      </div>
    </main>
  );
}
