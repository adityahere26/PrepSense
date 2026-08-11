import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Send,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface QuestionItem {
  id: string;
  order: number;
  category: string;
  questionText: string;
}

interface SessionData {
  id: string;
  targetRole: string;
  status: string;
  createdAt: string;
  questions: QuestionItem[];
}

interface TranscriptEntry {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

// Convert 32-bit Float32Array audio samples to 16-bit PCM Int16 ArrayBuffer
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output.buffer;
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const InterviewSession: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-Time Live Session States
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Web API References
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Output Audio Context for PCM Playback
  const playbackAudioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (sessionId && token) {
      fetchSessionDetails();
    }
    return () => {
      stopLiveSession();
    };
  }, [sessionId, token]);

  // Auto-scroll transcript container
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const fetchSessionDetails = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/session/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success && data.session) {
        setSession(data.session);
        if (data.session.status === 'completed') {
          setIsCompleted(true);
        }
      } else {
        setErrorMessage(data.error || 'Failed to load interview session');
      }
    } catch (err: any) {
      console.error('Error fetching session details:', err);
      setErrorMessage('Network error connecting to interview server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start Real-time Live Interview Session via WebSocket
  const startLiveInterview = async () => {
    if (!sessionId) return;

    setConnectionStatus('connecting');
    setErrorMessage(null);
    setTranscripts([]);

    try {
      // 1. Initialize Web Audio API context for output PCM playback
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const playbackCtx = new AudioCtxClass({ sampleRate: 24000 });
      playbackAudioCtxRef.current = playbackCtx;
      nextPlayTimeRef.current = playbackCtx.currentTime;

      // 2. Request microphone permission and setup mic input streaming at 16kHz PCM
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      mediaStreamRef.current = stream;

      const micCtx = new AudioCtxClass({ sampleRate: 16000 });
      micAudioCtxRef.current = micCtx;

      const source = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(micCtx.destination);

      let chunkSentCount = 0;
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmBuffer = floatTo16BitPCM(inputData);
        const base64Audio = arrayBufferToBase64(pcmBuffer);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          chunkSentCount++;
          if (chunkSentCount % 20 === 1) {
            console.log(`[CLIENT-WS-SEND] Streaming PCM Audio Chunk #${chunkSentCount} (${base64Audio.length} base64 chars)`);
          }
          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              data: base64Audio,
              mimeType: 'audio/pcm;rate=16000',
            })
          );
        }
      };

      setIsMicActive(true);

      // 3. Connect to WebSocket server endpoint
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = API_BASE_URL.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${wsHost}/api/interview/live?sessionId=${sessionId}`;

      console.log('[CLIENT-WS] Connecting to WebSocket endpoint:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[CLIENT-WS] ⚡ WebSocket connected successfully to server');
        setConnectionStatus('connected');
      };

      let audioChunkRecvCount = 0;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            console.log('[CLIENT-WS-RECV] Type "connected":', msg);
          } else if (msg.type === 'transcript') {
            console.log(`[CLIENT-WS-RECV] Type "transcript" [sender=${msg.sender}]: "${msg.text}"`);
            
            // Immediately append transcript chunk to UI state
            setTranscripts((prevTranscripts) => {
              const lastEntry = prevTranscripts[prevTranscripts.length - 1];
              if (lastEntry && lastEntry.sender === msg.sender && lastEntry.isStreaming) {
                // Update existing streaming entry
                const updatedList = [...prevTranscripts];
                updatedList[updatedList.length - 1] = {
                  ...lastEntry,
                  text: lastEntry.text + msg.text,
                };
                return updatedList;
              } else {
                // Add new streaming entry
                return [
                  ...prevTranscripts,
                  {
                    id: String(Date.now() + Math.random()),
                    sender: msg.sender,
                    text: msg.text,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isStreaming: true,
                  },
                ];
              }
            });
          } else if (msg.type === 'audio') {
            audioChunkRecvCount++;
            if (audioChunkRecvCount % 20 === 1) {
              console.log(`[CLIENT-WS-RECV] Type "audio" chunk #${audioChunkRecvCount} (${msg.data?.length} base64 chars)`);
            }
            if (msg.data && playbackAudioCtxRef.current) {
              playIncomingPCMChunk(msg.data, playbackAudioCtxRef.current);
            }
          } else if (msg.type === 'turn_complete') {
            console.log('[CLIENT-WS-RECV] Type "turn_complete"');
            // Finalize active streaming turn in UI state
            setTranscripts((prevTranscripts) => {
              if (prevTranscripts.length === 0) return prevTranscripts;
              const updatedList = [...prevTranscripts];
              const lastIdx = updatedList.length - 1;
              if (updatedList[lastIdx].isStreaming) {
                updatedList[lastIdx] = {
                  ...updatedList[lastIdx],
                  isStreaming: false,
                };
              }
              return updatedList;
            });
          } else if (msg.type === 'error') {
            console.error('[CLIENT-WS-RECV] Type "error":', msg.message);
            setErrorMessage(msg.message || 'Error occurred in live session');
          }
        } catch (err) {
          console.warn('[CLIENT-WS-RECV] Received non-JSON string message:', event.data);
        }
      };

      ws.onerror = (err) => {
        console.error('[CLIENT-WS] ❌ WebSocket error:', err);
        setConnectionStatus('error');
      };

      ws.onclose = (e) => {
        console.log('[CLIENT-WS] 🔌 WebSocket connection closed:', e.code, e.reason);
        setConnectionStatus('disconnected');
        setIsMicActive(false);
      };
    } catch (err: any) {
      console.error('Failed to start live interview session:', err);
      setConnectionStatus('error');
      setErrorMessage(err.message || 'Microphone access or WebSocket connection failed.');
      stopLiveSession();
    }
  };

  // Play incoming 24kHz PCM audio chunk from Gemini Live API
  const playIncomingPCMChunk = (base64Data: string, audioCtx: AudioContext) => {
    try {
      const pcmBytes = base64ToUint8Array(base64Data);
      const int16Samples = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength / 2);

      const float32Samples = new Float32Array(int16Samples.length);
      for (let i = 0; i < int16Samples.length; i++) {
        float32Samples[i] = int16Samples[i] / 32768.0;
      }

      const sampleRate = 24000;
      const audioBuffer = audioCtx.createBuffer(1, float32Samples.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Samples);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
    } catch (err) {
      console.warn('Audio playback chunk error:', err);
    }
  };

  // Manual Safety Net: Trigger "I'm done answering"
  const handleDoneAnswering = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[CLIENT-WS-SEND] Sending done_answering signal to WebSocket server');
      wsRef.current.send(
        JSON.stringify({
          type: 'done_answering',
          text: "I have finished answering the current question. Please proceed to acknowledge my answer and ask the next question.",
        })
      );
    } else {
      console.warn('[CLIENT-WS-SEND] Cannot send done_answering - WebSocket is not OPEN');
    }
  };

  // Stop & Clean up Live Session
  const stopLiveSession = () => {
    setIsMicActive(false);

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (micAudioCtxRef.current) {
      micAudioCtxRef.current.close();
      micAudioCtxRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (playbackAudioCtxRef.current) {
      playbackAudioCtxRef.current.close();
      playbackAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <Loader2 className="w-12 h-12 text-teal-400 animate-spin mb-4" />
        <h2 className="text-xl font-medium">Preparing Live Interview Session...</h2>
        <p className="text-sm text-slate-400 mt-2">Loading session questions & target role profile</p>
      </div>
    );
  }

  if (errorMessage && connectionStatus === 'disconnected') {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl text-center text-white">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Live Session Error</h2>
        <p className="text-slate-400 my-4">{errorMessage}</p>
        <Button onClick={() => navigate('/dashboard')} className="bg-slate-800 hover:bg-slate-700">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 sm:px-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => {
            stopLiveSession();
            navigate('/dashboard');
          }}
          className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs px-3 py-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
        </Button>

        {/* Live WebSocket Connection Status Badge */}
        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-medium">
            Role: {session?.targetRole}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : connectionStatus === 'connecting'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Streaming Connected
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" /> Connecting to Gemini Live...
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-slate-400" /> Disconnected
              </>
            )}
          </span>
        </div>
      </div>

      {/* Main Live Session Panel */}
      <Card className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl text-white shadow-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" /> Real-Time Voice Interview Session
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Powered by Gemini Live API (<span className="text-teal-300">gemini-3.1-flash-live-preview</span>)
              </p>
            </div>

            {/* Start / Stop Controls */}
            {connectionStatus === 'disconnected' ? (
              <Button
                onClick={startLiveInterview}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-teal-500/20"
              >
                <Mic className="w-4 h-4 mr-2" /> Start Live Interview
              </Button>
            ) : (
              <Button
                onClick={stopLiveSession}
                variant="destructive"
                className="bg-rose-500 hover:bg-rose-600 font-semibold px-5 py-2 rounded-xl"
              >
                <Square className="w-4 h-4 mr-2 fill-current" /> End Session
              </Button>
            )}
          </div>



          {/* Live Transcript & Conversation Window */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-teal-400" /> Live Transcript Log
              </h3>
              {isMicActive && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Mic Active (Streaming 16kHz PCM)
                </span>
              )}
            </div>

            <div
              ref={transcriptScrollRef}
              className="h-80 overflow-y-auto p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl space-y-4 font-mono text-sm leading-relaxed"
            >
              {transcripts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                  <Mic className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
                  <p className="text-sm">Click "Start Live Interview" above to connect microphone and start streaming.</p>
                </div>
              )}

              {/* Turn Log Entries */}
              {transcripts.map((t) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    t.sender === 'assistant'
                      ? 'bg-teal-950/30 border-teal-800/40 text-teal-100'
                      : 'bg-cyan-950/30 border-cyan-800/40 text-cyan-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-sans text-slate-400 mb-1">
                    <span className={`font-bold ${t.sender === 'assistant' ? 'text-teal-400' : 'text-cyan-400'}`}>
                      {t.sender === 'assistant' ? '🤖 AI Interviewer' : '👤 You (Candidate)'}
                      {t.isStreaming && <span className="ml-2 text-xs font-normal animate-pulse text-amber-400">(streaming...)</span>}
                    </span>
                    <span>{t.timestamp}</span>
                  </div>
                  <p className="text-sm font-sans whitespace-pre-wrap">{t.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action & Manual Safety Net Bar */}
          {connectionStatus === 'connected' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-800/60 rounded-2xl">
              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Safety Net:</span> If automatic turn detection delays after your spoken answer, click to signal completion.
              </div>

              <Button
                onClick={handleDoneAnswering}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs px-5 py-2 rounded-xl shadow-md"
              >
                <Send className="w-3.5 h-3.5 mr-2" /> I'm Done Answering
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewSession;
