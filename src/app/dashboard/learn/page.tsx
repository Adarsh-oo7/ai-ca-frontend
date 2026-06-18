'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  GraduationCap,
  Clock,
  Award,
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { CurriculumService } from '@/services/curriculum.service';
import { MemoryService } from '@/services/memory.service';

export default function LearnPage() {
  const router = useRouter();
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [memories, setMemories] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadSubjectsAndMemories() {
      try {
        const subs = await CurriculumService.getSubjects();
        const subjectsList = Array.isArray(subs) ? subs : subs.results || [];
        setSubjects(subjectsList);

        const mems = await MemoryService.getSubjectMemories();
        const memoriesMap: Record<string, any> = {};
        if (Array.isArray(mems)) {
          mems.forEach((m: any) => {
            memoriesMap[m.subject] = m;
          });
        }
        setMemories(memoriesMap);
      } catch (e) {
        console.error("Error loading curriculum details:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSubjectsAndMemories();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Loading CA Foundation papers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-black text-white">Study Workspace</h2>
        <p className="text-zinc-500 text-sm">Select a subject below to view chapters and start learning with your AI teacher.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjects.map((sub) => {
          const mem = memories[sub.id] || {};
          const strength = mem.strength_score !== undefined ? Math.round(mem.strength_score) : 50;
          const confidence = mem.confidence_score !== undefined ? Math.round(mem.confidence_score) : 50;
          const hours = mem.total_time_spent !== undefined ? roundToOne(mem.total_time_spent) : 0.0;
          const subjectColor = sub.color || '#6366f1';

          return (
            <div
              key={sub.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all flex flex-col justify-between group"
            >
              {/* Card Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider text-white" style={{ backgroundColor: `${subjectColor}20`, border: `1px solid ${subjectColor}40`, color: subjectColor }}>
                    {sub.code}
                  </span>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold">
                    <Clock className="h-4 w-4" />
                    <span>{hours}h Studied</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {sub.name}
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
                    {sub.description || 'Comprehensive CA Foundation curriculum reference.'}
                  </p>
                </div>
              </div>

              {/* Progress Gauges */}
              <div className="mt-8 space-y-4">
                {/* Strength slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Subject Strength</span>
                    <span className="text-white font-bold">{strength}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${strength}%` }} />
                  </div>
                </div>

                {/* Confidence slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Exam Confidence</span>
                    <span className="text-white font-bold">{confidence}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${confidence}%` }} />
                  </div>
                </div>

                {/* Enter Button */}
                <Link
                  href={`/dashboard/learn/${sub.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white font-bold rounded-xl text-xs transition-all mt-4 cursor-pointer"
                >
                  <span>Enter Subject Workspace</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function roundToOne(num: number) {
  return Math.round(num * 10) / 10;
}
