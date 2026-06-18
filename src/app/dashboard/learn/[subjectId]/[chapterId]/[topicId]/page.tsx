'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  GraduationCap,
  Sparkles,
  BookOpen,
  Send,
  RefreshCw,
  Award,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { AIService } from '@/services/ai.service';
import { CurriculumService } from '@/services/curriculum.service';

interface TeachMessage {
  id: string;
  sender: 'student' | 'mentor';
  text: string;
  timestamp: Date;
  citations?: any[];
}

export default function AITeacherPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;
  const topicId = params.topicId as string;

  const [topic, setTopic] = React.useState<any>(null);
  const [messages, setMessages] = React.useState<TeachMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [citations, setCitations] = React.useState<any[]>([]);
  const [conceptChecks, setConceptChecks] = React.useState<string[]>([]);
  
  const sessionIdRef = React.useRef<string>(`teach_${topicId}_${Date.now()}`);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial Load: Fetch topic and start teaching session
  React.useEffect(() => {
    async function initTeachingSession() {
      try {
        // Fetch topic details
        const topicList = await CurriculumService.getTopics(chapterId);
        const activeTopic = Array.isArray(topicList)
          ? topicList.find((t: any) => String(t.id) === topicId)
          : (topicList.results || []).find((t: any) => String(t.id) === topicId);
        
        setTopic(activeTopic);

        // Start session
        const response = await AIService.teachConcept(topicId, sessionIdRef.current);
        
        setMessages([
          {
            id: `teach_welcome_${Date.now()}`,
            sender: 'mentor',
            text: response.ai_response,
            timestamp: new Date(),
            citations: response.citations
          }
        ]);

        if (response.citations) {
          setCitations(response.citations);
        }

        // Search response for potential questions (usually ends with a check)
        extractConceptChecks(response.ai_response);

      } catch (e) {
        console.error("Error starting AI teaching session:", e);
      } finally {
        setLoading(false);
      }
    }
    initTeachingSession();
  }, [topicId, chapterId]);

  const extractConceptChecks = (text: string) => {
    // If the response contains verification indicators, parse them to show in the side drawer
    const lines = text.split('\n');
    const questions = lines.filter(line => line.includes('?') || line.toLowerCase().includes('true or false') || line.toLowerCase().includes('concept check:'));
    if (questions.length > 0) {
      setConceptChecks(questions.slice(-2)); // take last 2 questions
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const query = input;
    setInput('');
    setSending(true);

    // Add user response to chat
    setMessages(prev => [
      ...prev,
      {
        id: `student_${Date.now()}`,
        sender: 'student',
        text: query,
        timestamp: new Date()
      }
    ]);

    try {
      const response = await AIService.teachConcept(topicId, sessionIdRef.current, query);
      
      setMessages(prev => [
        ...prev,
        {
          id: `mentor_${Date.now()}`,
          sender: 'mentor',
          text: response.ai_response,
          timestamp: new Date(),
          citations: response.citations
        }
      ]);

      if (response.citations && response.citations.length > 0) {
        setCitations(response.citations);
      }

      extractConceptChecks(response.ai_response);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          sender: 'mentor',
          text: "My apologies, I encountered a communication slip while saving our study logs. Please retry.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Initializing personal AI classroom session...</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-8 max-w-6xl">
      
      {/* Middle Pane: Teaching Workspace */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/learn/${subjectId}`}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase leading-none">AI Study Desk</span>
              <h3 className="text-xs font-bold text-white leading-tight mt-0.5">{topic?.name}</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-[10px] font-bold">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Interactive Teach Mode</span>
          </div>
        </div>

        {/* Message logs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => {
            const isMentor = msg.sender === 'mentor';
            return (
              <div
                key={msg.id}
                className={`flex gap-4 max-w-[85%] ${isMentor ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {isMentor ? (
                  <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="h-8 w-8 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300 flex-shrink-0 font-bold text-xs uppercase">
                    Me
                  </div>
                )}

                <div className="space-y-2">
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isMentor
                      ? 'bg-zinc-950 text-zinc-100 border border-zinc-900'
                      : 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10'
                  }`}>
                    {msg.text}
                  </div>
                  <span className={`block text-[10px] text-zinc-600 ${isMentor ? '' : 'text-right'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex gap-4 max-w-[85%] mr-auto">
              <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="p-4 bg-zinc-950 text-zinc-400 border border-zinc-900 rounded-2xl text-sm flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Mentor is evaluating and outlining next steps...</span>
              </div>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSend} className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex items-center gap-3">
          <input
            type="text"
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your explanation or verify query here..."
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <button
            type="submit"
            disabled={sending}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

      </div>

      {/* Right Pane: Citations & Active checks */}
      <div className="w-80 flex flex-col gap-6 h-full">
        
        {/* Active Checks card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col max-h-[45%]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
            <HelpCircle className="h-4.5 w-4.5 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Active Checkpoint</h4>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {conceptChecks.length === 0 ? (
              <p className="text-zinc-500 text-[10px] leading-relaxed text-center py-6">
                No active checkpoints. Listen to the mentor's explanation first.
              </p>
            ) : (
              conceptChecks.map((q, idx) => (
                <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] text-zinc-300 leading-relaxed font-medium">
                  {q}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reference citations card */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
            <BookOpen className="h-4.5 w-4.5 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Syllabus References</h4>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {citations.length === 0 ? (
              <p className="text-zinc-500 text-[10px] text-center py-10">
                No syllabus reference docs cited for this explanation yet.
              </p>
            ) : (
              citations.map((cit, idx) => (
                <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      Ref [{cit.source_num}]
                    </span>
                    <span className="text-zinc-500 text-[9px]">Page {cit.page || 'N/A'}</span>
                  </div>
                  <h5 className="text-[10px] font-bold text-white leading-snug">{cit.title}</h5>
                  <p className="text-zinc-500 text-[9px] capitalize">{cit.doc_type}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
