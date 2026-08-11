import { GoogleGenAI, Modality } from '@google/genai';

export interface InterviewQuestionItem {
  id: string;
  order: number;
  category: string;
  questionText: string;
}

export interface GeminiLiveOptions {
  sessionId: string;
  targetRole: string;
  questions: InterviewQuestionItem[];
  onAudioChunk: (chunk: { data: string; mimeType: string }) => void;
  onTranscriptChunk: (transcript: { text: string; sender: 'assistant' | 'user' }) => void;
  onTurnComplete?: () => void;
  onError?: (err: any) => void;
  onClose?: () => void;
}

export interface GeminiLiveSessionWrapper {
  sendAudioChunk: (base64Data: string, mimeType?: string) => void;
  sendTextPrompt: (text: string) => void;
  sendDoneAnsweringSignal: () => void;
  close: () => void;
}

export async function createGeminiLiveSession(
  options: GeminiLiveOptions
): Promise<GeminiLiveSessionWrapper> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  const formattedQuestions = options.questions
    .map((q) => `Question ${q.order} [${q.category}]: "${q.questionText}"`)
    .join('\n');

  const systemPrompt = `
You are an expert, professional AI interviewer conducting a live voice mock interview for the candidate targeting the role: "${options.targetRole}".

CRITICAL MANDATE - VERBATIM QUESTION READING:
You are provided with a fixed list of pre-generated interview questions below. You MUST read each question text EXACTLY VERBATIM word-for-word as written. Do NOT paraphrase, summarize, rephrase, or substitute any words in the question.

PRE-GENERATED QUESTIONS LIST:
${formattedQuestions}

STRICT INTERVIEW PROTOCOL:
1. For Question 1: Greet the candidate briefly (e.g. "Hello! Welcome to your mock interview.") and read Question 1 EXACTLY word-for-word as provided above.
2. Ask ONE question at a time. After asking a question, wait completely for the candidate's spoken answer.
3. After the candidate finishes their answer, provide a 1-sentence transition (e.g. "Thank you for sharing that. Let's move to Question 2.") and read the next question EXACTLY word-for-word as provided above.
4. STRICT WARNING: DO NOT improvise or alter the question text. The candidate's interview evaluation requires the exact questions listed above to be read verbatim.
5. Proceed sequentially until all ${options.questions.length} questions are read verbatim.
6. Conclude by thanking the candidate after the final answer.
`;

  const liveModelsToTry = [
    'gemini-3.1-flash-live-preview',
    'gemini-2.5-flash-native-audio-latest',
    'gemini-2.5-flash',
  ];

  let session: any = null;
  let activeModel = '';

  for (const modelName of liveModelsToTry) {
    try {
      console.log(`[GEMINI-LIVE-SVC] Connecting to Gemini Live API using model "${modelName}" for Session [${options.sessionId}]...`);
      session = await ai.live.connect({
        model: modelName,
        config: {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log(`[GEMINI-LIVE-SVC] ⚡ Gemini Live API WebSocket connected successfully (${modelName}).`);
          },
          onmessage: (msg: any) => {
            try {
              console.log(`[GEMINI-LIVE-RECV] Raw message keys:`, Object.keys(msg));
              if (msg.serverContent) {
                const sc = msg.serverContent;
                console.log(`[GEMINI-LIVE-RECV] serverContent flags: turnComplete=${sc.turnComplete}, interrupted=${sc.interrupted}, waitingForInput=${sc.waitingForInput}, modelTurnParts=${sc.modelTurn?.parts?.length || 0}`);
                
                if (sc.modelTurn) {
                  for (const part of sc.modelTurn.parts || []) {
                    if (part.text) {
                      console.log(`[GEMINI-LIVE-RECV] modelTurn.part.text: "${part.text}"`);
                      options.onTranscriptChunk({ text: part.text, sender: 'assistant' });
                    }
                    if (part.inlineData && part.inlineData.data) {
                      console.log(`[GEMINI-LIVE-RECV] modelTurn.part.inlineData audio chunk (${part.inlineData.data.length} base64 chars, ${part.inlineData.mimeType})`);
                      options.onAudioChunk({
                        data: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                      });
                    }
                  }
                }
                if (sc.outputTranscription?.text) {
                  console.log(`[GEMINI-LIVE-RECV] outputTranscription text: "${sc.outputTranscription.text}"`);
                  options.onTranscriptChunk({
                    text: sc.outputTranscription.text,
                    sender: 'assistant',
                  });
                }
                if (sc.inputTranscription?.text) {
                  console.log(`[GEMINI-LIVE-RECV] inputTranscription text: "${sc.inputTranscription.text}"`);
                  options.onTranscriptChunk({
                    text: sc.inputTranscription.text,
                    sender: 'user',
                  });
                }
                if (sc.turnComplete && options.onTurnComplete) {
                  console.log(`[GEMINI-LIVE-RECV] turnComplete flag received from Gemini`);
                  options.onTurnComplete();
                }
              }
            } catch (msgErr) {
              console.warn('[GEMINI-LIVE-SVC] Error parsing Gemini Live server message:', msgErr);
            }
          },
          onerror: (err: any) => {
            console.error('[GEMINI-LIVE-SVC] ❌ Gemini Live API connection error:', err?.message || err);
            if (options.onError) options.onError(err);
          },
          onclose: (e: any) => {
            console.log(`[GEMINI-LIVE-SVC] 🔌 Gemini Live API connection closed for Session [${options.sessionId}]`);
            if (options.onClose) options.onClose();
          },
        },
      });

      activeModel = modelName;
      console.log(`[GEMINI-LIVE-SVC] ✅ Established Gemini Live session with model "${activeModel}"`);
      break;
    } catch (err: any) {
      console.warn(`[GEMINI-LIVE-SVC] ⚠️ Failed to connect Gemini Live with model "${modelName}":`, err?.message || err);
    }
  }

  if (!session) {
    throw new Error('Unable to establish Gemini Live API session with any available live model.');
  }

  return {
    sendAudioChunk: (base64Data: string, mimeType: string = 'audio/pcm;rate=16000') => {
      try {
        // Log audio chunk sending periodically (e.g. sample)
        session.sendRealtimeInput({
          mediaChunks: [
            {
              mimeType,
              data: base64Data,
            },
          ],
        });
      } catch (err: any) {
        console.error('[GEMINI-LIVE-SVC] ❌ Error sending audio chunk to Gemini Live API:', err?.message || err);
      }
    },
    sendTextPrompt: (text: string) => {
      try {
        console.log(`[GEMINI-LIVE-SEND] Sending text prompt to Gemini Live: "${text}"`);
        session.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        });
      } catch (err: any) {
        console.error('[GEMINI-LIVE-SVC] ❌ Error sending text prompt to Gemini Live API:', err?.message || err);
      }
    },
    sendDoneAnsweringSignal: () => {
      try {
        console.log(`[GEMINI-LIVE-SEND] Sending Done Answering turn completion signal to Gemini Live`);
        // Send client turn complete and audioStreamEnd signal to indicate end of user speech
        session.sendRealtimeInput({
          audioStreamEnd: true,
        });
        session.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [{ text: "I have finished my answer to the question. Please provide your brief feedback and move to the next question." }],
            },
          ],
          turnComplete: true,
        });
      } catch (err: any) {
        console.error('[GEMINI-LIVE-SVC] ❌ Error sending done answering signal:', err?.message || err);
      }
    },
    close: () => {
      try {
        session.close();
      } catch (err: any) {
        // Ignore close errors
      }
    },
  };
}
