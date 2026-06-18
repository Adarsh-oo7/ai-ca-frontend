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
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { AIService } from '@/services/ai.service';
import { CurriculumService } from '@/services/curriculum.service';
import { AuthService } from '@/services/auth.service';

interface TeachMessage {
  id: string;
  sender: 'student' | 'mentor';
  text: string;
  timestamp: Date;
  citations?: any[];
}

// Custom markdown formatter for structured response display
const renderFormattedText = (text: string) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = (key: string) => {
    if (currentList.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={key} className="list-decimal pl-5 my-2 space-y-1">
            {currentList}
          </ol>
        );
      } else {
        elements.push(
          <ul key={key} className="list-disc pl-5 my-2 space-y-1">
            {currentList}
          </ul>
        );
      }
      currentList = [];
    }
  };

  const parseBoldText = (lineText: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(lineText)) !== null) {
      const index = match.index;
      if (index > lastIndex) {
        parts.push(lineText.substring(lastIndex, index));
      }
      parts.push(
        <strong key={index} className="font-extrabold text-indigo-400 light-theme:text-indigo-600">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < lineText.length) {
      parts.push(lineText.substring(lastIndex));
    }

    return parts.length > 0 ? parts : lineText;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Match numbered list: e.g. "1. Item"
    const numListMatch = /^\d+\.\s+(.*)$/.exec(trimmed);
    // Match bullet list: e.g. "* Item" or "- Item"
    const bulletListMatch = /^[\*\-]\s+(.*)$/.exec(trimmed);

    if (numListMatch) {
      if (!isNumberedList) {
        flushList(`list-prev-${index}`);
        isNumberedList = true;
      }
      currentList.push(
        <li key={`li-${index}`} className="text-zinc-200 ml-1 light-theme:text-zinc-800">
          {parseBoldText(numListMatch[1])}
        </li>
      );
    } else if (bulletListMatch) {
      if (isNumberedList) {
        flushList(`list-prev-${index}`);
        isNumberedList = false;
      }
      currentList.push(
        <li key={`li-${index}`} className="text-zinc-200 ml-1 light-theme:text-zinc-800">
          {parseBoldText(bulletListMatch[1])}
        </li>
      );
    } else {
      flushList(`list-prev-${index}`);
      if (trimmed === '') {
        elements.push(<div key={`space-${index}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${index}`} className="text-zinc-100 leading-relaxed light-theme:text-zinc-850">
            {parseBoldText(line)}
          </p>
        );
      }
    }
  });

  flushList(`list-final`);
  return <div className="space-y-1.5">{elements}</div>;
};

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
  
  // Voice states
  const [isRecording, setIsRecording] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [userLanguage, setUserLanguage] = React.useState<string>('en');

  const sessionIdRef = React.useRef<string>(`teach_${topicId}_${Date.now()}`);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<any>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const profileData = await AuthService.getProfile();
        setUserLanguage(profileData.preferred_language || 'en');
      } catch (e) {
        console.error("Failed to load student profile language in classroom:", e);
      }
    }
    loadProfile();

    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // Default

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onerror = () => setIsRecording(false);
        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setInput(text);
        };
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Browser Speech Recognition is not supported on this browser. Try Chrome or Microsoft Edge!");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      // Set language dynamically based on user profile settings
      if (userLanguage === 'ml' || userLanguage === 'manglish') {
        recognitionRef.current.lang = 'ml-IN';
      } else {
        recognitionRef.current.lang = 'en-IN';
      }
      recognitionRef.current.start();
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Stop any active speech
    window.speechSynthesis.cancel();
    
    // Clean text of markdown blocks or brackets
    const cleanText = text.replace(/\[Source \d+\]/g, '').replace(/[\*#_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    
    if (userLanguage === 'ml') {
      selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith('ml'));
    } else if (userLanguage === 'manglish') {
      selectedVoice = voices.find(v => v.lang.toLowerCase() === 'en-in');
    } else {
      selectedVoice = voices.find(v => v.lang.toLowerCase() === 'en-in');
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

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

        // Auto-speak the first response
        speakText(response.ai_response);

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

    // Cancel speech on new query
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

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

      // Auto-speak the response
      speakText(response.ai_response);

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
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-full overflow-hidden light-theme:bg-white light-theme:border-zinc-200">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 light-theme:bg-zinc-50 light-theme:border-zinc-200">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/learn/${subjectId}`}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors light-theme:hover:bg-zinc-100 light-theme:text-zinc-500"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase leading-none light-theme:text-zinc-400">AI Study Desk</span>
              <h3 className="text-xs font-bold text-white leading-tight mt-0.5 light-theme:text-zinc-900">{topic?.name}</h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Voice toggle */}
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
              className="p-1.5 bg-zinc-950 border border-zinc-855 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer light-theme:bg-zinc-100 light-theme:border-zinc-200 light-theme:text-zinc-650 light-theme:hover:bg-zinc-200 light-theme:hover:text-zinc-900"
              title={voiceEnabled ? 'Mute AI readback' : 'Enable AI readback'}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4 text-indigo-400" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-[10px] font-bold">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Interactive Teach Mode</span>
            </div>
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
                  <div className="h-8 w-8 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300 flex-shrink-0 font-bold text-xs uppercase light-theme:bg-zinc-200 light-theme:text-zinc-700">
                    Me
                  </div>
                )}

                <div className="space-y-2">
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isMentor
                      ? 'bg-zinc-950 text-zinc-100 border border-zinc-900 light-theme:bg-zinc-100 light-theme:text-zinc-800 light-theme:border-zinc-200'
                      : 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10'
                  }`}>
                    {renderFormattedText(msg.text)}
                  </div>
                  <div className={`flex items-center gap-3 text-[10px] text-zinc-500 light-theme:text-zinc-400 ${isMentor ? '' : 'justify-end'}`}>
                    <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMentor && (
                      <button
                        onClick={() => speakText(msg.text)}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer light-theme:hover:bg-zinc-200 light-theme:text-zinc-500 light-theme:hover:text-zinc-900"
                        title="Read this message aloud"
                      >
                        <Volume2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex gap-4 max-w-[85%] mr-auto">
              <div className="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="p-4 bg-zinc-950 text-zinc-400 border border-zinc-900 rounded-2xl text-sm flex items-center gap-2 light-theme:bg-zinc-100 light-theme:text-zinc-650 light-theme:border-zinc-200">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Mentor is evaluating and outlining next steps...</span>
              </div>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSend} className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex items-center gap-3 light-theme:bg-zinc-50 light-theme:border-zinc-200">
          {/* Audio voice recognition trigger */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              isRecording
                ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 light-theme:bg-zinc-100 light-theme:border-zinc-200 light-theme:text-zinc-500 light-theme:hover:text-zinc-900 light-theme:hover:border-zinc-300'
            }`}
            title={isRecording ? 'Listening... click to stop' : 'Speak questions'}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <input
            type="text"
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Listening to your voice..." : "Type your explanation or verify query here..."}
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-900 light-theme:placeholder-zinc-400"
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col max-h-[45%] light-theme:bg-white light-theme:border-zinc-200">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800 light-theme:border-zinc-200">
            <HelpCircle className="h-4.5 w-4.5 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider light-theme:text-zinc-800">Active Checkpoint</h4>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {conceptChecks.length === 0 ? (
              <p className="text-zinc-500 text-[10px] leading-relaxed text-center py-6 light-theme:text-zinc-400">
                No active checkpoints. Listen to the mentor's explanation first.
              </p>
            ) : (
              conceptChecks.map((q, idx) => (
                <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] text-zinc-300 leading-relaxed font-medium light-theme:bg-zinc-50 light-theme:border-zinc-200 light-theme:text-zinc-750">
                  {q}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reference citations card */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col overflow-hidden light-theme:bg-white light-theme:border-zinc-200">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800 light-theme:border-zinc-200">
            <BookOpen className="h-4.5 w-4.5 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider light-theme:text-zinc-800">Syllabus References</h4>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {citations.length === 0 ? (
              <p className="text-zinc-500 text-[10px] text-center py-10 light-theme:text-zinc-400">
                No syllabus reference docs cited for this explanation yet.
              </p>
            ) : (
              citations.map((cit, idx) => (
                <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1 light-theme:bg-zinc-50 light-theme:border-zinc-200">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      Ref [{cit.source_num}]
                    </span>
                    <span className="text-zinc-500 text-[9px] light-theme:text-zinc-400">Page {cit.page || 'N/A'}</span>
                  </div>
                  <h5 className="text-[10px] font-bold text-white leading-snug light-theme:text-zinc-800">{cit.title}</h5>
                  <p className="text-zinc-500 text-[9px] capitalize light-theme:text-zinc-400">{cit.doc_type}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
