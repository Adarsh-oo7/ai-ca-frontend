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

  const sessionIdRef = React.useRef(sessionId);
  const selectedSubjectRef = React.useRef(selectedSubject);
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  React.useEffect(() => {
    selectedSubjectRef.current = selectedSubject;
  }, [selectedSubject]);

  // Live Voice Call States
  const [isLiveCallActive, setIsLiveCallActive] = React.useState(false);
  const [isLiveCallConnected, setIsLiveCallConnected] = React.useState(false);
  const [isLiveCallMuted, setIsLiveCallMuted] = React.useState(false);
  const [liveCallStatus, setLiveCallStatus] = React.useState('Connecting...');

  // Live Voice Call Refs
  const liveWsRef = React.useRef<WebSocket | null>(null);
  const liveAudioCtxRef = React.useRef<AudioContext | null>(null);
  const liveMediaStreamRef = React.useRef<MediaStream | null>(null);
  const liveProcessorRef = React.useRef<ScriptProcessorNode | null>(null);
  const liveSourcesRef = React.useRef<AudioBufferSourceNode[]>([]);
  const liveNextPlayTimeRef = React.useRef<number>(0);

  // Helper: Convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Helper: Stop active playbacks
  const stopLiveAudioPlayback = () => {
    liveSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch {}
    });
    liveSourcesRef.current = [];
    if (liveAudioCtxRef.current) {
      liveNextPlayTimeRef.current = liveAudioCtxRef.current.currentTime;
    }
  };

  // Helper: Clean up resources
  const cleanupLiveCall = () => {
    stopLiveAudioPlayback();
    
    if (liveProcessorRef.current) {
      try { liveProcessorRef.current.disconnect(); } catch {}
      liveProcessorRef.current = null;
    }
    
    if (liveMediaStreamRef.current) {
      liveMediaStreamRef.current.getTracks().forEach(track => track.stop());
      liveMediaStreamRef.current = null;
    }
    
    if (liveAudioCtxRef.current) {
      try { liveAudioCtxRef.current.close(); } catch {}
      liveAudioCtxRef.current = null;
    }
    
    if (liveWsRef.current) {
      try { liveWsRef.current.close(); } catch {}
      liveWsRef.current = null;
    }
    
    setIsLiveCallConnected(false);
  };

  const endLiveCall = () => {
    cleanupLiveCall();
    setIsLiveCallActive(false);
  };

  // Helper: Schedule PCM chunk playback
  const playLivePCMChunk = (base64Data: string) => {
    if (!liveAudioCtxRef.current) return;
    const audioCtx = liveAudioCtxRef.current;
    
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Data = new Int16Array(bytes.buffer);
    
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }
    
    const audioBuffer = audioCtx.createBuffer(1, float32Data.length, 24000);
    audioBuffer.copyToChannel(float32Data, 0);
    
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    
    source.onended = () => {
      liveSourcesRef.current = liveSourcesRef.current.filter(s => s !== source);
    };
    liveSourcesRef.current.push(source);
    
    const now = audioCtx.currentTime;
    if (liveNextPlayTimeRef.current < now) {
      liveNextPlayTimeRef.current = now + 0.05;
    }
    source.start(liveNextPlayTimeRef.current);
    liveNextPlayTimeRef.current += audioBuffer.duration;
  };

  // Helper: Initialize audio recording
  const initAudioRecording = (stream: MediaStream) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass({ sampleRate: 16000 });
    liveAudioCtxRef.current = audioCtx;
    liveNextPlayTimeRef.current = audioCtx.currentTime;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(2048, 1, 1);
    liveProcessorRef.current = processor;

    source.connect(processor);
    processor.connect(audioCtx.destination);

    processor.onaudioprocess = (e) => {
      if (isLiveCallMuted || !liveWsRef.current || liveWsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);
      
      const pcmBuffer = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      const base64Audio = arrayBufferToBase64(pcmBuffer.buffer);

      try {
        liveWsRef.current.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: 'audio/pcm;rate=16000',
                data: base64Audio
              }
            ]
          }
        }));
      } catch (err) {
        console.error('Error sending audio chunk:', err);
      }
    };
  };

  // Main: Start the Live Voice Call session
  const startLiveCall = async () => {
    setIsLiveCallActive(true);
    setLiveCallStatus('Requesting access key...');
    
    try {
      const apiKey = await AIService.getApiKey();
      
      setLiveCallStatus('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      liveMediaStreamRef.current = stream;

      setLiveCallStatus('Connecting to Gemini Live...');
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      ws.onopen = () => {
        setIsLiveCallConnected(true);
        setLiveCallStatus('Initializing session...');
        
        const setupMessage = {
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Charon'
                  }
                }
              }
            }
          }
        };
        ws.send(JSON.stringify(setupMessage));
        
        initAudioRecording(stream);
        setLiveCallStatus('Connected — Start speaking!');
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.serverContent) {
            const { modelTurn, turnComplete, interrupted } = message.serverContent;
            
            if (interrupted) {
              stopLiveAudioPlayback();
              setLiveCallStatus('Listening...');
              return;
            }
            
            if (modelTurn && modelTurn.parts) {
              setLiveCallStatus('Speaking...');
              for (const part of modelTurn.parts) {
                if (part.inlineData && part.inlineData.data) {
                  playLivePCMChunk(part.inlineData.data);
                }
              }
            }
            
            if (turnComplete) {
              setTimeout(() => {
                setLiveCallStatus('Listening...');
              }, 100);
            }
          }
        } catch (e) {
          console.error('Error parsing live WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('Gemini Live WS Error:', err);
        setLiveCallStatus('Connection error.');
      };

      ws.onclose = () => {
        setIsLiveCallConnected(false);
        setLiveCallStatus('Connection closed.');
        cleanupLiveCall();
      };
      
    } catch (err) {
      console.error('Failed to start Live Call:', err);
      alert('Failed to connect to Live Voice Agent. Please ensure microphone access is granted and Gemini API is configured.');
      setIsLiveCallActive(false);
    }
  };

  // Clean up on component unmount
  React.useEffect(() => {
    return () => {
      cleanupLiveCall();
    };
  }, []);

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
          
          setInput(text);
          await submitVoiceQueryRef.current?.(text);
        };
        recognitionRef.current = recognition;
      }
    }
  }, []);

  React.useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = 'en-IN';
    }
  }, [userLanguage]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Browser Speech Recognition is not supported on this browser. Try Chrome or Microsoft Edge!");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = 'en-IN';
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech recognition start failed:", err);
      }
    }
  };

  // ========== NATURAL SPEAKING ENGINE ==========
  const stopSpeaking = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
  };

  const isManglish = (t: string): boolean => {
    const manglishPatterns = [
      /\b(enthanu|enthu|evide|eppo|enna|alle|aano|undo|vere|njan|nee|avan|aval)\b/i,
      /\b(parayoo|cheyyoo|ariyamo|ayyo|adipoli|sheriyano|okke|alle)\b/i,
      /\b(ingane|angane|enganey|evidey|appol|athu|ithu|ethu)\b/i,
    ];
    return manglishPatterns.some(p => p.test(t));
  };

  const speakText = async (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined') return;
    
    stopSpeaking();

    const cleanText = text
      .replace(/\[Source \d+\]/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/_/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim();

    if (!cleanText) return;

    const voiceName = isManglish(cleanText) ? "Aoede" : "Charon";

    try {
      const audioBlob = await AIService.speak(cleanText, voiceName);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      audio.play();
    } catch (err) {
      console.error("Failed to generate voice output:", err);
    }
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
        selectedSubjectRef.current || undefined,
        undefined,
        sessionIdRef.current
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

            {/* Live Call Button */}
            <button
              onClick={startLiveCall}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-emerald-600/10"
              title="Start real-time voice call (Gemini Live)"
            >
              <Mic className="h-4 w-4" />
              <span>Live Talk</span>
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

      {isLiveCallActive && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 animate-fade-in">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 max-w-md w-full flex flex-col items-center justify-center text-center shadow-2xl relative light-theme:bg-white light-theme:border-zinc-200">
            {/* Top Indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE</span>
            </div>

            {/* Avatar or pulsing wave */}
            <div className="relative my-10 flex items-center justify-center">
              <div className={`absolute h-32 w-32 rounded-full bg-indigo-500/10 border border-indigo-500/20 transition-all duration-1000 ${liveCallStatus.includes('Speaking') ? 'scale-125 opacity-100 animate-pulse' : 'scale-100 opacity-50'}`} />
              <div className={`absolute h-24 w-24 rounded-full bg-indigo-500/20 border border-indigo-500/30 transition-all duration-1000 ${liveCallStatus.includes('Listening') ? 'scale-110 opacity-100 animate-pulse' : 'scale-90 opacity-70'}`} />
              
              <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0 relative shadow-lg shadow-indigo-600/30">
                <Sparkles className={`h-8 w-8 ${liveCallStatus.includes('Speaking') ? 'animate-bounce' : 'animate-pulse'}`} />
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-1 light-theme:text-zinc-900">Study Commander Voice</h3>
            <p className="text-xs text-indigo-400 font-semibold mb-6 uppercase tracking-wider">{liveCallStatus}</p>

            {/* Controls */}
            <div className="flex items-center gap-6">
              {/* Mute Button */}
              <button
                onClick={() => setIsLiveCallMuted(!isLiveCallMuted)}
                className={`p-4 rounded-full border transition-all cursor-pointer ${
                  isLiveCallMuted
                    ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white light-theme:bg-zinc-100 light-theme:border-zinc-200 light-theme:text-zinc-700 light-theme:hover:bg-zinc-200'
                }`}
                title={isLiveCallMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isLiveCallMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              {/* End Button */}
              <button
                onClick={endLiveCall}
                className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all shadow-lg shadow-red-600/30 cursor-pointer"
                title="End voice call"
              >
                <PlusCircle className="h-5 w-5 rotate-45 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
