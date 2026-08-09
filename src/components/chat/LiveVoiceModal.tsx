'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Sparkles, Volume2 } from 'lucide-react';
import { AIService } from '@/services/ai.service';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: (transcriptMessages?: Array<{ sender: 'student' | 'mentor'; text: string }>) => void;
  sessionId?: string;
}

// PCM Stream Player for 24 kHz audio chunks
class PCMStreamPlayer {
  private ctx: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  public isPlaying: boolean = false;
  private onStateChange?: (playing: boolean) => void;

  constructor(onStateChange?: (playing: boolean) => void) {
    this.onStateChange = onStateChange;
  }

  public init() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx({ sampleRate: 24000 });
    this.nextPlayTime = this.ctx.currentTime;
  }

  public playChunk(base64Data: string) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    // Resume AudioContext if suspended (e.g. browser autoplay restriction)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const buffer = this.ctx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);

      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
          this.onStateChange?.(false);
        }
      };

      this.activeSources.push(source);
      this.isPlaying = true;
      this.onStateChange?.(true);

      const now = this.ctx.currentTime;
      if (this.nextPlayTime < now || this.nextPlayTime - now > 0.8) {
        this.nextPlayTime = now + 0.005;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;
    } catch (e) {
      console.error('Error decoding PCM chunk:', e);
    }
  }

  public stop() {
    this.activeSources.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    this.activeSources = [];
    this.isPlaying = false;
    this.onStateChange?.(false);
    if (this.ctx) {
      this.nextPlayTime = this.ctx.currentTime;
    }
  }

  public close() {
    this.stop();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

export default function LiveVoiceModal({ isOpen, onClose, sessionId }: LiveVoiceModalProps) {
  const [status, setStatus] = useState<string>('Initializing...');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<Array<{ sender: 'student' | 'mentor'; text: string }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<PCMStreamPlayer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<any>(null);
  const currentMentorTextRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 1024;
    for (let i = 0; i < bytes.byteLength; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as any);
    }
    return window.btoa(binary);
  };

  // Stop & cleanup call resources
  const terminateCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }

    if (inputCtxRef.current) {
      try {
        inputCtxRef.current.close();
      } catch {}
      inputCtxRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (playerRef.current) {
      playerRef.current.close();
      playerRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    setIsSpeaking(false);
  };

  // Start Mic Recording at 16 kHz
  const startMicRecording = async (stream: MediaStream, ws: WebSocket) => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const inputCtx = new AudioCtx({ sampleRate: 16000 });
    inputCtxRef.current = inputCtx;

    const source = inputCtx.createMediaStreamSource(stream);

    const processAudioBuffer = (channelData: Float32Array) => {
      if (isMuted || ws.readyState !== WebSocket.OPEN) return;

      // RMS calculation
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);

      // Gate mic transmission while AI is speaking to prevent self-interruption echo
      const isAiTalking = playerRef.current?.isPlaying || false;
      const threshold = isAiTalking ? 0.08 : 0.015;

      if (rms < threshold) return;

      const pcm16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      const base64 = arrayBufferToBase64(pcm16.buffer);
      try {
        ws.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                mimeType: 'audio/pcm;rate=16000',
                data: base64,
              },
            },
          })
        );
      } catch (err) {
        console.error('Failed to send mic PCM:', err);
      }
    };

    if ('audioWorklet' in inputCtx) {
      try {
        const workletCode = `
          class PCMProcessor extends AudioWorkletProcessor {
            process(inputs) {
              const input = inputs[0];
              if (input && input[0] && input[0].length > 0) {
                this.port.postMessage(input[0]);
              }
              return true;
            }
          }
          registerProcessor('pcm-processor', PCMProcessor);
        `;
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await inputCtx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);

        const workletNode = new AudioWorkletNode(inputCtx, 'pcm-processor');
        processorRef.current = workletNode;

        workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
          processAudioBuffer(e.data);
        };

        source.connect(workletNode);
        const silentGain = inputCtx.createGain();
        silentGain.gain.value = 0;
        workletNode.connect(silentGain);
        silentGain.connect(inputCtx.destination);
        return;
      } catch (e) {
        console.warn('AudioWorklet fallback to ScriptProcessor:', e);
      }
    }

    const processor = inputCtx.createScriptProcessor(1024, 1, 1);
    processorRef.current = processor;
    source.connect(processor);

    const silentGain = inputCtx.createGain();
    silentGain.gain.value = 0;
    processor.connect(silentGain);
    silentGain.connect(inputCtx.destination);

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      processAudioBuffer(e.inputBuffer.getChannelData(0));
    };
  };

  // Connect to Gemini Live WS
  const connectLiveSession = async () => {
    setStatus('Connecting to Devika...');
    setCallDuration(0);
    setTranscript([]);

    playerRef.current = new PCMStreamPlayer((playing) => {
      setIsSpeaking(playing);
      if (playing) {
        setStatus('Devika is speaking...');
      } else {
        setStatus('Listening...');
      }
    });
    playerRef.current.init();

    try {
      const { apiKey, systemInstruction } = await AIService.getLiveConfig(sessionId || null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const cleanToken = apiKey ? apiKey.replace(/^auth_tokens\//, '') : '';
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(cleanToken)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('Initializing Devika...');
        const setupPayload = {
          setup: {
            model: 'models/gemini-2.5-flash-native-audio-latest',
            generationConfig: {
              responseModalities: ['AUDIO', 'TEXT'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Aoede',
                  },
                },
              },
            },
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          },
        };
        ws.send(JSON.stringify(setupPayload));
      };

      ws.onmessage = async (event: MessageEvent) => {
        if (ws !== wsRef.current) return;
        try {
          let text = '';
          if (typeof event.data === 'string') {
            text = event.data;
          } else if (event.data instanceof Blob) {
            text = await event.data.text();
          } else if (event.data instanceof ArrayBuffer) {
            text = new TextDecoder().decode(event.data);
          }

          const msg = JSON.parse(text);

          if (msg.setupComplete !== undefined) {
            startMicRecording(stream, ws);
            setStatus('Devika is joining...');

            // Start call timer
            timerRef.current = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);

            // Initial prompt
            ws.send(
              JSON.stringify({
                clientContent: {
                  turns: [{ role: 'user', parts: [{ text: 'Hello Devika! Let us start.' }] }],
                  turnComplete: true,
                },
              })
            );
            return;
          }

          if (msg.serverContent) {
            const { modelTurn, turnComplete, interrupted } = msg.serverContent;

            if (interrupted) {
              playerRef.current?.stop();
              currentMentorTextRef.current = '';
              setStatus('Listening...');
              return;
            }

            if (modelTurn && modelTurn.parts) {
              for (const part of modelTurn.parts) {
                if (part.inlineData && part.inlineData.data) {
                  playerRef.current?.playChunk(part.inlineData.data);
                }
                if (part.text) {
                  currentMentorTextRef.current += part.text;
                  const newText = currentMentorTextRef.current;
                  setTranscript((prev) => {
                    const last = prev[prev.length - 1];
                    if (last && last.sender === 'mentor') {
                      return [...prev.slice(0, -1), { sender: 'mentor', text: newText }];
                    } else {
                      return [...prev, { sender: 'mentor', text: newText }];
                    }
                  });
                }
              }
            }

            if (turnComplete) {
              currentMentorTextRef.current = '';
              setStatus('Listening...');
            }
          }
        } catch (err) {
          console.error('Error handling live WS message:', err);
        }
      };

      ws.onerror = (e) => {
        console.error('Live WS Error:', e);
        setStatus('Connection error. Retrying...');
      };

      ws.onclose = (e) => {
        if (ws !== wsRef.current) return;
        console.log('Live WS Closed:', e.code, e.reason);
        setStatus('Call ended.');
      };
    } catch (err) {
      console.error('Failed to start Live Call:', err);
      setStatus('Failed to connect to mic or Devika.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      connectLiveSession();
    } else {
      terminateCall();
    }

    return () => {
      terminateCall();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    const finalTranscript = [...transcript];
    terminateCall();
    onClose(finalTranscript);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between min-h-[500px] shadow-2xl overflow-hidden">
        
        {/* Ambient Glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full filter blur-3xl opacity-25 transition-all duration-700 pointer-events-none ${
          isSpeaking ? 'bg-emerald-500 scale-125' : 'bg-indigo-500 scale-100'
        }`} />

        {/* Header info */}
        <div className="relative z-10 w-full flex items-center justify-between text-xs font-semibold text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-200 font-bold uppercase tracking-wider">Devika Live AI</span>
          </div>
          <div className="px-3 py-1 bg-zinc-800/80 rounded-full font-mono text-zinc-300 border border-zinc-700/50">
            {formatTimer(callDuration)}
          </div>
        </div>

        {/* Avatar & Waveform Animation */}
        <div className="relative z-10 flex flex-col items-center my-auto py-8">
          <div className="relative flex items-center justify-center">
            {/* Pulsing rings when speaking */}
            {isSpeaking && (
              <>
                <div className="absolute w-40 h-40 rounded-full border-2 border-emerald-500/40 animate-ping" />
                <div className="absolute w-48 h-48 rounded-full border border-emerald-500/20 animate-pulse" />
              </>
            )}
            
            <div className={`w-28 h-28 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-xl ${
              isSpeaking 
                ? 'bg-emerald-950/80 border-emerald-400 shadow-emerald-500/20' 
                : 'bg-zinc-800 border-zinc-700 shadow-black/40'
            }`}>
              <Sparkles className={`w-12 h-12 transition-colors duration-300 ${
                isSpeaking ? 'text-emerald-400 animate-bounce' : 'text-indigo-400'
              }`} />
            </div>
          </div>

          <h3 className="mt-6 text-xl font-extrabold text-white tracking-tight">Devika</h3>
          <p className="mt-1 text-sm font-medium text-emerald-400/90">{status}</p>

          {/* Transcript Snippet */}
          {transcript.length > 0 && (
            <div className="mt-4 max-h-24 overflow-y-auto px-4 py-2 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 text-center max-w-xs leading-relaxed">
              "{transcript[transcript.length - 1].text}"
            </div>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="relative z-10 w-full flex items-center justify-center gap-6 pt-4 border-t border-zinc-800/60">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-colors cursor-pointer border ${
              isMuted
                ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer shadow-lg shadow-red-600/30"
            title="End Voice Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
