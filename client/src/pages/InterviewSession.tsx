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
  questionId?: string;
}

interface AnswerEvaluation {
  starScore: number;
  specificityScore: number;
  relevanceScore: number;
  scoreOverall: number;
  feedback: string;
  isEvaluating?: boolean;
}

interface SessionSummaryData {
  overallScore: number;
  averageStarScore: number;
  averageSpecificityScore: number;
  averageRelevanceScore: number;
  topImprovementAreas: string[];
  summaryText: string;
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

  // Per-Question Answer Evaluations & Session Summary State
  const [evaluations, setEvaluations] = useState<Record<string, AnswerEvaluation>>({});
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryData | null>(null);

  const sessionRef = useRef<SessionData | null>(null);
  const currentQuestionIndexRef = useRef<number>(0);
  const lastEvaluatedQuestionIdRef = useRef<string | null>(null);

  // Web API References
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Turn State & Audio Feedback Prevention
  const isAssistantSpeakingRef = useRef<boolean>(true);
  const assistantAudioEndTimeRef = useRef<number>(0);

  // Growing PCM Buffer for Contextual User Turn Re-Transcription
  const userTurnPcmAccumulatorRef = useRef<Int16Array[]>([]);
  const userTurnTotalSamplesRef = useRef<number>(0);
  const lastTranscribedSampleCountRef = useRef<number>(0);
  const currentUserTurnIdRef = useRef<string | null>(null);

  // Output Audio Context for PCM Playback
  const playbackAudioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const triggerAnswerEvaluation = (questionId: string, transcriptText: string) => {
    if (!questionId || !transcriptText.trim()) return;
    if (lastEvaluatedQuestionIdRef.current === questionId) return;
    lastEvaluatedQuestionIdRef.current = questionId;

    setEvaluations((prev) => ({
      ...prev,
      [questionId]: {
        starScore: prev[questionId]?.starScore || 0,
        specificityScore: prev[questionId]?.specificityScore || 0,
        relevanceScore: prev[questionId]?.relevanceScore || 0,
        scoreOverall: prev[questionId]?.scoreOverall || 0,
        feedback: prev[questionId]?.feedback || '',
        isEvaluating: true,
      },
    }));

    fetch(`${API_BASE_URL}/api/interview/evaluate-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        questionId,
        transcript: transcriptText.trim(),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.evaluation) {
          console.log('✨ [UI-EVALUATION-SUCCESS] Answer evaluated for question:', questionId, data.evaluation);
          setEvaluations((prev) => ({
            ...prev,
            [questionId]: {
              ...data.evaluation,
              isEvaluating: false,
            },
          }));

          if (data.isSessionCompleted && data.sessionSummary) {
            console.log('🏆 [UI-SESSION-COMPLETED] Session summary received:', data.sessionSummary);
            setSessionSummary(data.sessionSummary);
            setIsCompleted(true);
          }
        }
      })
      .catch((err) => {
        console.warn('⚠️ Error calling evaluate-answer endpoint:', err);
        setEvaluations((prev) => ({
          ...prev,
          [questionId]: {
            ...prev[questionId],
            isEvaluating: false,
          },
        }));
      });
  };

  const transcribeFullUserTurnBuffer = () => {
    if (userTurnTotalSamplesRef.current < 8000) return;

    const totalSamples = userTurnTotalSamplesRef.current;
    lastTranscribedSampleCountRef.current = totalSamples;

    const mergedPcm = new Int16Array(totalSamples);
    let offset = 0;
    for (const chunk of userTurnPcmAccumulatorRef.current) {
      mergedPcm.set(chunk, offset);
      offset += chunk.length;
    }

    const fullTurnBase64 = arrayBufferToBase64(mergedPcm.buffer);

    if (!currentUserTurnIdRef.current) {
      currentUserTurnIdRef.current = String(Date.now() + Math.random());
    }
    const turnId = currentUserTurnIdRef.current;
    const currentQId = sessionRef.current?.questions[currentQuestionIndexRef.current]?.id;

    fetch(`${API_BASE_URL}/api/interview/transcribe-chunk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        audioData: fullTurnBase64,
        mimeType: 'audio/pcm;rate=16000',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.text && data.text.trim()) {
          const fullText = data.text.trim();
          console.log(`🎤 [CONTEXTUAL-TRANSCRIPTION] Re-transcribed full user turn (${(totalSamples / 16000).toFixed(1)}s): "${fullText}"`);
          setTranscripts((prevTranscripts) => {
            const existingIdx = prevTranscripts.findIndex((t) => t.id === turnId);
            if (existingIdx !== -1) {
              const updated = [...prevTranscripts];
              updated[existingIdx] = {
                ...updated[existingIdx],
                text: fullText,
                questionId: currentQId,
              };
              return updated;
            } else {
              const newEntry: TranscriptEntry = {
                id: turnId,
                sender: 'user',
                text: fullText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isStreaming: true,
                questionId: currentQId,
              };
              return [...prevTranscripts, newEntry];
            }
          });
        }
      })
      .catch((err) => {
        console.warn('⚠️ Full user-turn re-transcription request error:', err);
      });
  };

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
        sessionRef.current = data.session;
        setSession(data.session);
        if (data.session.status === 'completed') {
          setIsCompleted(true);
        }

        // Populate existing answer evaluations and session summary if present
        if (Array.isArray(data.session.questions)) {
          const existingEvals: Record<string, AnswerEvaluation> = {};
          data.session.questions.forEach((q: any) => {
            if (q.answer && q.answer.evaluationJson) {
              try {
                const evalObj = typeof q.answer.evaluationJson === 'string' ? JSON.parse(q.answer.evaluationJson) : q.answer.evaluationJson;
                if (evalObj && typeof evalObj.starScore === 'number') {
                  existingEvals[q.id] = evalObj;
                }
              } catch (e) {}
            }
          });
          setEvaluations(existingEvals);
        }

        if (data.session.summaryJson) {
          try {
            const sumObj = typeof data.session.summaryJson === 'string' ? JSON.parse(data.session.summaryJson) : data.session.summaryJson;
            if (sumObj && typeof sumObj.overallScore === 'number') {
              setSessionSummary(sumObj);
            }
          } catch (e) {}
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
          autoGainControl: true,
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

        // TURN GATING: Check if assistant is currently speaking or playing audio
        const currentAudioTime = playbackAudioCtxRef.current ? playbackAudioCtxRef.current.currentTime : 0;
        const isAssistantAudioPlaying = currentAudioTime < assistantAudioEndTimeRef.current;

        if (isAssistantSpeakingRef.current || isAssistantAudioPlaying) {
          // Suppress mic buffer accumulation while assistant is speaking/playing audio
          userTurnPcmAccumulatorRef.current = [];
          userTurnTotalSamplesRef.current = 0;
          lastTranscribedSampleCountRef.current = 0;
          currentUserTurnIdRef.current = null;
          return;
        }

        // Genuinely user's turn: accumulate into growing PCM buffer
        const int16Chunk = new Int16Array(pcmBuffer);
        userTurnPcmAccumulatorRef.current.push(int16Chunk);
        userTurnTotalSamplesRef.current += int16Chunk.length;

        // Every ~3 seconds of new audio (~48,000 samples at 16kHz), re-transcribe the full accumulated buffer
        if (userTurnTotalSamplesRef.current - lastTranscribedSampleCountRef.current >= 48000) {
          transcribeFullUserTurnBuffer();
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
            
            if (msg.sender === 'assistant') {
              isAssistantSpeakingRef.current = true;
              userTurnPcmAccumulatorRef.current = [];
              userTurnTotalSamplesRef.current = 0;
              lastTranscribedSampleCountRef.current = 0;
              currentUserTurnIdRef.current = null;
            }

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
            isAssistantSpeakingRef.current = true;
            userTurnPcmAccumulatorRef.current = [];
            userTurnTotalSamplesRef.current = 0;
            lastTranscribedSampleCountRef.current = 0;
            currentUserTurnIdRef.current = null;

            audioChunkRecvCount++;
            if (audioChunkRecvCount % 20 === 1) {
              console.log(`[CLIENT-WS-RECV] Type "audio" chunk #${audioChunkRecvCount} (${msg.data?.length} base64 chars)`);
            }
            if (msg.data && playbackAudioCtxRef.current) {
              playIncomingPCMChunk(msg.data, playbackAudioCtxRef.current);
            }
          } else if (msg.type === 'turn_complete') {
            console.log('[CLIENT-WS-RECV] Type "turn_complete"');

            // Schedule assistant turn completion when audio playback finishes
            const checkPlaybackFinished = () => {
              const currentAudioTime = playbackAudioCtxRef.current ? playbackAudioCtxRef.current.currentTime : 0;
              if (currentAudioTime >= assistantAudioEndTimeRef.current) {
                console.log('🏁 [CLIENT-TURN-STATE] Assistant audio playback completed. User turn active now.');
                isAssistantSpeakingRef.current = false;
                userTurnPcmAccumulatorRef.current = [];
                userTurnTotalSamplesRef.current = 0;
                lastTranscribedSampleCountRef.current = 0;
                currentUserTurnIdRef.current = null;
              } else {
                const remainingTimeMs = Math.max(50, (assistantAudioEndTimeRef.current - currentAudioTime) * 1000);
                setTimeout(checkPlaybackFinished, remainingTimeMs);
              }
            };
            checkPlaybackFinished();

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
      const duration = audioBuffer.duration;
      nextPlayTimeRef.current = startTime + duration;
      assistantAudioEndTimeRef.current = nextPlayTimeRef.current;
    } catch (err) {
      console.warn('Audio playback chunk error:', err);
    }
  };

  // Manual Safety Net: Trigger "I'm done answering"
  const handleDoneAnswering = () => {
    transcribeFullUserTurnBuffer();
    const currentQId = sessionRef.current?.questions[currentQuestionIndexRef.current]?.id;

    if (currentUserTurnIdRef.current) {
      const turnId = currentUserTurnIdRef.current;
      setTranscripts((prevTranscripts) => {
        const existingIdx = prevTranscripts.findIndex((t) => t.id === turnId);
        if (existingIdx !== -1) {
          const updated = [...prevTranscripts];
          updated[existingIdx] = {
            ...updated[existingIdx],
            isStreaming: false,
          };

          const userText = updated[existingIdx].text;
          const qId = updated[existingIdx].questionId || currentQId;
          if (qId && userText && userText.trim()) {
            triggerAnswerEvaluation(qId, userText);
            currentQuestionIndexRef.current += 1;
          }
          return updated;
        }
        return prevTranscripts;
      });
    }

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
    <div className="max-w-4xl mx-auto my-8 px-4 sm:px-6 space-y-8">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between mb-2">
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
              className="h-96 overflow-y-auto p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl space-y-4 font-mono text-sm leading-relaxed"
            >
              {transcripts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                  <Mic className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
                  <p className="text-sm">Click "Start Live Interview" above to connect microphone and start streaming.</p>
                </div>
              )}

              {/* Turn Log Entries */}
              {transcripts.map((t) => (
                <div key={t.id} className="space-y-2">
                  <div
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

                  {/* Inline Evaluation Card for Candidate Turn */}
                  {t.sender === 'user' && t.questionId && (
                    <div className="ml-4">
                      {evaluations[t.questionId]?.isEvaluating ? (
                        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2 animate-pulse font-sans">
                          <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                          <span>Evaluating your response with Gemini AI...</span>
                        </div>
                      ) : (
                        evaluations[t.questionId] && (
                          <div className="p-4 bg-slate-900/90 border border-teal-500/30 rounded-xl space-y-3 font-sans text-xs text-slate-200 shadow-lg animate-in fade-in duration-300">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="font-semibold text-teal-400 flex items-center gap-1.5 text-xs">
                                <Sparkles className="w-3.5 h-3.5 text-teal-400" /> Answer Evaluation
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                  evaluations[t.questionId].scoreOverall >= 75
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : evaluations[t.questionId].scoreOverall >= 55
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                Overall: {evaluations[t.questionId].scoreOverall}/100
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 text-center">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">STAR Structure</div>
                                <div className="text-sm font-bold text-teal-300 mt-0.5">
                                  {evaluations[t.questionId].starScore}
                                  <span className="text-[10px] font-normal text-slate-400">/100</span>
                                </div>
                              </div>
                              <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 text-center">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Specificity</div>
                                <div className="text-sm font-bold text-cyan-300 mt-0.5">
                                  {evaluations[t.questionId].specificityScore}
                                  <span className="text-[10px] font-normal text-slate-400">/100</span>
                                </div>
                              </div>
                              <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 text-center">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Relevance</div>
                                <div className="text-sm font-bold text-emerald-300 mt-0.5">
                                  {evaluations[t.questionId].relevanceScore}
                                  <span className="text-[10px] font-normal text-slate-400">/100</span>
                                </div>
                              </div>
                            </div>

                            {evaluations[t.questionId].feedback && (
                              <div className="pt-1 text-slate-300 italic text-xs leading-relaxed">
                                "{evaluations[t.questionId].feedback}"
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
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

      {/* End-of-Session Performance Summary Card */}
      {isCompleted && sessionSummary && (
        <Card className="bg-slate-900/95 border border-teal-500/40 shadow-2xl rounded-3xl overflow-hidden text-white animate-in zoom-in-95 duration-500">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Interview Completed
                </div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  Interview Performance Report
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Target Role: <span className="text-slate-200 font-semibold">{session?.targetRole}</span>
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-950/80 px-5 py-3 rounded-2xl border border-teal-500/30">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Overall Rating</div>
                  <div className="text-2xl font-extrabold text-teal-400">
                    {sessionSummary.overallScore}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Grid Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium">Avg STAR Structure</span>
                <div className="text-xl font-bold text-teal-300 mt-1">{sessionSummary.averageStarScore}/100</div>
              </div>
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium">Avg Specificity</span>
                <div className="text-xl font-bold text-cyan-300 mt-1">{sessionSummary.averageSpecificityScore}/100</div>
              </div>
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium">Avg Relevance</span>
                <div className="text-xl font-bold text-emerald-300 mt-1">{sessionSummary.averageRelevanceScore}/100</div>
              </div>
            </div>

            {/* Executive Summary */}
            {sessionSummary.summaryText && (
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">Executive Summary</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{sessionSummary.summaryText}</p>
              </div>
            )}

            {/* Top 2 Improvement Areas */}
            {sessionSummary.topImprovementAreas && sessionSummary.topImprovementAreas.length > 0 && (
              <div className="p-5 bg-amber-950/20 border border-amber-500/30 rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Top 2 Key Areas for Improvement
                </h4>
                <ul className="space-y-2">
                  {sessionSummary.topImprovementAreas.map((area, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-amber-100 leading-relaxed">
                      <span className="font-bold text-amber-400 mt-0.5">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-teal-500/20"
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InterviewSession;
