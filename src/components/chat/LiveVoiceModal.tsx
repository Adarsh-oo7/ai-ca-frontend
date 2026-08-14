'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, Sparkles } from 'lucide-react';
import { AIService } from '@/services/ai.service';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const MIC_SAMPLE_RATE   = 16000;   // Gemini requires 16 kHz input
const OUT_SAMPLE_RATE   = 24000;   // Gemini outputs 24 kHz PCM
const GEMINI_MODEL      = 'models/gemini-2.5-flash-native-audio-latest';
const VOICE_NAME        = 'Aoede';
const QUIET_THRESHOLD   = 0.003;   // RMS gate when student is talking
const AI_ECHO_GATE      = 0.06;    // RMS gate when AI is speaking (blocks echo)

const MAX_RECONNECTS    = 5;       // Max auto-reconnect attempts
const RECONNECT_BASE_MS = 1500;    // Initial reconnect delay (doubles each attempt)

// ─────────────────────────────────────────────────────────────────
// PCM PLAYER  — gapless, no overlaps
// ─────────────────────────────────────────────────────────────────
class PCMPlayer {
  private ctx: AudioContext | null = null;
  private nextTime = 0;
  private sources: AudioBufferSourceNode[] = [];
  public playing = false;
  private onChange?: (p: boolean) => void;

  constructor(onChange?: (p: boolean) => void) {
    this.onChange = onChange;
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new Ctx({ sampleRate: OUT_SAMPLE_RATE });
    this.nextTime = this.ctx.currentTime;
  }

  playChunk(b64: string) {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    try {
      const raw   = atob(b64);
      const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
      const i16   = new Int16Array(bytes.buffer);
      const f32   = new Float32Array(i16.length);
      for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768.0;

      const buf = this.ctx.createBuffer(1, f32.length, OUT_SAMPLE_RATE);
      buf.copyToChannel(f32, 0);

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);

      src.onended = () => {
        this.sources = this.sources.filter(s => s !== src);
        if (this.sources.length === 0) {
          this.playing = false;
          this.onChange?.(false);
        }
      };

      const now = this.ctx.currentTime;
      if (this.nextTime < now) this.nextTime = now + 0.01;
      src.start(this.nextTime);
      this.nextTime += buf.duration;

      this.sources.push(src);
      if (!this.playing) {
        this.playing = true;
        this.onChange?.(true);
      }
    } catch {}
  }

  stop() {
    this.sources.forEach(s => { try { s.stop(); } catch {} });
    this.sources = [];
    if (this.ctx) this.nextTime = this.ctx.currentTime;
    if (this.playing) {
      this.playing = false;
      this.onChange?.(false);
    }
  }

  close() {
    this.stop();
    try { this.ctx?.close(); } catch {}
    this.ctx = null;
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function f32ToB64(f32: Float32Array): string {
  const i16 = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, f32[i]));
    i16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const bytes = new Uint8Array(i16.buffer);
  let bin = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(bin);
}

function rms(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: (transcript?: Array<{ sender: 'student' | 'mentor'; text: string }>) => void;
  sessionId?: string;
}

export default function LiveVoiceModal({ isOpen, onClose, sessionId }: Props) {
  const [status,   setStatus]   = useState('Starting...');
  const [muted,    setMuted]    = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [timer,    setTimer]    = useState(0);
  const [lastLine, setLastLine] = useState('');

  // Refs — never trigger re-renders
  const wsRef        = useRef<WebSocket | null>(null);
  const playerRef    = useRef<PCMPlayer | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const inCtxRef     = useRef<AudioContext | null>(null);
  const workletRef   = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutedRef         = useRef(false);
  const transcriptRef    = useRef<Array<{ sender: 'student' | 'mentor'; text: string }>>([]);
  const currentMentorRef = useRef('');
  const reconnectCount   = useRef(0);
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepAliveTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const isClosingRef     = useRef(false);  // true = user pressed end call

  // Keep mutedRef in sync without causing re-renders
  mutedRef.current = muted;

  // ── Cleanup ──────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    isClosingRef.current = true;

    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = null;

    keepAliveTimer.current && clearInterval(keepAliveTimer.current);
    keepAliveTimer.current = null;

    reconnectTimer.current && clearTimeout(reconnectTimer.current);
    reconnectTimer.current = null;

    try { workletRef.current?.disconnect(); } catch {}
    workletRef.current = null;

    try { inCtxRef.current?.close(); } catch {}
    inCtxRef.current = null;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    playerRef.current?.close();
    playerRef.current = null;

    const ws = wsRef.current;
    wsRef.current = null;
    try { ws?.close(1000, 'User ended call'); } catch {}

    setSpeaking(false);
  }, []);

  // ── Mic recording with AudioWorklet ─────────────────────────
  const startMic = useCallback(async (stream: MediaStream, ws: WebSocket) => {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx({ sampleRate: MIC_SAMPLE_RATE });
    inCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);

    const sendPCM = (buf: Float32Array) => {
      if (mutedRef.current || ws.readyState !== WebSocket.OPEN) return;
      const gate = playerRef.current?.playing ? AI_ECHO_GATE : QUIET_THRESHOLD;
      if (rms(buf) < gate) return;
      try {
        ws.send(JSON.stringify({
          realtimeInput: {
            audio: { mimeType: `audio/pcm;rate=${MIC_SAMPLE_RATE}`, data: f32ToB64(buf) }
          }
        }));
      } catch {}
    };

    // Prefer AudioWorklet (modern, non-blocking)
    if (ctx.audioWorklet) {
      try {
        const code = `class P extends AudioWorkletProcessor{process(i){if(i[0]&&i[0][0])this.port.postMessage(i[0][0]);return true}}registerProcessor('p',P)`;
        const blob = new Blob([code], { type: 'application/javascript' });
        const url  = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);

        const node = new AudioWorkletNode(ctx, 'p');
        workletRef.current = node;
        node.port.onmessage = (e: MessageEvent<Float32Array>) => sendPCM(e.data);

        src.connect(node);
        // Pipe to a silent gain to keep the graph alive
        const g = ctx.createGain(); g.gain.value = 0;
        node.connect(g); g.connect(ctx.destination);
        return;
      } catch (e) {
        console.warn('AudioWorklet failed, falling back:', e);
      }
    }

    // Fallback: ScriptProcessor (deprecated but universally supported)
    const sp = ctx.createScriptProcessor(1024, 1, 1);
    workletRef.current = sp as any;
    src.connect(sp);
    const g = ctx.createGain(); g.gain.value = 0;
    sp.connect(g); g.connect(ctx.destination);
    sp.onaudioprocess = (e: AudioProcessingEvent) => sendPCM(e.inputBuffer.getChannelData(0));
  }, []);

  // ── Main connect logic ───────────────────────────────────────
  const connect = useCallback(async () => {
    setStatus('Connecting to Devika...');
    setTimer(0);
    setLastLine('');
    transcriptRef.current = [];
    currentMentorRef.current = '';
    isClosingRef.current = false;
    // Don't reset reconnectCount here — it accumulates across reconnects

    playerRef.current = new PCMPlayer(playing => {
      setSpeaking(playing);
      setStatus(playing ? 'Devika is speaking...' : 'Listening...');
    });
    playerRef.current.init();

    try {
      // 1. Get ephemeral token + full CA mentor system instruction from backend
      const { apiKey, systemInstruction, initialMessage } = await AIService.getLiveConfig(sessionId || null);
      if (!apiKey) throw new Error('No API key returned');

      // 2. Get mic stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: MIC_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // 3. Open WebSocket to our backend proxy (which connects to Gemini server-to-server)
      // This avoids exposing any API key in the browser.
      const wsUrl = `wss://api-study.digitalproductsolutions.in/ws/gemini-live/`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setStatus('Setting up Devika...');
        // 4. Send setup — model, audio config, CA mentor system prompt
        ws.send(JSON.stringify({
          setup: {
            model: GEMINI_MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } }
              }
            },
            systemInstruction: systemInstruction
              ? { parts: [{ text: systemInstruction }] }
              : undefined,
          }
        }));
      };

      ws.onmessage = async (event: MessageEvent) => {
        if (ws !== wsRef.current) return;
        try {
          let raw = '';
          if (typeof event.data === 'string') {
            raw = event.data;
          } else if (event.data instanceof ArrayBuffer) {
            raw = new TextDecoder().decode(event.data);
          } else if (event.data instanceof Blob) {
            raw = await event.data.text();
          }

          const msg = JSON.parse(raw);

          // ── setupComplete: session is ready, start mic + say hello ──
          if (msg.setupComplete !== undefined) {
            await startMic(stream, ws);

            // Start call timer
            timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);

            // Kick off the session with the backend-generated greeting or default
            const greeting = initialMessage || `Hello! I'm Devika, your personal CA Foundation tutor. What would you like to study today?`;
            ws.send(JSON.stringify({
              clientContent: {
                turns: [{ role: 'user', parts: [{ text: greeting }] }],
                turnComplete: true,
              }
            }));
            setStatus('Connected. Devika is joining...');
            return;
          }

          // ── serverContent: audio + text chunks from Gemini ──
          if (msg.serverContent) {
            const { modelTurn, turnComplete, interrupted } = msg.serverContent;

            if (interrupted) {
              playerRef.current?.stop();
              currentMentorRef.current = '';
              setStatus('Listening...');
              return;
            }

            if (modelTurn?.parts) {
              for (const part of modelTurn.parts) {
                // Play audio chunk immediately
                if (part.inlineData?.data) {
                  playerRef.current?.playChunk(part.inlineData.data);
                }
                // Accumulate text for transcript display
                if (part.text) {
                  const chunk = part.text.replace(/\*\*.*?\*\*/g, '').trim();
                  if (chunk) {
                    currentMentorRef.current += (currentMentorRef.current ? ' ' : '') + chunk;
                    setLastLine(currentMentorRef.current);
                  }
                }
              }
            }

            if (turnComplete) {
              // Save completed mentor turn to transcript
              if (currentMentorRef.current) {
                transcriptRef.current.push({ sender: 'mentor', text: currentMentorRef.current });
                currentMentorRef.current = '';
              }
              setStatus('Listening...');
            }
          }

          // ── inputTranscription: what student said ──
          if (msg.inputTranscription?.text) {
            const studentText = msg.inputTranscription.text.trim();
            if (studentText) {
              transcriptRef.current.push({ sender: 'student', text: studentText });
              setLastLine(`You: ${studentText}`);
            }
          }

        } catch (err) {
          console.error('WS message error:', err);
        }
      };

      ws.onerror = (e) => {
        console.error('Gemini Live WS error:', e);
        // Don't show error if we're already reconnecting
      };

      ws.onclose = (e) => {
        if (ws !== wsRef.current) return;
        console.log('Gemini Live WS closed:', e.code, e.reason);

        // Stop keep-alive ping
        keepAliveTimer.current && clearInterval(keepAliveTimer.current);
        keepAliveTimer.current = null;

        // Code 1000 = normal close (user pressed End Call)
        // isClosingRef = user intentionally ended
        if (isClosingRef.current || e.code === 1000) {
          setStatus('Call ended.');
          return;
        }

        // Unexpected drop — auto-reconnect
        if (reconnectCount.current < MAX_RECONNECTS) {
          reconnectCount.current++;
          const delay = RECONNECT_BASE_MS * Math.pow(2, reconnectCount.current - 1);
          setStatus(`Connection lost. Reconnecting in ${Math.round(delay / 1000)}s... (${reconnectCount.current}/${MAX_RECONNECTS})`);
          reconnectTimer.current = setTimeout(() => {
            if (!isClosingRef.current) connect();
          }, delay);
        } else {
          setStatus('Disconnected. Please end and restart the call.');
        }
      };

      // Gemini Live WS stays alive as long as mic PCM data is flowing.
      // No keep-alive ping needed — invalid messages cause immediate disconnects.

    } catch (err: any) {
      console.error('Failed to start Live Call:', err);
      setStatus(`Error: ${err?.message || 'Could not connect.'}`);
    }
  }, [sessionId, startMic]);

  // ── Effect: mount/unmount ────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      connect();
    } else {
      cleanup();
    }
    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── End call handler ─────────────────────────────────────────
  const handleEnd = useCallback(() => {
    const final = [...transcriptRef.current];
    reconnectCount.current = 0;
    if (sessionId && final.length > 0) {
      AIService.logVoiceSession(sessionId, final).catch(console.error);
    }
    cleanup();
    onClose(final);
  }, [sessionId, cleanup, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl overflow-hidden">

        {/* Ambient glow */}
        <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
          speaking
            ? 'bg-gradient-radial from-emerald-900/30 to-transparent'
            : 'bg-gradient-radial from-indigo-900/20 to-transparent'
        }`} />

        {/* Timer */}
        <div className="relative z-10 self-end px-3 py-1 bg-zinc-800 rounded-full text-xs font-mono text-zinc-300 border border-zinc-700">
          {fmt(timer)}
        </div>

        {/* Avatar */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            {speaking && (
              <>
                <div className="absolute w-36 h-36 rounded-full border-2 border-emerald-500/40 animate-ping" />
                <div className="absolute w-44 h-44 rounded-full border border-emerald-500/20 animate-pulse" />
              </>
            )}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 shadow-xl transition-all duration-300 ${
              speaking
                ? 'bg-emerald-950 border-emerald-400 shadow-emerald-500/30'
                : 'bg-zinc-800 border-zinc-700'
            }`}>
              <Sparkles className={`w-10 h-10 transition-colors duration-300 ${
                speaking ? 'text-emerald-400' : 'text-indigo-400'
              }`} />
            </div>
          </div>

          <div className="text-center">
            <p className="text-white font-bold text-xl tracking-tight">Devika</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80 mt-0.5">
              CA Foundation Personal Mentor
            </p>
          </div>

          {/* Live status */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${speaking ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            <p className="text-sm text-zinc-300">{status}</p>
          </div>

          {/* Last line of conversation */}
          {lastLine && (
            <div className="max-w-xs px-4 py-2 bg-zinc-950/70 rounded-xl border border-zinc-800 text-xs text-zinc-300 text-center leading-relaxed">
              &ldquo;{lastLine}&rdquo;
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="relative z-10 w-full flex items-center justify-center gap-6 pt-4 border-t border-zinc-800">
          <button
            onClick={() => setMuted(m => !m)}
            className={`p-4 rounded-full border transition-colors ${
              muted
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
            }`}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={handleEnd}
            className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-colors"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
