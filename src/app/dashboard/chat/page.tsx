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
  VolumeX,
  PlusCircle
} from 'lucide-react';
import { AIService } from '@/services/ai.service';
import { CurriculumService } from '@/services/curriculum.service';
import { AuthService } from '@/services/auth.service';

interface Message {
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
          <p key={`p-${index}`} className="text-zinc-100 leading-relaxed light-theme:text-zinc-800">
            {parseBoldText(line)}
          </p>
        );
      }
    }
  });

  flushList(`list-final`);
  return <div className="space-y-1.5">{elements}</div>;
};

const transliterateMalayalam = (text: string): string => {
  const consonants: { [key: string]: string } = {
    'ക': 'k', 'ഖ': 'kh', 'ഗ': 'g', 'ഘ': 'gh', 'ങ': 'ng',
    'ച': 'ch', 'ഛ': 'chh', 'ജ': 'j', 'ഝ': 'jh', 'ഞ': 'ny',
    'ട': 't', 'ഠ': 'th', 'ഡ': 'd', 'ഢ': 'dh', 'ണ': 'n',
    'ത': 'th', 'ഥ': 'thh', 'ദ': 'd', 'ധ': 'dh', 'ന': 'n',
    'പ': 'p', 'ഫ': 'ph', 'ബ': 'b', 'ഭ': 'bh', 'മ': 'm',
    'യ': 'y', 'ര': 'r', 'ല': 'l', 'വ': 'v', 'ശ': 'sh', 'ഷ': 'sh', 'സ': 's', 'ഹ': 'h',
    'ള': 'l', 'ഴ': 'zh', 'റ': 'r', 'റ്റ': 'tt'
  };

  const vowels: { [key: string]: string } = {
    'അ': 'a', 'ആ': 'aa', 'ഇ': 'i', 'ഈ': 'ee', 'ഉ': 'u', 'ഊ': 'oo', 'ഋ': 'ri',
    'എ': 'e', 'ഏ': 'ae', 'ഐ': 'ai', 'ഒ': 'o', 'ഓ': 'oa', 'ഔ': 'au'
  };

  const vowelSigns: { [key: string]: string } = {
    'ാ': 'aa', 'ി': 'i', 'ീ': 'ee', 'ു': 'u', 'ൂ': 'oo', 'ൃ': 'ri',
    'െ': 'e', 'േ': 'ae', 'ൈ': 'ai', 'ൊ': 'o', 'ോ': 'oa', 'ൌ': 'au'
  };

  const otherSigns: { [key: string]: string } = {
    'ൽ': 'l', 'ൻ': 'n', 'ർ': 'r', 'ൾ': 'l', 'ൺ': 'n', 'ം': 'm', 'ഃ': 'h'
  };

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (consonants[char] !== undefined) {
      const nextChar = text[i + 1];
      if (nextChar && vowelSigns[nextChar] !== undefined) {
        result += consonants[char] + vowelSigns[nextChar];
        i++; // skip next char
      } else if (nextChar === '്') {
        result += consonants[char];
        i++; // skip virama
      } else {
        result += consonants[char] + 'a';
      }
    } else if (vowels[char] !== undefined) {
      result += vowels[char];
    } else if (otherSigns[char] !== undefined) {
      result += otherSigns[char];
    } else if (vowelSigns[char] !== undefined) {
      result += vowelSigns[char];
    } else if (char === '്') {
      result += 'u';
    } else {
      result += char;
    }
  }
  return result;
};

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
  const sendingRef = React.useRef(false);
  const [activeCitations, setActiveCitations] = React.useState<any[]>([]);
  const [userLanguage, setUserLanguage] = React.useState<string>('en');
  const [showCitationsMobile, setShowCitationsMobile] = React.useState(false);
  
  // Voice states
  const [isRecording, setIsRecording] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = React.useState<string>('');
  const recognitionRef = React.useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load and keep track of speech synthesis voices asynchronously
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
      
      return () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      };
    }
  }, []);

  // Initialize session ID from localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      let activeSessionId = localStorage.getItem('ai_chat_session_id');
      if (!activeSessionId) {
        activeSessionId = `chat_${Date.now()}`;
        localStorage.setItem('ai_chat_session_id', activeSessionId);
      }
      setSessionId(activeSessionId);
    }
  }, []);

  // Fetch chat history once session ID is loaded
  React.useEffect(() => {
    if (!sessionId) return;
    async function loadChatHistory() {
      try {
        const history = await AIService.getChatHistory(sessionId);
        if (history && history.length > 0) {
          const formattedMsgs = history.map((log: any) => [
            {
              id: `user_${log.id}`,
              sender: 'student' as const,
              text: log.user_message,
              timestamp: new Date(log.created_at || Date.now())
            },
            {
              id: `mentor_${log.id}`,
              sender: 'mentor' as const,
              text: log.ai_response,
              timestamp: new Date(log.created_at || Date.now()),
              citations: log.citations || []
            }
          ]).flat();
          
          setMessages([
            {
              id: 'welcome',
              sender: 'mentor',
              text: "Hello! I am your personal CA Foundation AI mentor. Ask me anything about Accounting, Business Laws, Math/Stats, or Economics, and I will search your ICAI library to give you precise answers with citations. You can also click the Mic icon to speak to me!",
              timestamp: new Date(history[0].created_at || Date.now())
            },
            ...formattedMsgs
          ]);
          
          const lastLog = history[history.length - 1];
          if (lastLog && lastLog.citations && lastLog.citations.length > 0) {
            setActiveCitations(lastLog.citations);
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    }
    loadChatHistory();
  }, [sessionId]);

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

    async function loadProfile() {
      try {
        const profileData = await AuthService.getProfile();
        setUserLanguage(profileData.preferred_language || 'en');
      } catch (e) {
        console.error(e);
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
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          
          if (event.error === 'not-allowed') {
            alert("Microphone access is blocked. Please enable microphone permission in your browser settings to talk to the AI mentor.");
          } else if (event.error === 'no-speech') {
            alert("No speech was detected. Please try speaking again.");
          } else if (event.error === 'network') {
            alert("A network error occurred. Please check your internet connection.");
          }
        };

        recognition.onresult = async (event: any) => {
          const text = event.results[0][0].transcript;
          if (!text.trim()) return;
          
          const containsMalayalam = /[\u0D00-\u0D7F]/.test(text);
          const processedText = containsMalayalam ? transliterateMalayalam(text) : text;
          
          setInput(processedText);
          await submitVoiceQuery(processedText);
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
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech recognition start failed:", err);
      }
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Stop any active speech
    window.speechSynthesis.cancel();
    
    // Clean text of markdown blocks or brackets
    const cleanText = text.replace(/\[Source \d+\]/g, '').replace(/[\*#_]/g, '');
    
    const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    let selectedVoice = null;
    let textToSpeak = cleanText;
    let langToUse = 'en-IN';
    
    // Find Malayalam voice if present
    let mlVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith('ml'));
    if (!mlVoice) {
      mlVoice = availableVoices.find(
        v => v.name.toLowerCase().includes('malayalam') || v.name.includes('മലയാളം')
      );
    }

    const containsMalayalam = /[\u0D00-\u0D7F]/.test(cleanText);
    
    if (containsMalayalam && mlVoice) {
      selectedVoice = mlVoice;
      langToUse = mlVoice.lang;
      textToSpeak = cleanText;
    } else if (containsMalayalam && !mlVoice) {
      // Fallback: transliterate to Manglish and use en-IN voice
      const enInVoice = availableVoices.find(
        v => v.lang.toLowerCase() === 'en-in' || v.lang.toLowerCase().replace('_', '-').startsWith('en-in')
      );
      selectedVoice = enInVoice || null;
      langToUse = selectedVoice ? selectedVoice.lang : 'en-IN';
      textToSpeak = transliterateMalayalam(cleanText);
    } else {
      // English or Manglish text
      const enInVoice = availableVoices.find(
        v => v.lang.toLowerCase() === 'en-in' || v.lang.toLowerCase().replace('_', '-').startsWith('en-in')
      );
      selectedVoice = enInVoice || null;
      langToUse = selectedVoice ? selectedVoice.lang : 'en-IN';
      textToSpeak = cleanText;
    }
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.lang = langToUse;
    
    window.speechSynthesis.speak(utterance);
  };

  const startNewChat = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    const newSessionId = `chat_${Date.now()}`;
    localStorage.setItem('ai_chat_session_id', newSessionId);
    setSessionId(newSessionId);
    setMessages([
      {
        id: 'welcome',
        sender: 'mentor',
        text: "Hello! I am your personal CA Foundation AI mentor. Ask me anything about Accounting, Business Laws, Math/Stats, or Economics, and I will search your ICAI library to give you precise answers with citations. You can also click the Mic icon to speak to me!",
        timestamp: new Date()
      }
    ]);
    setActiveCitations([]);
  };

  const submitVoiceQuery = async (queryText: string) => {
    if (!queryText.trim() || sendingRef.current) return;

    setInput('');
    setSending(true);
    sendingRef.current = true;

    // Cancel speech on new query
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Add user message to state
    const userMsgId = `user_${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: 'student',
      text: queryText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await AIService.sendMessage(
        queryText,
        selectedSubject || undefined,
        undefined,
        sessionId
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
      sendingRef.current = false;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const query = input;
    await submitVoiceQuery(query);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 lg:gap-8 max-w-6xl w-full">
      
      {/* Middle Pane: Chat Console */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-full overflow-hidden relative light-theme:bg-white light-theme:border-zinc-200">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 light-theme:bg-zinc-50 light-theme:border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/10 rounded-lg text-indigo-400 light-theme:text-indigo-600 light-theme:bg-indigo-50">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-none light-theme:text-zinc-900">Mentor Office Hours</h3>
              <span className="text-[10px] text-zinc-500 font-medium light-theme:text-zinc-400">Ready to review ICAI Syllabus</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* New Chat Button */}
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-indigo-600/10"
              title="Start a new chat session"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">New Chat</span>
            </button>

            {/* Voice toggle */}
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
              className="p-2 bg-zinc-950 border border-zinc-855 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer light-theme:bg-zinc-100 light-theme:border-zinc-200 light-theme:text-zinc-650 light-theme:hover:bg-zinc-200 light-theme:hover:text-zinc-900 animate-none"
              title={voiceEnabled ? 'Mute AI readback' : 'Enable AI readback'}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4 text-indigo-400" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Citations toggle for mobile */}
            <button
              onClick={() => setShowCitationsMobile(!showCitationsMobile)}
              className={`p-2 border rounded-lg text-xs font-bold transition-colors cursor-pointer lg:hidden ${
                showCitationsMobile
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                  : 'bg-zinc-950 border-zinc-855 text-zinc-400 hover:text-white hover:bg-zinc-800 light-theme:bg-zinc-100 light-theme:border-zinc-200 light-theme:text-zinc-650 light-theme:hover:bg-zinc-200 light-theme:hover:text-zinc-900'
              }`}
              title="Toggle Citations"
            >
              <BookOpen className="h-4 w-4" />
            </button>

            {/* Subject Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 text-[10px] uppercase font-bold light-theme:text-zinc-400 hidden sm:inline">Focus Subject:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg py-1 px-2.5 text-[11px] text-white focus:outline-none focus:border-indigo-500 max-w-[120px] sm:max-w-none light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-800"
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
                  <div className="h-8 w-8 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300 flex-shrink-0 font-bold text-xs uppercase light-theme:bg-zinc-200 light-theme:text-zinc-750">
                    Me
                  </div>
                )}

                {/* Message Balloon */}
                <div className="space-y-2">
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isMentor
                      ? 'bg-zinc-950 text-zinc-100 border border-zinc-900 light-theme:bg-zinc-100 light-theme:text-zinc-800 light-theme:border-zinc-200'
                      : 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10'
                  }`}>
                    {renderFormattedText(msg.text)}
                  </div>

                  {/* Date & Citation markers */}
                  <div className={`flex items-center gap-3 text-[10px] text-zinc-500 light-theme:text-zinc-400 ${isMentor ? '' : 'justify-end'}`}>
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
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors light-theme:hover:bg-zinc-200 light-theme:text-zinc-500 light-theme:hover:text-zinc-900"
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
              <div className="p-4 bg-zinc-950 text-zinc-400 border border-zinc-900 rounded-2xl text-sm flex items-center gap-2 light-theme:bg-zinc-100 light-theme:text-zinc-600 light-theme:border-zinc-200">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Mentor is reviewing ICAI modules...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
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
            placeholder={isRecording ? "Listening to your voice..." : "Ask a question (e.g. What is the difference between provision and reserve?)"}
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-sm light-theme:bg-white light-theme:border-zinc-200 light-theme:text-zinc-900 light-theme:placeholder-zinc-400"
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
      <div className={`w-full lg:w-80 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col ${showCitationsMobile ? 'h-64 mt-2' : 'hidden lg:flex'} lg:h-full overflow-hidden light-theme:bg-white light-theme:border-zinc-200 flex-shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center gap-2.5 light-theme:bg-zinc-50 light-theme:border-zinc-200">
          <BookOpen className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider light-theme:text-zinc-800">Source Citations</h3>
        </div>

        {/* Citations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeCitations.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 space-y-2 px-4 light-theme:text-zinc-400">
              <Info className="h-8 w-8 text-zinc-700 mx-auto light-theme:text-zinc-300" />
              <p className="text-white font-semibold text-xs light-theme:text-zinc-700">No active citations</p>
              <p className="text-[10px]">Ask a curriculum query. Source pages from the ICAI Study Material will list here.</p>
            </div>
          ) : (
            activeCitations.map((cit, idx) => (
              <div
                key={idx}
                className="p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl space-y-2 transition-all light-theme:bg-zinc-50 light-theme:border-zinc-200"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                    Ref [{cit.source_num}]
                  </span>
                  <span className="text-zinc-500 text-[10px] light-theme:text-zinc-400">
                    Page {cit.page || 'N/A'}
                  </span>
                </div>
                
                <h4 className="text-xs font-bold text-white leading-tight light-theme:text-zinc-800">
                  {cit.title}
                </h4>
                
                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-900 light-theme:text-zinc-400 light-theme:border-zinc-200">
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
