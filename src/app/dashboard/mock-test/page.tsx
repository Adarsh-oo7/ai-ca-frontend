'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Clock,
  Award,
  AlertTriangle,
  Play,
  FileText,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { AssessmentService } from '@/services/assessment.service';

export default function MockTestLobbyPage() {
  const router = useRouter();
  const [tests, setTests] = React.useState<any[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadLobby() {
      try {
        const testsList = await AssessmentService.getMockTests();
        setTests(Array.isArray(testsList) ? testsList : testsList.results || []);

        const resultsList = await AssessmentService.getMockResults();
        setResults(Array.isArray(resultsList) ? resultsList : resultsList.results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLobby();
  }, []);

  const getCompletedResult = (testId: string) => {
    return results.find(r => r.test === testId);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Loading mock tests indexes...</span>
      </div>
    );
  }

  // Separate active tests from history quick tests
  const activeSyllabusTests = tests.filter(t => t.test_type !== 'quick');

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-black text-white">Exam Simulation Hall</h2>
        <p className="text-zinc-500 text-sm">Attempt subject-level or full CA Foundation syllabus tests. Simulates negative marking rules.</p>
      </div>

      {/* Grid: Syllabus Tests */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Available Mock Papers</h3>
        
        {activeSyllabusTests.length === 0 ? (
          <p className="text-zinc-500 text-xs py-8 text-center bg-zinc-900 border border-zinc-800 rounded-2xl">
            No published mock tests found. Create some in the admin panel to start.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeSyllabusTests.map((test) => {
              const res = getCompletedResult(test.id);
              return (
                <div
                  key={test.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 uppercase tracking-wide">
                        {test.test_type_display}
                      </span>
                      <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{test.duration_minutes} Mins</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {test.title}
                      </h4>
                      <p className="text-zinc-500 text-xs mt-1 leading-normal">
                        {test.description || 'Practice Mock test containing exam-grade questions.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-zinc-800 text-[10px] text-zinc-500">
                      <div>
                        <span className="block font-bold">Total Marks</span>
                        <span className="text-white font-bold">{test.total_marks}</span>
                      </div>
                      <div>
                        <span className="block font-bold">Questions</span>
                        <span className="text-white font-bold">{test.total_questions}</span>
                      </div>
                      <div>
                        <span className="block font-bold">Neg. Marking</span>
                        <span className="text-white font-bold">{test.negative_marking ? `Yes (${test.negative_mark_value})` : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    {res ? (
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <span className="text-zinc-500 font-medium">Last Score: </span>
                          <span className="text-white font-black">{res.score} / {test.total_marks} ({res.accuracy_percentage}%)</span>
                        </div>
                        <button
                          onClick={() => router.push(`/dashboard/mock-test/${test.id}?review=${res.id}`)}
                          className="py-2 px-4 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Review Attempt
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => router.push(`/dashboard/mock-test/${test.id}`)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" />
                        <span>Start Mock Test</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical results table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Historical Performance</h3>
        {results.length === 0 ? (
          <p className="text-zinc-500 text-xs py-4 text-center">No completed tests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-bold">
                  <th className="pb-3">Test Paper</th>
                  <th className="pb-3">Marks Scored</th>
                  <th className="pb-3">Accuracy</th>
                  <th className="pb-3">Date Completed</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {results.map((res) => (
                  <tr key={res.id} className="hover:bg-zinc-950/40 transition-colors">
                    <td className="py-3 font-semibold text-white">{res.test_title}</td>
                    <td className="py-3 font-mono">{res.score} / {res.total_marks}</td>
                    <td className="py-3">{res.accuracy_percentage}%</td>
                    <td className="py-3">{new Date(res.completed_at).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => router.push(`/dashboard/mock-test/${res.test}?review=${res.id}`)}
                        className="py-1 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
