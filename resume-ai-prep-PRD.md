# PrepSense — AI Resume Analyzer + Voice Interview Coach
### Product Spec & Build Plan

*A role-agnostic portfolio project (any field, any candidate) — built by Aditya, executed with Google Antigravity*

---

## Why this project (positioning)

Most fresher "AI resume analyzer" projects are a GPT wrapper with a text box. This one is different for two reasons a recruiter will actually notice:

1. **It's role-agnostic by design, not by accident.** A software engineer, a marketer, a finance analyst, and a PM all get a genuinely tailored resume review and interview — because the system reasons about what "good" looks like for their field instead of running one hardcoded rubric. That's a harder, more interesting engineering problem than a single-role tool, and it's a bigger portfolio story: you built a configurable AI system, not a script with PM trivia baked in.
2. **Voice mock interview is the differentiator.** It forces you to solve state management, audio pipelines, and evaluation logic — real system design, not just prompt-chaining. It also gives you a natural demo video, which most fresher projects don't have.

Treat this doc itself as part of your portfolio artifact — you wrote a PRD, scoped it with MoSCoW, then shipped it. That narrative is worth as much as the code in an interview, for any role you apply to.

---

## 1. Problem Statement

Freshers applying to any role — engineering, PM, marketing, finance, design, whatever — get generic resume feedback (Grammarly-level, not field-specific) and have no low-stakes way to rehearse interviews out loud before the real thing. Text-based prep tools don't build the verbal fluency and pacing that actual interviews test, and generic tools don't know that a "good answer" for a data analyst interview looks nothing like a good answer for a sales interview. The cost of skipping this: weaker first-round performance, no structured way to see improvement over multiple attempts.

## 2. Goals

- User can get a role-specific resume score + actionable rewrite suggestions in under 2 minutes from upload.
- User can run a full voice mock interview (5-7 questions) tailored to their resume + target role, and get structured feedback per answer.
- User can see improvement across sessions (score trend), not just a one-off score.
- **Portfolio goal:** a deployed, demoable product with a clear PRD → build → metrics story for interviews.

## 3. Non-Goals (v1)

- No auto-apply / job scraping — out of scope, different product entirely.
- No multi-language support beyond English at launch — Hindi-English mock interview mode is a good P2/future idea (you're well positioned for it) but adds STT/TTS complexity now.
- No live continuous voice conversation (like a phone call) — v1 is turn-based (ask → record → respond → next). True streaming duplex is a v2 problem, not worth the build risk in 2 weeks.
- No team/multi-user org features — single-user product only.

## 4. Primary User

Fresher or early-career candidate from any field (tech, product, marketing, finance, design, ops, etc.) prepping for interviews, resume in hand, wants targeted feedback fast and a way to rehearse out loud without a human on the other end. The user tells the product their target role/field — the product adapts everything downstream to it.

## 5. User Stories

- As a candidate in any field, I want to specify my target role and upload my resume, so the feedback and interview questions actually match what my field's interviewers ask.
- As a candidate, I want to paste a target JD, so I get a match score and specific gaps instead of generic tips.
- As a candidate, I want bullet-level rewrite suggestions, so I know exactly what to change, not just "improve clarity."
- As a candidate, I want an AI to ask me interview questions out loud that are appropriate for my field (technical for an SDE, case-based for a PM, campaign questions for a marketer, etc.), so I practice the interview I'll actually get.
- As a candidate, I want spoken feedback on structure (STAR), specificity, and filler words after each answer, so I know what to fix before the next question.
- As a candidate, I want to see my scores across multiple sessions, so I know if I'm actually improving.

## 6. Requirements (MoSCoW)

### Must-Have (P0)
| Feature | Acceptance Criteria |
|---|---|
| Target role input | User specifies target role/field as free text (e.g. "SDE", "Digital Marketing", "Investment Banking Analyst") at onboarding — drives every downstream AI call |
| Resume upload (PDF/DOCX) | File parsed to structured JSON (contact, experience, skills, education, projects) within 10s |
| Resume analysis | Given resume + target role + optional JD, returns an AI content-quality score, a deterministic format-compatibility check (separate from the AI score), JD match %, and section-wise feedback relevant to that field |
| Rewrite suggestions | At least 3 specific bullet-level rewrite suggestions with before/after, phrased for the target field's norms |
| Role-adaptive question categories | LLM infers the right mix of question types for the given field (e.g. technical + system design + behavioral for SDE; product sense + execution + behavioral for PM; campaign strategy + analytics + behavioral for marketing) rather than a fixed category list |
| Voice interview session | 5-7 personalized questions generated from resume + target role using the inferred categories; AI asks via TTS, user answers via mic |
| Answer transcription | User's spoken answer transcribed accurately (STT) and stored |
| Answer evaluation | Each answer scored on structure (STAR), specificity, relevance; feedback text generated |
| Session summary | End-of-session report: per-question scores + overall summary + top 2 improvement areas |
| Auth | Google sign-in (Passport OAuth + JWT), resumes/sessions tied to user account |

### Nice-to-Have (P1)
| Feature | Why it matters |
|---|---|
| Score trend dashboard across sessions | Proves the "improvement over time" story — strong demo moment |
| User-submitted Success Stories (moderated) | Real users can submit a short success story post-signup; only manually-approved stories show publicly on the landing page — avoids fake social proof |
| Resources page (DB-backed) | Interview/resume prep articles stored in Postgres, listed + detail pages; content managed via seed data/Prisma Studio, no admin UI built yet |
| Role auto-suggestion from resume | If user leaves target role blank, infer a likely role from resume content and let them confirm/edit it |
| Filler-word / pacing detection from transcript | Extra polish signal, easy to add once transcript exists |
| Resume version history | Shows product thinking about iteration |
| Rate limiting on AI endpoints (Redis) | Cost control — talk about this in interviews as a scaling decision |

### Future Considerations (P2)
- Hindi-English bilingual mock interview mode
- Streaming real-time voice (no turn-based wait)
- Peer/mentor review sharing link
- Browser extension to pull JD directly from LinkedIn job posts

## 7. Success Metrics

**Leading (for the "if this were a real product" story):**
- Upload → analysis completion rate (target: >80%)
- % of users who start a session who complete it (target: >60% — voice sessions have real drop-off risk, worth designing against)

**Lagging:**
- Return usage: % of users who come back for a 2nd session
- Self-reported confidence delta (simple 1-5 rating pre/post, shown in session summary)

## 8. Open Questions
- ~~STT provider choice~~ — resolved: using Gemini's native audio understanding for transcription, no separate STT provider needed
- Store raw audio or just transcripts? Storing audio adds R2 cost + privacy surface area for little extra value — default to transcripts only, revisit if demo needs playback (product, non-blocking)

---

## 9. Technical Architecture

Built as a **client-server split** — matches your Campus Cloud pattern (separate frontend + backend), just React instead of Next.js on the client. Two deployable services, one repo.

**Stack:**
- **Frontend:** React 18 + Vite + TypeScript, Tailwind + shadcn/ui, React Router (routing), TanStack Query (server state/caching for all API calls)
- **Backend:** Express + TypeScript, structured as feature-based modules (same pattern as VCCN's backend)
- **DB:** PostgreSQL (Neon — free tier, serverless) + Prisma ORM, used from the Express server
- **Auth:** Google OAuth via Passport.js (`passport-google-oauth20`) on the server → issues a JWT → client stores it and sends it as a Bearer token on every request
- **File upload:** Multer on the server (memory storage) → streamed to Cloudflare R2
- **AI/LLM:** Gemini API (`gemini-3-flash` or similar) via `@google/genai` SDK — structured extraction, analysis, question gen, answer evaluation (all as JSON-schema-constrained calls), called server-side only (never expose the API key to the client). Free tier via Google AI Studio (1,500 requests/day) comfortably covers this project end to end — no billing setup needed.
- **TTS:** Gemini native audio generation (e.g. `gemini-3.1-flash-tts-preview` or current equivalent — resolve dynamically the same way as the text models), called server-side. 30+ voices, natural-language style control, free tier with rate limits — no separate account needed.
- **STT:** Gemini native audio understanding — send the recorded answer audio directly to a Gemini multimodal call for transcription, called server-side. Same API key, same free tier as everything else.
- **File storage:** Cloudflare R2 (resume files + generated TTS audio; S3-compatible, 10GB free permanently — requires a card on file for activation, but no charge unless you exceed the free tier)
- **Cache/rate-limit:** Upstash Redis, used via `express-rate-limit` + a Redis store
- **Deployment:** frontend on Vercel/Netlify (static build), backend on Railway or Render (Express needs a persistent process, not a serverless function — this also means no serverless timeout to worry about for long LLM/audio calls)

**Skip for v1 (add only if you have time):** a separate BullMQ worker. A persistent Express server handles multi-second LLM/audio calls fine without one. Mention the queue-based scaling path in your case study instead of building it — legitimate system-design talking point either way.

**One thing to get right early:** CORS. The client (Vercel) and server (Railway/Render) are different origins, so lock down `cors()` to your frontend's exact origin, and make sure the JWT auth header survives preflight requests — this trips people up on the first split-stack deploy.

### Core data flow — Voice Interview
```
1. Client: session start request → Server: LLM generates 5-7 questions (resume + role context) → stored, order fixed → returns first question
2. Client requests TTS for question N → Server: TTS(question text) via Gemini native audio generation → audio returned → client plays it
3. Client records answer (MediaRecorder API) → uploads audio blob to Server → Server: STT → transcript
4. Server: transcript → LLM evaluation (STAR structure, specificity, relevance) → score + feedback stored → returns next question
5. Repeat for N+1 → after last question → Server: LLM generates session summary → returned to client
```

### Data Model (Prisma sketch)
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  targetRole String?
  resumes   Resume[]
  sessions  InterviewSession[]
}

model Resume {
  id         String   @id @default(cuid())
  userId     String
  fileUrl    String
  parsedJson Json
  version    Int      @default(1)
  createdAt  DateTime @default(now())
  analyses   Analysis[]
}

model Analysis {
  id                  String   @id @default(cuid())
  resumeId            String
  jdText              String?
  aiQualityScore       Int      // Gemini's subjective content/keyword quality score (0-100) — NOT a real ATS simulation
  matchScore          Int?
  feedbackJson        Json
  formatCompatibility Json     // deterministic, rule-based checks: scanned-PDF detection, embedded images, tables, multi-column layout, missing standard sections
  createdAt           DateTime @default(now())
}

model InterviewSession {
  id          String   @id @default(cuid())
  userId      String
  resumeId    String?
  targetRole  String
  status      String   // in_progress | completed
  summaryJson Json?
  createdAt   DateTime @default(now())
  completedAt DateTime?
  questions   InterviewQuestion[]
}

model InterviewQuestion {
  id           String   @id @default(cuid())
  sessionId    String
  order        Int
  category     String   // free-form, LLM-assigned per target role (e.g. "technical", "system_design", "behavioral" for SDE; "product_sense", "execution" for PM; "campaign_strategy", "analytics" for marketing)
  questionText String
  answer       InterviewAnswer?
}

model InterviewAnswer {
  id             String   @id @default(cuid())
  questionId     String   @unique
  transcript     String
  evaluationJson Json
  scoreOverall   Int
  createdAt      DateTime @default(now())
}
```

### Key API routes (Express server)
- `GET /api/auth/google` / `GET /api/auth/google/callback` — Passport Google OAuth flow → issues JWT
- `POST /api/resume/upload` — multipart upload (multer) → parse + store
- `POST /api/resume/:id/analyze` — body: `{ jdText? }` → returns Analysis
- `POST /api/interview/session` — body: `{ resumeId, targetRole }` → creates session + generates questions
- `POST /api/interview/session/:id/answer` — multipart audio upload for current question → transcribe + evaluate + return next question audio URL
- `GET /api/interview/session/:id` — full session with results
- `GET /api/dashboard` — aggregate stats across resumes + sessions

All routes except `/api/auth/*` require the JWT Bearer token (Express middleware validates it and attaches `req.user`).

---

## 10. Phased Build Plan (10-12 working days, buffer for the rest of week 2)

Each phase below has a ready-to-paste **Antigravity task prompt**. Give it one phase at a time in Planning Mode, review the plan it proposes before letting it execute, and check its Artifacts (screenshots/browser verification) before moving to the next phase.

> **Note:** Success Stories and the static Resources page (originally scoped for Phase 5) were built ahead of schedule, before Phase 1, as part of finishing the landing page early. Keep an eye on buffer time before Phase 3 (voice interview) as a result.

### Phase 0 — Setup (half day)
> **Antigravity prompt:** "Scaffold a monorepo with two folders: `client` (React 18 + Vite + TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query) and `server` (Express + TypeScript, Prisma with PostgreSQL via env var DATABASE_URL). In server, set up Passport.js with the Google OAuth 2.0 strategy, and on successful auth issue a JWT that the client stores and sends as a Bearer token. Configure CORS on the server to allow only the client's origin, with credentials support. Create a basic client layout with a nav bar, a login page, and an empty dashboard route protected by an auth check. Set up .env.example files in both folders with all required keys. Verify both apps run locally (e.g. via concurrently or two terminal scripts) and that Google sign-in works end to end, with the client successfully calling one authenticated test endpoint on the server."

### Phase 1 — Resume Upload & Parsing (Day 1-2)
> **Antigravity prompt:** "Build a resume upload flow. Client: a page where a signed-in user enters their target role/field (free text input, e.g. 'Software Engineer', 'Product Manager', 'Digital Marketing') and uploads a PDF or DOCX file via a form using fetch/axios with multipart/form-data. Server: an Express route handling the multipart upload with multer (memory storage), saving targetRole on the User record, uploading the file to Cloudflare R2 (S3-compatible client), and saving the URL to a new Resume record in Postgres via Prisma. Extract raw text using pdf-parse for PDFs and mammoth for DOCX. Send the extracted text to the Gemini API with a JSON schema prompt to extract structured fields: contact info, work experience, skills, education, projects. Save the structured JSON to the Resume record and return it to the client. Show the parsed resume in a clean UI after upload. Handle parse failures gracefully with a clear error state on both ends."

### Phase 2 — AI Resume Analysis (Day 3-4)
> **Antigravity prompt:** "Build a resume analysis feature. Client: on the resume detail page, add a text area for pasting a job description (optional) and a submit button that calls the server. Server: an Express route that takes resumeId + optional jdText, calls the LLM with the resume JSON + the user's targetRole + JD text to generate: an ATS compatibility score (0-100) with reasoning specific to norms for that field, a JD match score (0-100) if a JD was provided, section-by-section feedback, and at least 3 specific bullet-point rewrite suggestions (before/after format) phrased the way that field's resumes are actually written. Store this as an Analysis record linked to the resume via Prisma and return it. Client: build a results UI with score cards, expandable feedback sections, and the rewrite suggestions, fetched via TanStack Query."

### Phase 3 — Voice Interview Module (Day 5-7, the core differentiator — give this the most time)
> **Antigravity prompt (break into sub-tasks if the agent's plan looks too large):**
> 1. "Build session creation: given a resumeId and a free-text targetRole, first prompt the LLM to infer 4-5 appropriate interview question categories for that specific role (e.g. for 'Software Engineer' → technical, system_design, behavioral, problem_solving; for 'Product Manager' → product_sense, execution, behavioral, metrics; for 'Digital Marketer' → campaign_strategy, analytics, behavioral, creative_thinking). Then generate 5-7 questions distributed across those categories, personalized using resume content. Save as InterviewQuestion records with the LLM-assigned category label."
> 2. "Build the interview session UI in the React client: display the current question, request its TTS audio from the server (Express route calling Gemini's native audio generation) and auto-play the returned audio, show a record button using the browser MediaRecorder API, let the user record and stop their answer, then upload the audio blob to the answer endpoint via multipart/form-data."
> 3. "Build the answer endpoint on the Express server: receive the audio via multer, transcribe it by sending the audio directly to Gemini for native audio understanding (no separate STT provider), send the transcript + question to Gemini for evaluation (STAR structure score, specificity score, relevance score, written feedback), save as InterviewAnswer via Prisma, and return the next question's TTS audio (or a session-complete signal on the last question) to the client. Use the same dynamic model-resolution pattern already built for resume analysis."
> 4. "Build the session summary page: overall score, per-question breakdown with transcripts and feedback, and 2 top improvement areas generated by the LLM."
>
> Test this phase yourself end to end with your own voice before moving on — this is the part most likely to have real UX rough edges (mic permissions, audio playback timing, silence detection).

### Phase 4 — Dashboard & Progress Tracking (Day 8-9)
> **Antigravity prompt:** "Build a dashboard page showing: resume version history with analysis scores over time, a list of past interview sessions with overall scores, and a line chart (recharts) of interview scores across sessions to show improvement trend. Add a summary card showing most frequent weak-area tags across sessions."

### Phase 5 — Polish (Day 10-11)
> **Antigravity prompt:** "Add a landing page to the React client explaining the product. Add loading states for all API calls (skeleton loaders via TanStack Query's isLoading), empty states for no resumes/no sessions, and error boundaries for failed calls with retry. Make the app fully responsive. On the Express server, add rate limiting middleware using express-rate-limit with an Upstash Redis store on the analyze and interview-session routes (e.g. 10 requests per user per hour) to control API costs."

### Phase 6 — Deploy & Document (Day 12-14)
- Deploy client to Vercel/Netlify and server to Railway/Render as two separate services; connect Neon + Upstash + R2 in the server's production env vars, and point the client's API base URL at the deployed server. Double-check CORS origin and cookie/JWT settings work cross-origin in production, not just localhost.
- **Google OAuth brand verification**: once the client has a real deployed domain, verify domain ownership in Google Search Console, confirm the landing page publicly describes the app (not just a login screen), publish a Privacy Policy page on the same domain and link it in the OAuth consent screen, then submit for Brand Verification (basic Sign-In scopes only — ~2-3 business days, not the full sensitive-scope review). Until this completes, add specific reviewer/recruiter emails to the OAuth consent screen's test user list so their login doesn't hit "Access denied."
- Write a README covering problem, architecture decisions (why a separate client/server split, the queue-skipping decision, turn-based vs streaming voice, etc.) — this doubles as interview talking points.
- Record a 2-minute demo video: upload resume → get analysis → run a mock interview question → show the summary.
- Write a one-page case study (problem → approach → what you'd do differently at scale) for your portfolio/LinkedIn.

---

## 11. Cost Awareness (mention this in interviews — it's a real PM signal)

Per session roughly: 1 question-gen LLM call + ~6 TTS calls + ~6 STT calls + ~6 evaluation LLM calls + 1 summary call — all Gemini, all within the same 1,500 req/day free tier. This is a meaningful simplification over separate TTS/STT vendors: one API key, one rate limit to watch, no per-character/per-minute billing to track. Still worth the P1 rate limiting (cap sessions per user) so a stress-test or bot doesn't burn through the shared daily quota before a real demo.