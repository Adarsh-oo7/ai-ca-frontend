'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, Sparkles } from 'lucide-react';
import { AIService } from '@/services/ai.service';

const MIC_SAMPLE_RATE = 16000;
const OUT_SAMPLE_RATE = 24000;
const GEMINI_MODEL = 'models/gemini-2.5-flash-native-audio-latest';
const FALLBACK_MODEL = 'models/gemini-live-2.5-flash-native-audio';
const VOICE_NAME = 'Aoede';
const QUIET_THRESHOLD = 0.002;
const TARGET_CHUNK_SAMPLES = 640; // 40ms at 16 kHz
const MAX_RECONNECTS = 4;
const RECONNECT_BASE_MS = 800;
const PLAYBACK_LOOKAHEAD = 0.06;

function getLiveWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return explicit;

  const api = process.env.NEXT_PUBLIC_API_URL || '';
  if (api.startsWith('https://')) {
    return `${api.replace(/^https:/, 'wss:').replace(/\/$/, '')}/ws/gemini-live/`;
  }
  if (api.startsWith('http://')) {
    return `${api.replace(/^http:/, 'ws:').replace(/\/$/, '')}/ws/gemini-live/`;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'ws://localhost:8765';
    }
    return 'wss://api-study.digitalproductsolutions.in/ws/gemini-live/';
  }
  return 'wss://api-study.digitalproductsolutions.in/ws/gemini-live/';
}

function decodePcm16le(b64: string): Float32Array {
  const raw = atob(b64);
  const evenLen = raw.length - (raw.length % 2);
  const f32 = new Float32Array(evenLen / 2);
  for (let i = 0; i < f32.length; i++) {
    const lo = raw.charCodeAt(i * 2);
    const hi = raw.charCodeAt(i * 2 + 1);
    let sample = (hi << 8) | lo;
    if (sample >= 0x8000) sample -= 0x10000;
    f32[i] = sample / 32768;
  }
  return f32;
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (!input.length || fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio;
    const i0 = Math.min(Math.floor(x), input.length - 1);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const f = x - i0;
    out[i] = input[i0] * (1 - f) + input[i1] * f;
  }
  return out;
}

/** Gapless sequential playback. Never restarts a chunk on top of another. */
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
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.nextTime = this.ctx.currentTime;
  }

  playChunk(b64: string, mimeType?: string) {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!b64) return;

    try {
      if (mimeType && !/pcm|audio\/l16/i.test(mimeType) && /json|text/i.test(mimeType)) return;
      const rateMatch = mimeType?.match(/rate=(\d+)/i);
      const srcRate = rateMatch ? Number(rateMatch[1]) : OUT_SAMPLE_RATE;
      const samples = resampleLinear(decodePcm16le(b64), srcRate, this.ctx.sampleRate);
      if (!samples.length) return;

      const buf = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
      buf.copyToChannel(samples, 0);

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.onended = () => {
        this.sources = this.sources.filter((s) => s !== src);
        if (this.sources.length === 0) {
          this.playing = false;
          this.onChange?.(false);
        }
      };

      const now = this.ctx.currentTime;
      if (this.nextTime < now + PLAYBACK_LOOKAHEAD) {
        this.nextTime = now + PLAYBACK_LOOKAHEAD;
      }
      src.start(this.nextTime);
      this.nextTime += buf.duration;

      this.sources.push(src);
      if (!this.playing) {
        this.playing = true;
        this.onChange?.(true);
      }
    } catch {
      /* skip corrupt chunk */
    }
  }

  stop() {
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    this.sources = [];
    if (this.ctx) this.nextTime = this.ctx.currentTime;
    if (this.playing) {
      this.playing = false;
      this.onChange?.(false);
    }
  }

  close() {
    this.stop();
    try {
      this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
  }
}

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
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface Props {
  isOpen: boolean;
  onClose: (transcript?: Array<{ sender: 'student' | 'mentor'; text: string }>) => void;
  sessionId?: string;
}

export default function LiveVoiceModal({ isOpen, onClose, sessionId }: Props) {
  const [status, setStatus] = useState('Starting...');
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [timer, setTimer] = useState(0);
  const [lastLine, setLastLine] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<PCMPlayer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutedRef = useRef(false);
  const transcriptRef = useRef<Array<{ sender: 'student' | 'mentor'; text: string }>>([]);
  const currentMentorRef = useRef('');
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);
  const modelRef = useRef(GEMINI_MODEL);
  const toolsEnabledRef = useRef(false);
  const setupCompleteRef = useRef(false);
  const pcmBufferRef = useRef<Float32Array[]>([]);
  const pcmSamplesRef = useRef(0);

  mutedRef.current = muted;

  const tearDownMedia = useCallback(() => {
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = null;
    try {
      workletRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    workletRef.current = null;
    try {
      inCtxRef.current?.close();
    } catch {
      /* ignore */
    }
    inCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    try {
      ws?.close(1000, 'cleanup');
    } catch {
      /* ignore */
    }
    setSpeaking(false);
  }, []);

  const cleanup = useCallback(() => {
    isClosingRef.current = true;
    reconnectTimer.current && clearTimeout(reconnectTimer.current);
    reconnectTimer.current = null;
    tearDownMedia();
  }, [tearDownMedia]);

  const startMic = useCallback(async (stream: MediaStream, ws: WebSocket) => {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx({ sampleRate: MIC_SAMPLE_RATE });
    inCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    pcmBufferRef.current = [];
    pcmSamplesRef.current = 0;

    const flush = (force = false) => {
      if (mutedRef.current || ws.readyState !== WebSocket.OPEN) return;
      if (!force && pcmSamplesRef.current < TARGET_CHUNK_SAMPLES) return;
      if (pcmSamplesRef.current === 0) return;

      const merged = new Float32Array(pcmSamplesRef.current);
      let offset = 0;
      for (const part of pcmBufferRef.current) {
        merged.set(part, offset);
        offset += part.length;
      }
      pcmBufferRef.current = [];
      pcmSamplesRef.current = 0;

      const level = rms(merged);
      // Do not cut playback on speaker echo. While Devika is talking, hold the mic
      // so Gemini does not interrupt herself. Real barge-in is handled by `interrupted`.
      if (playerRef.current?.playing) return;
      if (level < QUIET_THRESHOLD) return;
      try {
        ws.send(
          JSON.stringify({
            realtimeInput: {
              audio: { mimeType: `audio/pcm;rate=${MIC_SAMPLE_RATE}`, data: f32ToB64(merged) },
            },
          })
        );
      } catch {
        /* ignore */
      }
    };

    const sendPCM = (buf: Float32Array) => {
      const copy = new Float32Array(buf);
      pcmBufferRef.current.push(copy);
      pcmSamplesRef.current += copy.length;
      flush(false);
    };

    if (ctx.audioWorklet) {
      try {
        const code = `class P extends AudioWorkletProcessor{process(i){if(i[0]&&i[0][0])this.port.postMessage(i[0][0]);return true}}registerProcessor('p',P)`;
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);

        const node = new AudioWorkletNode(ctx, 'p');
        workletRef.current = node;
        node.port.onmessage = (e: MessageEvent<Float32Array>) => sendPCM(e.data);

        src.connect(node);
        const g = ctx.createGain();
        g.gain.value = 0;
        node.connect(g);
        g.connect(ctx.destination);
        return;
      } catch (e) {
        console.warn('AudioWorklet failed, falling back:', e);
      }
    }

    const sp = ctx.createScriptProcessor(1024, 1, 1);
    workletRef.current = sp;
    src.connect(sp);
    const g = ctx.createGain();
    g.gain.value = 0;
    sp.connect(g);
    g.connect(ctx.destination);
    sp.onaudioprocess = (e: AudioProcessingEvent) => sendPCM(e.inputBuffer.getChannelData(0));
  }, []);

  const handleToolCalls = useCallback(async (ws: WebSocket, toolCall: { functionCalls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> }) => {
    const calls = toolCall?.functionCalls || [];
    if (!calls.length || ws.readyState !== WebSocket.OPEN) return;
    setStatus('Looking up your ICAI notes...');
    const functionResponses = [];
    for (const call of calls) {
      const name = call.name || '';
      try {
        const result = await AIService.runLiveTool(name, call.args || {});
        functionResponses.push({
          id: call.id,
          name,
          response: result,
        });
      } catch {
        functionResponses.push({
          id: call.id,
          name,
          response: { error: 'tool failed' },
        });
      }
    }
    try {
      ws.send(JSON.stringify({ toolResponse: { functionResponses } }));
    } catch {
      /* ignore */
    }
  }, []);

  const connect = useCallback(async () => {
    setStatus('Connecting to Devika...');
    setTimer(0);
    setLastLine('');
    if (reconnectCount.current === 0) {
      transcriptRef.current = [];
    }
    currentMentorRef.current = '';
    isClosingRef.current = false;
    setupCompleteRef.current = false;

    playerRef.current?.close();
    playerRef.current = new PCMPlayer((playing) => {
      setSpeaking(playing);
      setStatus(playing ? 'Devika is speaking...' : 'Listening...');
    });
    playerRef.current.init();

    try {
      const [config, stream] = await Promise.all([
        AIService.getLiveConfig(sessionId || null),
        navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: MIC_SAMPLE_RATE,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }),
      ]);
      if (!config.systemInstruction) throw new Error('Live mentor config missing');
      streamRef.current = stream;

      const wsUrl = getLiveWsUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setStatus('Setting up Devika...');
        const setup: Record<string, unknown> = {
          model: modelRef.current,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
            },
          },
          systemInstruction: {
            parts: [{ text: config.systemInstruction }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          contextWindowCompression: { slidingWindow: {} },
        };
        if (toolsEnabledRef.current) {
          setup.tools = [
            {
              functionDeclarations: [
                {
                  name: 'search_icai_library',
                  description: 'Search ICAI study material for a concept or chapter.',
                  parameters: {
                    type: 'OBJECT',
                    properties: {
                      query: { type: 'STRING' },
                      subject: { type: 'STRING' },
                    },
                    required: ['query'],
                  },
                },
                {
                  name: 'get_student_study_status',
                  description: 'Get what this student recently studied and revisions due.',
                  parameters: { type: 'OBJECT', properties: {} },
                },
              ],
            },
          ];
        }
        ws.send(JSON.stringify({ setup }));
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

          if (msg.setupComplete !== undefined) {
            setupCompleteRef.current = true;
            await startMic(stream, ws);
            reconnectCount.current = 0;
            timerRef.current && clearInterval(timerRef.current);
            timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
            try {
              ws.send(JSON.stringify({ realtimeInput: { text: 'Hi' } }));
            } catch {
              /* ignore */
            }
            setStatus('Listening...');
            return;
          }

          if (msg.toolCall) {
            await handleToolCalls(ws, msg.toolCall);
          }

          if (msg.goAway) {
            setStatus('Session wrapping up. Reconnecting...');
            return;
          }

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
                const audioData = part.inlineData?.data as string | undefined;
                const mimeType = (part.inlineData?.mimeType as string | undefined) || '';
                if (audioData && (!mimeType || /pcm|audio/i.test(mimeType))) {
                  playerRef.current?.playChunk(audioData, mimeType);
                }
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
              if (currentMentorRef.current) {
                transcriptRef.current.push({ sender: 'mentor', text: currentMentorRef.current });
                currentMentorRef.current = '';
              }
              setStatus('Listening...');
            }
          }

          if (msg.outputTranscription?.text) {
            const t = msg.outputTranscription.text.trim();
            if (t) {
              currentMentorRef.current += (currentMentorRef.current ? ' ' : '') + t;
              setLastLine(currentMentorRef.current);
            }
          }

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
        setStatus('Connection error. Retrying...');
      };

      ws.onclose = (e) => {
        if (ws !== wsRef.current) return;
        if (isClosingRef.current || e.code === 1000) {
          setStatus('Call ended.');
          return;
        }

        if (reconnectCount.current === 0 && modelRef.current === GEMINI_MODEL) {
          modelRef.current = FALLBACK_MODEL;
        }
        if (!setupCompleteRef.current && toolsEnabledRef.current) {
          toolsEnabledRef.current = false;
        }

        if (reconnectCount.current < MAX_RECONNECTS) {
          reconnectCount.current += 1;
          const delay = RECONNECT_BASE_MS * Math.pow(2, reconnectCount.current - 1);
          setStatus(`Connection lost. Reconnecting (${reconnectCount.current}/${MAX_RECONNECTS})...`);
          reconnectTimer.current = setTimeout(() => {
            if (!isClosingRef.current) {
              tearDownMedia();
              connect();
            }
          }, delay);
        } else {
          setStatus('Could not stay connected. End the call and try again.');
        }
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not connect.';
      console.error('Failed to start Live Call:', err);
      if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('denied')) {
        setStatus('Microphone permission is required for Live Talk.');
      } else {
        setStatus(`Error: ${message}`);
      }
    }
  }, [sessionId, startMic, handleToolCalls, tearDownMedia]);

  useEffect(() => {
    if (isOpen) {
      reconnectCount.current = 0;
      modelRef.current = GEMINI_MODEL;
      toolsEnabledRef.current = false;
      connect();
    } else {
      cleanup();
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-700 ${
            speaking ? 'bg-gradient-radial from-emerald-900/30 to-transparent' : 'bg-gradient-radial from-indigo-900/20 to-transparent'
          }`}
        />

        <div className="relative z-10 self-end px-3 py-1 bg-zinc-800 rounded-full text-xs font-mono text-zinc-300 border border-zinc-700">
          {fmt(timer)}
        </div>

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            {speaking && (
              <>
                <div className="absolute w-36 h-36 rounded-full border-2 border-emerald-500/40 animate-ping" />
                <div className="absolute w-44 h-44 rounded-full border border-emerald-500/20 animate-pulse" />
              </>
            )}
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center border-2 shadow-xl transition-all duration-300 ${
                speaking ? 'bg-emerald-950 border-emerald-400 shadow-emerald-500/30' : 'bg-zinc-800 border-zinc-700'
              }`}
            >
              <Sparkles className={`w-10 h-10 transition-colors duration-300 ${speaking ? 'text-emerald-400' : 'text-indigo-400'}`} />
            </div>
          </div>

          <div className="text-center">
            <p className="text-white font-bold text-xl tracking-tight">Devika</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80 mt-0.5">
              CA Foundation Personal Mentor
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${speaking ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            <p className="text-sm text-zinc-300 text-center">{status}</p>
          </div>

          {lastLine && (
            <div className="max-w-xs px-4 py-2 bg-zinc-950/70 rounded-xl border border-zinc-800 text-xs text-zinc-300 text-center leading-relaxed">
              &ldquo;{lastLine}&rdquo;
            </div>
          )}
        </div>

        <div className="relative z-10 w-full flex items-center justify-center gap-6 pt-4 border-t border-zinc-800">
          <button
            onClick={() => setMuted((m) => !m)}
            className={`p-4 rounded-full border transition-colors ${
              muted ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
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
