import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse as parseUrl } from 'url';
import { prisma } from '../db.js';
import { createGeminiLiveSession, GeminiLiveSessionWrapper } from './geminiLive.js';

export function setupLiveInterviewWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parseUrl(request.url || '', true);

    if (pathname === '/api/interview/live' || pathname === '/ws/interview') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (ws: WebSocket, request) => {
    const parsedUrl = parseUrl(request.url || '', true);
    const sessionId = (parsedUrl.query.sessionId as string) || (parsedUrl.query.id as string);

    console.log(`🔌 Incoming WebSocket connection for Live Interview (Session ID: "${sessionId || 'missing'}")`);

    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing required sessionId query parameter' }));
      ws.close(1008, 'Missing sessionId');
      return;
    }

    let geminiLiveSession: GeminiLiveSessionWrapper | null = null;

    try {
      // 1. Fetch InterviewSession and pre-generated InterviewQuestions from Postgres via Prisma
      const sessionRecord = await prisma.interviewSession.findUnique({
        where: { id: sessionId.trim() },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!sessionRecord) {
        console.warn(`⚠️ WebSocket connection rejected: InterviewSession [${sessionId}] not found`);
        ws.send(JSON.stringify({ type: 'error', message: `Interview session "${sessionId}" not found` }));
        ws.close(1008, 'Session not found');
        return;
      }

      console.log(`🎙️ Initializing Gemini Live bridge for Session [${sessionRecord.id}] (${sessionRecord.questions.length} questions, Target Role: "${sessionRecord.targetRole}")`);

      // 2. Open Gemini Live API connection
      geminiLiveSession = await createGeminiLiveSession({
        sessionId: sessionRecord.id,
        targetRole: sessionRecord.targetRole,
        questions: sessionRecord.questions.map((q) => ({
          id: q.id,
          order: q.order,
          category: q.category,
          questionText: q.questionText,
        })),
        onAudioChunk: (chunk) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'audio', data: chunk.data, mimeType: chunk.mimeType }));
          }
        },
        onTranscriptChunk: (transcript) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'transcript', text: transcript.text, sender: transcript.sender }));
          }
        },
        onTurnComplete: () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'turn_complete' }));
          }
        },
        onError: (err) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: err?.message || 'Gemini Live session error' }));
          }
        },
        onClose: () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'session_closed' }));
          }
        },
      });

      // 3. Confirm connection to client
      ws.send(
        JSON.stringify({
          type: 'connected',
          sessionId: sessionRecord.id,
          targetRole: sessionRecord.targetRole,
          questionCount: sessionRecord.questions.length,
        })
      );

      // 4. Trigger initial Gemini interviewer greeting & Question 1
      geminiLiveSession.sendTextPrompt(
        `Hello! The candidate has joined the live session. Please greet the candidate and ask Question 1 now.`
      );

      // 5. Handle messages sent from client WebSocket
      ws.on('message', (message: WebSocket.RawData, isBinary: boolean) => {
        if (!geminiLiveSession) return;

        if (isBinary) {
          // Binary PCM audio buffer sent from client mic
          const buffer = Buffer.from(message as ArrayBuffer);
          const base64Data = buffer.toString('base64');
          geminiLiveSession.sendAudioChunk(base64Data, 'audio/pcm;rate=16000');
        } else {
          // Text/JSON payload sent from client
          try {
            const textStr = message.toString();
            const parsed = JSON.parse(textStr);

            if (parsed.type === 'audio' && parsed.data) {
              const mimeType = parsed.mimeType || 'audio/pcm;rate=16000';
              geminiLiveSession.sendAudioChunk(parsed.data, mimeType);
            } else if (parsed.type === 'text_prompt' && parsed.text) {
              geminiLiveSession.sendTextPrompt(parsed.text);
            } else if (parsed.type === 'start') {
              geminiLiveSession.sendTextPrompt('The candidate is ready. Please begin with Question 1.');
            }
          } catch (jsonErr) {
            console.warn('⚠️ Received non-JSON string message over WebSocket:', message.toString());
          }
        }
      });

      // 6. Handle client WebSocket disconnect
      ws.on('close', (code, reason) => {
        console.log(`🔌 Client WebSocket disconnected for Session [${sessionId}] (${code})`);
        if (geminiLiveSession) {
          geminiLiveSession.close();
          geminiLiveSession = null;
        }
      });

      ws.on('error', (wsErr) => {
        console.error(`❌ Client WebSocket error for Session [${sessionId}]:`, wsErr);
        if (geminiLiveSession) {
          geminiLiveSession.close();
          geminiLiveSession = null;
        }
      });
    } catch (error: any) {
      console.error(`❌ Failed to establish live interview WebSocket session [${sessionId}]:`, error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: error.message || 'Failed to initialize live session' }));
        ws.close(1011, 'Internal server error');
      }
    }
  });

  return wss;
}
