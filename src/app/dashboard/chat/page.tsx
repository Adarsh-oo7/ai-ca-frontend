'use client';

import React from 'react';
import {
  Send,
  MessageSquare,
  Sparkles,
  BookOpen,
  Mic,
  MicOff,
  Info,
  RefreshCw,
  Volume2,
  VolumeX,
  PlusCircle,
  Trash2,
  History,
  GraduationCap
} from 'lucide-react';
import { AIService } from '@/services/ai.service';
import { CurriculumService } from '@/services/curriculum.service';
import { AuthService } from '@/services/auth.service';

interface Message {
  id: string;
  sender: 'student' | 'mentor';
  text: string;
  timestamp: Date;
  citations?: Citation[];
}

interface ChatSessionItem {
  id: string;
  title: string;
  session_type: string;
  session_type_display: string;
  message_count: number;
  subject_name?: string;
  topic_name?: string;
  created_at: string;
  updated_at: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
}

interface Subject {
  id: string;
  name: string;
}

interface Citation {
  source_num: number | string;
  page?: number | string;
  title?: string;
  doc_type?: string;
  score: number;
}

interface ChatHistoryLog {
  id: string | number;
  user_message: string;
  ai_response: string;
  created_at?: string;
  citations?: Citation[];
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

const generateUniqueId = (prefix: string) => {
  return `${prefix}_${new Date().getTime()}_${Math.floor(Math.random() * 1000000)}`;
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
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = React.useState<string>('');
  
  const [sending, setSending] = React.useState(false);
  const sendingRef = React.useRef(false);
  const [activeCitations, setActiveCitations] = React.useState<Citation[]>([]);
  const [userLanguage, setUserLanguage] = React.useState<string>('en');
  const [showCitationsMobile, setShowCitationsMobile] = React.useState(false);
  
  // Voice states
  const [isRecording, setIsRecording] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  
  // Session states
  const [sessionId, setSessionId] = React.useState<string>('');
  const [chatSessions, setChatSessions] = React.useState<ChatSessionItem[]>([]);
  const [showSidebar, setShowSidebar] = React.useState(false);
  const [loadingSessions, setLoadingSessions] = React.useState(false);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);
  const speechQueueRef = React.useRef<SpeechSynthesisUtterance[]>([]);
  const isSpeakingRef = React.useRef(false);
  const submitVoiceQueryRef = React.useRef<((queryText: string) => Promise<void>) | null>(null);

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
        activeSessionId = generateUniqueId('chat');
        localStorage.setItem('ai_chat_session_id', activeSessionId);
      }
      setTimeout(() => {
        setSessionId(activeSessionId);
      }, 0);
    }
  }, []);

  // Load chat sessions for sidebar
  const loadChatSessions = React.useCallback(async () => {
    setLoadingSessions(true);
    try {
      const sessions = await AIService.getChatSessions();
      setChatSessions(Array.isArray(sessions) ? sessions : sessions.results || []);
    } catch (err) {
      console.error("Failed to load chat sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadChatSessions();
  }, [loadChatSessions]);

  // Fetch chat history once session ID is loaded
  React.useEffect(() => {
    if (!sessionId) return;
    async function loadChatHistory() {
      try {
        const history = await AIService.getChatHistory(sessionId);
        if (history && history.length > 0) {
          const formattedMsgs = history.map((log: ChatHistoryLog) => [
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
        } else {
          // No history for this session, show welcome message
          setMessages([
            {
              id: 'welcome',
              sender: 'mentor',
              text: "Hello! I am your personal CA Foundation AI mentor. Ask me anything about Accounting, Business Laws, Math/Stats, or Economics, and I will search your ICAI library to give you precise answers with citations. You can also click the Mic icon to speak to me!",
              timestamp: new Date()
            }
          ]);
          setActiveCitations([]);
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
      const SpeechRecognition = 
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition || 
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // Default

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        
        recognition.onerror = (event: { error: string }) => {
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

        recognition.onresult = async (event: { results: Array<Array<{ transcript: string }>> }) => {
          const text = event.results[0][0].transcript;
          if (!text.trim()) return;
          
          const containsMalayalam = /[\u0D00-\u0D7F]/.test(text);
          const processedText = containsMalayalam ? transliterateMalayalam(text) : text;
          
          setInput(processedText);
          await submitVoiceQueryRef.current?.(processedText);
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

  // ========== NATURAL SPEAKING ENGINE ==========
  const stopSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Stop any active speech
    stopSpeaking();
    
    // Clean text of markdown blocks, citations, and formatting
    let cleanText = text
      .replace(/\[Source \d+\]/g, '')         // Remove citation markers
      .replace(/\*\*(.*?)\*\*/g, '$1')        // Remove bold markers, keep text
      .replace(/#{1,6}\s*/g, '')              // Remove heading markers
      .replace(/[\*_~`]/g, '')                // Remove markdown formatting chars
      .replace(/\n{3,}/g, '\n\n')            // Collapse excessive newlines
      .replace(/^\s*[-\*]\s+/gm, '')          // Remove bullet markers
      .replace(/^\s*\d+\.\s+/gm, '')          // Remove numbered list markers
      .trim();
    
    if (!cleanText) return;

    const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    
    // Find best voice
    let selectedVoice: SpeechSynthesisVoice | null = null;
    let langToUse = 'en-IN';
    
    const containsMalayalam = /[\u0D00-\u0D7F]/.test(cleanText);
    
    if (containsMalayalam) {
      // Transliterate Malayalam to Manglish for English TTS
      cleanText = transliterateMalayalam(cleanText);
    }
    
    // Find en-IN voice (best for Indian English / Manglish pronunciation)
    const enInVoice = availableVoices.find(
      v => v.lang.toLowerCase() === 'en-in' || v.lang.toLowerCase().replace('_', '-').startsWith('en-in')
    );
    selectedVoice = enInVoice || availableVoices.find(v => v.lang.startsWith('en')) || null;
    langToUse = selectedVoice ? selectedVoice.lang : 'en-IN';

    // Split text into natural sentence chunks for smooth delivery
    // Split on sentence endings, but keep the punctuation
    const paragraphs = cleanText.split(/\n\n+/);
    const allChunks: { text: string; pauseAfter: number }[] = [];

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx].trim();
      if (!para) continue;

      // Split paragraph into sentences
      const sentences = para.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [para];
      
      for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
        const sentence = sentences[sIdx].trim();
        if (!sentence || sentence.length < 2) continue;

        // Break very long sentences into smaller chunks (at commas or semicolons)
        if (sentence.length > 150) {
          const subChunks = sentence.split(/[,;]\s+/);
          subChunks.forEach((chunk, cIdx) => {
            if (chunk.trim()) {
              allChunks.push({
                text: chunk.trim(),
                pauseAfter: cIdx < subChunks.length - 1 ? 200 : 350
              });
            }
          });
        } else {
          allChunks.push({
            text: sentence,
            pauseAfter: 350  // Natural pause between sentences
          });
        }
      }

      // Add longer pause between paragraphs
      if (pIdx < paragraphs.length - 1 && allChunks.length > 0) {
        allChunks[allChunks.length - 1].pauseAfter = 600;
      }
    }

    if (allChunks.length === 0) return;

    isSpeakingRef.current = true;

    // Speak chunks sequentially with natural pauses
    const speakNextChunk = (index: number) => {
      if (index >= allChunks.length || !isSpeakingRef.current) {
        isSpeakingRef.current = false;
        return;
      }

      const chunk = allChunks[index];
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.rate = 0.92;  // Slightly slower for clarity - teacher pace
      utterance.pitch = 1.05; // Slightly warmer tone
      utterance.volume = 1.0;
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.lang = langToUse;

      utterance.onend = () => {
        // Pause between chunks, then speak next
        setTimeout(() => {
          speakNextChunk(index + 1);
        }, chunk.pauseAfter);
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextChunk(0);
  };

  // ========== SESSION MANAGEMENT ==========
  const startNewChat = () => {
    stopSpeaking();
    const newSessionId = generateUniqueId('chat');
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
    // Refresh sessions list
    loadChatSessions();
  };

  const switchToSession = (targetSessionId: string) => {
    stopSpeaking();
    localStorage.setItem('ai_chat_session_id', targetSessionId);
    setSessionId(targetSessionId);
    setActiveCitations([]);
    setShowSidebar(false);
  };

  const deleteSession = async (targetSessionId: string) => {
    try {
      await AIService.deleteSession(targetSessionId);
      setChatSessions(prev => prev.filter(s => s.id !== targetSessionId));
      // If we deleted the active session, start a new one
      if (targetSessionId === sessionId) {
        startNewChat();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  // ========== MESSAGE HANDLING ==========
  const submitVoiceQuery = async (queryText: string) => {
    if (!queryText.trim() || sendingRef.current) return;

    setInput('');
    setSending(true);
    sendingRef.current = true;

    // Cancel speech on new query
    stopSpeaking();

    // Add user message to state
    const userMsgId = generateUniqueId('user');
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
        id: generateUniqueId('mentor'),
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

      // Voice readback with natural speaking
      speakText(response.ai_response);

      // Refresh sessions sidebar (title may have been auto-generated)
      loadChatSessions();
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: generateUniqueId('error'),
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

  React.useEffect(() => {
    submitVoiceQueryRef.current = submitVoiceQuery;
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const query = input;
    await submitVoiceQuery(query);
  };

  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 lg:gap-4 max-w-7xl w-full">
      
      {/* Left Pane: Chat Sessions Sidebar */}
      <div className={`${showSidebar ? 'fixed inset-0 z-50 lg:relative lg:inset-auto' : 'hidden lg:flex'} lg:w-72 flex flex-col flex-shrink-0`}>
        {/* Mobile overlay */}
        {showSidebar && (
          <div className="fixed inset-0 bg-black/60 lg:hidden z-40" onClick={() => setShowSidebar(false)} />
        )}
        
        <div className={`${showSidebar ? 'fixed left-0 top-0 bottom-0 w-80 z-50 lg:relative lg:w-full' : ''} bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-full overflow-hidden light-theme:bg-white light-theme:border-zinc-200`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between light-theme:bg-zinc-50 light-theme:border-zinc-200">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider light-theme:text-zinc-800">Chat History</h3>
            </div>
            <button
              onClick={startNewChat}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer"
              title="Start new chat"
            >
              <PlusCircle className="h-4 w-4" />
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingSessions ? (
              <div className="py-10 text-center text-zinc-500">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                <span className="text-xs">Loading sessions...</span>
              </div>
            ) : chatSessions.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 px-4">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 text-zinc-700 light-theme:text-zinc-300" />
                <p className="text-xs">No chat history yet</p>
                <p className="text-[10px] mt-1">Start a conversation to see it here</p>
              </div>
            ) : (
              chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all ${
                    session.id === sessionId
                      ? 'bg-indigo-600/15 border border-indigo-500/30 text-white'
                      : 'hover:bg-zinc-800/60 text-zinc-400 hover:text-white border border-transparent light-theme:hover:bg-zinc-100'
                  }`}
                  onClick={() => switchToSession(session.id)}
                >
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                    session.session_type === 'teaching' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {session.session_type === 'teaching' ? (
                      <GraduationCap className="h-3.5 w-3.5" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${
                      session.id === sessionId ? 'text-white light-theme:text-indigo-700' : 'light-theme:text-zinc-700'
                    }`}>
                      {session.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-zinc-500 light-theme:text-zinc-400">{session.message_count} msgs</span>
                      <span className="text-[9px] text-zinc-600">•</span>
                      <span className="text-[9px] text-zinc-500 light-theme:text-zinc-400">{formatSessionDate(session.updated_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 rounded transition-all cursor-pointer"
                    title="Delete session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Middle Pane: Chat Console */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-full overflow-hidden relative light-theme:bg-white light-theme:border-zinc-200">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 light-theme:bg-zinc-50 light-theme:border-zinc-200">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle for mobile */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer lg:hidden light-theme:bg-zinc-100 light-theme:text-zinc-500"
              title="Chat history"
            >
              <History className="h-4 w-4" />
            </button>
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
                stopSpeaking();
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
      <div className={`w-full lg:w-72 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col ${showCitationsMobile ? 'h-64 mt-2' : 'hidden lg:flex'} lg:h-full overflow-hidden light-theme:bg-white light-theme:border-zinc-200 flex-shrink-0`}>
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
