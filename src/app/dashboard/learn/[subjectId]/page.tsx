'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Play,
  RefreshCw
} from 'lucide-react';
import { CurriculumService } from '@/services/curriculum.service';
import { MemoryService } from '@/services/memory.service';

interface Subject {
  id: string;
  name: string;
  code?: string;
  color?: string;
  description?: string;
}

interface Chapter {
  id: string;
  name: string;
  order: number;
  estimated_hours: number;
  weightage: number;
}

interface ChapterMemory {
  chapter: string;
  completion_percentage?: number;
  understanding_score?: number;
  forgetting_risk?: number;
}

interface Topic {
  id: string;
  name: string;
  estimated_minutes: number;
  importance_display: string;
}

export default function SubjectChaptersPage() {
  const params = useParams();
  const subjectId = params.subjectId as string;

  const [subject, setSubject] = React.useState<Subject | null>(null);
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [chapterMemories, setChapterMemories] = React.useState<Record<string, ChapterMemory>>({});
  const [topicsByChapter, setTopicsByChapter] = React.useState<Record<string, Topic[]>>({});
  const [expandedChapter, setExpandedChapter] = React.useState<string | null>(null);
  
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        // Fetch Subject details
        const sub = await CurriculumService.getSubjectDetails(subjectId);
        setSubject(sub);

        // Fetch Chapters list
        const chaps = await CurriculumService.getChapters(subjectId);
        const chaptersList: Chapter[] = Array.isArray(chaps) ? chaps : chaps.results || [];
        setChapters(chaptersList);

        // Fetch Chapter memories to map completion and forgetting risks
        const mems = await MemoryService.getChapterMemories();
        const memoriesList: ChapterMemory[] = Array.isArray(mems) ? mems : mems.results || [];
        const memoriesMap: Record<string, ChapterMemory> = {};
        memoriesList.forEach((m: ChapterMemory) => {
          memoriesMap[m.chapter] = m;
        });
        setChapterMemories(memoriesMap);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [subjectId]);

  const handleToggleExpand = async (chapterId: string) => {
    if (expandedChapter === chapterId) {
      setExpandedChapter(null);
      return;
    }

    setExpandedChapter(chapterId);

    // If topics are not loaded for this chapter yet, fetch them
    if (!topicsByChapter[chapterId]) {
      try {
        const topics = await CurriculumService.getTopics(chapterId);
        const topicsList: Topic[] = Array.isArray(topics) ? topics : topics.results || [];
        setTopicsByChapter(prev => ({
          ...prev,
          [chapterId]: topicsList
        }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Loading chapters and weightage tables...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Back button */}
      <Link href="/dashboard/learn" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-semibold">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Subjects</span>
      </Link>

      {/* Header info */}
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
        <h2 className="text-xl font-bold text-white mb-2">{subject?.name}</h2>
        <p className="text-zinc-500 text-xs max-w-2xl leading-relaxed">
          {subject?.description || 'Learn and review CA Foundation reference syllabus chapters and specific guidelines.'}
        </p>
      </div>

      {/* Chapters Accordion */}
      <div className="space-y-4">
        {chapters.map((chap) => {
          const isExpanded = expandedChapter === chap.id;
          const mem = chapterMemories[chap.id] || {};
          const completion = mem.completion_percentage !== undefined ? Math.round(mem.completion_percentage) : 0;
          const understanding = mem.understanding_score !== undefined ? Math.round(mem.understanding_score) : 0;
          const risk = mem.forgetting_risk !== undefined ? Math.round(mem.forgetting_risk) : 0;
          const topicsList = topicsByChapter[chap.id] || [];

          return (
            <div
              key={chap.id}
              className={`border rounded-2xl overflow-hidden transition-all ${
                isExpanded ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-800'
              }`}
            >
              {/* Accordion Row */}
              <div
                onClick={() => handleToggleExpand(chap.id)}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Chapter {chap.order + 1}</span>
                  <h4 className="text-sm font-bold text-white">{chap.name}</h4>
                  <div className="flex flex-wrap gap-4 text-[10px] text-zinc-500 pt-1">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {chap.estimated_hours}h Estimate</span>
                    <span className="flex items-center gap-1"><Award className="h-3 w-3" /> {chap.weightage} Marks Weightage</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Progress & Risk info */}
                  <div className="flex gap-6 text-right">
                    <div>
                      <span className="block text-zinc-500 text-[10px] uppercase font-bold">Understanding</span>
                      <span className="text-white text-xs font-bold">{understanding}%</span>
                    </div>
                    <div>
                      <span className="block text-zinc-500 text-[10px] uppercase font-bold">Progress</span>
                      <span className="text-white text-xs font-bold">{completion}%</span>
                    </div>
                    <div>
                      <span className="block text-zinc-500 text-[10px] uppercase font-bold">Forgetting Risk</span>
                      <span className={`text-xs font-bold ${
                        risk > 60 ? 'text-red-400' : (risk > 30 ? 'text-amber-400' : 'text-emerald-400')
                      }`}>
                        {risk > 0 ? `${risk}%` : 'Low'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle arrow */}
                  <div className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Accordion Content (Topics) */}
              {isExpanded && (
                <div className="border-t border-zinc-800 bg-zinc-950/40 p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Chapter Topics</h5>
                  </div>

                  {!topicsByChapter[chap.id] ? (
                    <div className="py-4 text-center text-zinc-500 flex justify-center items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                      <span className="text-xs">Scanning topic syllabus...</span>
                    </div>
                  ) : topicsList.length === 0 ? (
                    <p className="text-zinc-500 text-xs text-center py-4">No topics found inside this chapter.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {topicsList.map((topic) => (
                        <div
                          key={topic.id}
                          className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-between transition-colors"
                        >
                          <div>
                            <h6 className="text-xs font-bold text-white">{topic.name}</h6>
                            <p className="text-[10px] text-zinc-500 mt-1">
                              Est: {topic.estimated_minutes} mins • Importance: {topic.importance_display}
                            </p>
                          </div>

                          <Link
                            href={`/dashboard/learn/${subjectId}/${chap.id}/${topic.id}`}
                            className="p-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                          >
                            <Play className="h-3.5 w-3.5 fill-white" />
                            <span>Teach Me</span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}
