'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  MessageSquare,
  Sparkles,
  BookOpen,
  Mic,
  MicOff,
  Info,
  ChevronRight,
  Smile,
  RefreshCw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { AIService } from '@/services/ai.service';
import { CurriculumService } from '@/services/curriculum.service';

interface Message {
  id: string;
  sender: 'student' | 'mentor';
  text: string;
  timestamp: Date;
  citations?: any[];
}

export default function ChatPage() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: 'welcome',
      sender: 'mentor',
      text: "Hello! I am your personal CA Foundation AI mentor. Ask me anything about Accounting, Business Laws, Math/Stats, or Economics, and I will search your ICAI library to give you precise answers with citations. You can also click the Mic icon to speak to me!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = React.useState('');
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = React.useState<string>('');
  
  const [sending, setSending] = React.useState(false);
  const [activeCitations, setActiveCitations] = React.useState<any[]>([]);
  
  // Voice states
  const [isRecording, setIsRecording] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const sessionIdRef = React.useRef<string>(`chat_${Date.now()}`);
  const recognitionRef = React.useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    async function loadSubjects() {
      try {
        const data = await CurriculumService.getSubjects();
        setSubjects(Array.isArray(data) ? data : data.results || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadSubjects();

    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // Optimized for Indian English accent

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
    window.speechSynthesis.speak(utterance);
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

    // Add user message to state
    const userMsgId = `user_${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: 'student',
      text: query,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await AIService.sendMessage(
        query,
        selectedSubject || undefined,
        undefined,
        sessionIdRef.current
      );

      const mentorMsg: Message = {
        id: `mentor_${Date.now()}`,
        sender: 'mentor',
        text: response.ai_response,
        timestamp: new Date(),
        citations: response.citations
      };

      setMessages(prev => [...prev, mentorMsg]);
      
      // Update active citations pane
      if (response.citations && response.citations.length > 0) {
        setActiveCitations(response.citations);
      }

      // Voice readback
      speakText(response.ai_response);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          sender: 'mentor',
          text: "Forgive me, I ran into an connection drop while searching the vector library. Please verify your internet and try again.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-8 max-w-6xl">
      
      {/* Middle Pane: Chat Console */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-full overflow-hidden relative">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/10 rounded-lg text-indigo-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Mentor Office Hours</h3>
              <span className="text-[10px] text-zinc-500 font-medium">Ready to review ICAI Syllabus</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Voice toggle */}
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
              className="p-2 bg-zinc-950 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title={voiceEnabled ? 'Mute AI readback' : 'Enable AI readback'}
            >
              {voiceEnabled ? <Volume2 className="h-4.5 w-4.5 text-indigo-400" /> : <VolumeX className="h-4.5 w-4.5" />}
            </button>

            {/* Subject Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[10px] uppercase font-bold">Focus Subject:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg py-1 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Message feed */}
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

                {/* Message Balloon */}
                <div className="space-y-2">
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isMentor
                      ? 'bg-zinc-950 text-zinc-100 border border-zinc-900'
                      : 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10'
                  }`}>
                    {msg.text}
                  </div>

                  {/* Date & Citation markers */}
                  <div className={`flex items-center gap-3 text-[10px] text-zinc-500 ${isMentor ? '' : 'justify-end'}`}>
                    <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    
                    {isMentor && (
                      <div className="flex gap-2">
                        {msg.citations && msg.citations.length > 0 && (
                          <button
                            onClick={() => setActiveCitations(msg.citations || [])}
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
                          >
                            <BookOpen className="h-3 w-3" />
                            <span>{msg.citations.length} References</span>
                          </button>
                        )}
                        <button
                          onClick={() => speakText(msg.text)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                          title="Read this message aloud"
                        >
                          <Volume2 className="h-3 w-3" />
                        </button>
                      </div>
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
              <div className="p-4 bg-zinc-950 text-zinc-400 border border-zinc-900 rounded-2xl text-sm flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Mentor is reviewing ICAI modules...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex items-center gap-3">
          {/* Audio voice recognition trigger */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              isRecording
                ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700'
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
            placeholder={isRecording ? "Listening to your voice..." : "Ask a question (e.g. What is the difference between provision and reserve?)"}
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm"
          />

          <button
            type="submit"
            disabled={sending}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

      </div>

      {/* Right Pane: Citations Sidebar */}
      <div className="w-80 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Source Citations</h3>
        </div>

        {/* Citations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeCitations.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 space-y-2 px-4">
              <Info className="h-8 w-8 text-zinc-700 mx-auto" />
              <p className="text-white font-semibold text-xs">No active citations</p>
              <p className="text-[10px]">Ask a curriculum query. Source pages from the ICAI Study Material will list here.</p>
            </div>
          ) : (
            activeCitations.map((cit, idx) => (
              <div
                key={idx}
                className="p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                    Ref [{cit.source_num}]
                  </span>
                  <span className="text-zinc-500 text-[10px]">
                    Page {cit.page || 'N/A'}
                  </span>
                </div>
                
                <h4 className="text-xs font-bold text-white leading-tight">
                  {cit.title}
                </h4>
                
                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">
                  <span>{cit.doc_type}</span>
                  <span className="font-mono text-indigo-400">
                    Match: {Math.round(cit.score * 100)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
