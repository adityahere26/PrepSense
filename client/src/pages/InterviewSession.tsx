import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Volume2,
  Send,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowLeft,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface QuestionItem {
  id: string;
  order: number;
  category: string;
  questionText: string;
  answer?: {
    id: string;
    transcript: string;
    scoreOverall: number;
  } | null;
}

interface SessionData {
  id: string;
  targetRole: string;
  status: string;
  createdAt: string;
  questions: QuestionItem[];
}

export const InterviewSession: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [session, setSession] = useState<SessionData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio TTS states
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // MediaRecorder Voice States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Completion state
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sessionId && token) {
      fetchSessionDetails();
    }
  }, [sessionId, token]);

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

        // Find first unanswered question or default to first question
        const firstUnansweredIndex = data.session.questions.findIndex((q: QuestionItem) => !q.answer);
        if (firstUnansweredIndex !== -1) {
          setCurrentQuestionIndex(firstUnansweredIndex);
        } else if (data.session.status === 'completed') {
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

  const currentQuestion = session?.questions[currentQuestionIndex];

  // Auto-play TTS audio when current question changes
  useEffect(() => {
    if (currentQuestion && token && !isCompleted) {
      fetchAndPlayQuestionTTS(currentQuestion.id);
    }
    return () => {
      stopAudioPlayback();
      cleanupRecordedAudioUrl();
    };
  }, [currentQuestionIndex, isCompleted]);

  const fetchAndPlayQuestionTTS = async (questionId: string) => {
    stopAudioPlayback();
    setIsLoadingAudio(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/question/${questionId}/tts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('TTS endpoint error');
      }

      const audioBlob = await res.blob();
      const objectUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(objectUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlayingAudio(true);
      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(objectUrl);
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        setIsLoadingAudio(false);
      };

      setIsLoadingAudio(false);
      await audio.play().catch((playErr) => {
        console.warn('Autoplay prevented by browser policy:', playErr);
        setIsPlayingAudio(false);
      });
    } catch (err) {
      console.warn('Could not auto-play question audio:', err);
      setIsLoadingAudio(false);
      setIsPlayingAudio(false);
    }
  };

  const stopAudioPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  const cleanupRecordedAudioUrl = () => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setRecordedAudioBlob(null);
  };

  // Voice Recording Logic (MediaRecorder API)
  const startRecording = async () => {
    stopAudioPlayback();
    cleanupRecordedAudioUrl();
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(url);

        // Stop media tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      alert('Microphone permission is required to record your voice answer. Please allow mic access in browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Submit Spoken Answer to Express endpoint
  const handleSubmitAnswer = async () => {
    if (!recordedAudioBlob || !currentQuestion || !sessionId || !token) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('audio', recordedAudioBlob, `answer_${currentQuestion.id}.webm`);
      formData.append('questionId', currentQuestion.id);

      const res = await fetch(`${API_BASE_URL}/api/interview/session/${sessionId}/answer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        cleanupRecordedAudioUrl();

        if (data.isComplete || !data.nextQuestion) {
          setIsCompleted(true);
        } else {
          // Advance to next question
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      } else {
        alert(`Error submitting answer: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      alert('Failed to submit answer due to network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <Loader2 className="w-12 h-12 text-teal-400 animate-spin mb-4" />
        <h2 className="text-xl font-medium">Preparing Voice Interview Session...</h2>
        <p className="text-sm text-slate-400 mt-2">Loading role-tailored questions & audio assets</p>
      </div>
    );
  }

  if (errorMessage || !session) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl text-center text-white">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Session Unavailable</h2>
        <p className="text-slate-400 my-4">{errorMessage || 'Could not find specified interview session.'}</p>
        <Button onClick={() => navigate('/dashboard')} className="bg-slate-800 hover:bg-slate-700">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  // Session Completed Celebration Screen
  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl rounded-3xl text-white text-center shadow-2xl">
        <div className="w-20 h-20 bg-teal-500/20 border border-teal-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-teal-400 animate-pulse" />
        </div>

        <h1 className="text-3xl font-extrabold text-slate-100 mb-2">Mock Interview Session Completed!</h1>
        <p className="text-slate-300 text-base max-w-md mx-auto mb-8">
          Great job! You have answered all <span className="font-semibold text-teal-300">{session.questions.length} questions</span> for the{' '}
          <span className="font-semibold text-cyan-300">{session.targetRole}</span> position.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8 text-left">
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Target Role</span>
            <span className="text-sm font-semibold text-slate-200">{session.targetRole}</span>
          </div>
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Questions Answered</span>
            <span className="text-sm font-semibold text-teal-300">{session.questions.length} / {session.questions.length}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold px-8 py-3 rounded-xl shadow-lg shadow-teal-500/20"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.round(((currentQuestionIndex + 1) / session.questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto my-8 px-4 sm:px-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs px-3 py-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-medium">
            Role: {session.targetRole}
          </span>
        </div>
      </div>

      {/* Glass Panel Main Card */}
      <Card className="bg-slate-900/85 border border-slate-800/90 backdrop-blur-xl rounded-3xl text-white shadow-2xl overflow-hidden">
        {/* Progress Bar Header */}
        <div className="w-full bg-slate-800/40 h-1.5 relative">
          <div
            className="bg-gradient-to-r from-teal-400 to-cyan-400 h-1.5 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <CardContent className="p-6 sm:p-8">
          {/* Category Pill & Counter */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              {currentQuestion?.category || 'General'}
            </span>

            <span className="text-xs font-semibold text-slate-400 tracking-wider">
              Question <span className="text-teal-300 font-bold">{currentQuestionIndex + 1}</span> of {session.questions.length}
            </span>
          </div>

          {/* Question Text Box */}
          <div className="relative p-6 sm:p-8 bg-slate-950/60 border border-slate-800/80 rounded-2xl mb-8">
            <h2 className="text-xl sm:text-2xl font-medium text-slate-100 leading-relaxed mb-4">
              "{currentQuestion?.questionText}"
            </h2>

            {/* Audio Control Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 text-xs">
              <div className="flex items-center gap-2">
                {isLoadingAudio ? (
                  <span className="inline-flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> Loading question audio...
                  </span>
                ) : isPlayingAudio ? (
                  <span className="inline-flex items-center gap-2 text-teal-300">
                    <Volume2 className="w-4 h-4 text-teal-400 animate-pulse" /> Playing question audio...
                  </span>
                ) : (
                  <span className="text-slate-400">Listen to interviewer prompt:</span>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => currentQuestion && fetchAndPlayQuestionTTS(currentQuestion.id)}
                disabled={isLoadingAudio}
                className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs h-8 px-3"
              >
                <RotateCcw className="w-3 h-3 mr-1.5" /> Replay Audio
              </Button>
            </div>
          </div>

          {/* Voice Answer Recording Section */}
          <div className="p-6 bg-slate-950/40 border border-slate-800/60 rounded-2xl flex flex-col items-center justify-center text-center">
            {/* 1. NOT RECORDING & NO AUDIO YET */}
            {!isRecording && !recordedAudioUrl && (
              <div className="py-6 flex flex-col items-center">
                <button
                  onClick={startRecording}
                  className="group relative w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 rounded-full flex items-center justify-center shadow-xl shadow-teal-500/25 transition-all transform hover:scale-105 mb-4"
                >
                  <Mic className="w-9 h-9 text-slate-950 group-hover:scale-110 transition-transform" />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500"></span>
                  </span>
                </button>

                <h3 className="text-lg font-semibold text-slate-200 mb-1">Record Your Spoken Answer</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click the microphone when ready to answer out loud using your voice.
                </p>
              </div>
            )}

            {/* 2. RECORDING IN PROGRESS */}
            {isRecording && (
              <div className="py-6 flex flex-col items-center">
                {/* Live Timer Counter */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  <span className="text-2xl font-mono font-bold text-rose-400 tracking-wider">
                    {formatTimer(recordingTime)}
                  </span>
                </div>

                {/* Animated Audio Wave Visualizer */}
                <div className="flex items-center gap-1.5 h-12 my-3">
                  {[40, 70, 30, 90, 50, 80, 40, 100, 60, 30, 80, 50].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-teal-500 to-cyan-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${(i % 4) * 0.15}s`,
                      }}
                    />
                  ))}
                </div>

                <p className="text-xs text-slate-300 mb-6">Recording spoken answer... Speak clearly into your mic.</p>

                <Button
                  onClick={stopRecording}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-rose-500/20"
                >
                  <Square className="w-4 h-4 mr-2 fill-current" /> Stop Recording
                </Button>
              </div>
            )}

            {/* 3. RECORDED AUDIO PREVIEW & SUBMIT */}
            {!isRecording && recordedAudioUrl && (
              <div className="w-full py-4 flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Answer Recorded ({formatTimer(recordingTime)})
                </div>

                {/* Audio Player Preview */}
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-3 rounded-xl mb-6">
                  <audio src={recordedAudioUrl} controls className="w-full h-9 accent-teal-400" />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
                  <Button
                    variant="outline"
                    onClick={startRecording}
                    disabled={isSubmitting}
                    className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Re-record Answer
                  </Button>

                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold px-6"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        Submit & Next Question <Send className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewSession;
