import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleResources = [
  {
    title: 'How to Structure a Winning STAR Method Answer',
    slug: 'how-to-structure-a-star-answer',
    category: 'Interview Tips',
    summary: 'Master the Situation, Task, Action, and Result framework to deliver crisp, memorable behavioral interview answers that hiring managers love.',
    content: `
# How to Structure a Winning STAR Method Answer

Behavioral questions like *"Tell me about a time you handled a tight deadline"* or *"Describe a conflict with a teammate"* account for over **60% of interview evaluation scores**. 

The **STAR method** is the universal golden standard for answering behavioral interview questions clearly without rambling.

---

## What is the STAR Framework?

- **S - Situation**: Set the scene. Give concise context (1–2 sentences).
- **T - Task**: Describe your specific responsibility or challenge (1 sentence).
- **A - Action**: Explain the specific steps **you** took. This should be 60% of your answer.
- **R - Result**: Share the quantifiable outcome, metrics, or key takeaway.

---

## Step-by-Step Breakdown

### 1. Situation (10-15%)
Set the context quickly. Mention the project, team size, or company environment.
> *"At my previous tech internship, our team was migrating our core React client to a modern server-rendered stack 3 weeks before a major product release."*

### 2. Task (10-15%)
Clarify the bottleneck or goal you personally owned.
> *"I was tasked with resolving bundle size bloat and eliminating main-thread rendering lag on low-end mobile devices."*

### 3. Action (55-60%)
Use strong action verbs ("I engineered...", "I led...", "I benchmarked..."). Avoid saying "we did" — highlight **your personal contribution**.
> *"I profiled the bundle using Webpack Analyzer, identified heavy unused libraries, replaced them with lightweight native alternatives, and implemented dynamic code splitting for sub-routes."*

### 4. Result (15-20%)
Quantify your impact whenever possible!
> *"As a result, initial page load speeds improved by 42%, Lighthouse performance scores jumped from 68 to 94, and we shipped the release 2 days ahead of schedule."*

---

## 3 Golden Rules for STAR Answers
1. **Keep it under 2 minutes**: Any answer longer than 120 seconds risks losing the interviewer's attention.
2. **Quantify the outcome**: Use real metrics (% performance boost, revenue saved, hours reduced).
3. **Be honest about trade-offs**: Briefly mentioning a hurdle you overcame builds immense credibility.
`,
  },
  {
    title: 'Top 7 Common Resume ATS Mistakes (And How to Fix Them)',
    slug: 'common-resume-ats-mistakes',
    category: 'Resume',
    summary: 'Learn why Applicant Tracking Systems (ATS) reject qualified candidates and how to optimize your formatting and keyword matching.',
    content: `
# Top 7 Common Resume ATS Mistakes (And How to Fix Them)

Over 75% of resumes submitted online are parsed by an **Applicant Tracking System (ATS)** before a human recruiter ever sees them. Here are the 7 biggest traps candidates fall into:

---

## 1. Using Complex Tables, Columns, or Graphics
Many ATS parsers read left-to-right across the page linearly. Multi-column layouts often cause text to merge incoherently across columns.
- **Fix**: Use clean, single-column or simple standard top-to-down vertical layouts.

## 2. Placing Critical Info inside Headers or Footers
Many legacy ATS scanners completely ignore header and footer regions.
- **Fix**: Put your contact details, phone number, and LinkedIn URL directly in the document body top.

## 3. Ignoring Job Description Keywords
If a job description repeatedly asks for *"React.js, REST APIs, and Jest"*, but your resume only says *"Web Development"*, your ATS match score will plummet.
- **Fix**: Mirror exact phrases and hard skills from the target job posting naturally into your experience bullet points.

## 4. Saving as an Unreadable PDF Format
Not all PDFs are created equal. Image-based PDFs (scans) cannot be parsed by text extractors.
- **Fix**: Ensure your PDF allows text highlighting, or export directly from Word/Google Docs as standard PDF.

## 5. Overusing Vague Buzzwords
Terms like *"hardworking team player"* or *"detail-oriented"* add zero ATS score value.
- **Fix**: Replace fluff with quantifiable achievements (e.g., *"Optimized SQL queries to reduce latency by 35%"*).

## 6. Non-Standard Section Titles
Using creative titles like *"My Journey"* instead of *"Work Experience"* confuses system parsers.
- **Fix**: Stick to universal standard headings: **Experience**, **Projects**, **Skills**, **Education**.

## 7. Skipping Action-Oriented Bullet Points
Unfocused bullet points that read like job descriptions won't rank high.
- **Fix**: Start every bullet point with a strong action verb (*Built*, *Architected*, *Spearheaded*, *Reduced*).
`,
  },
  {
    title: 'What to Research About a Company Before Your Interview',
    slug: 'what-to-research-before-an-interview',
    category: 'Interview Prep',
    summary: 'Stand out from other applicants by conducting targeted research on product roadmap, business model, engineering stack, and company culture.',
    content: `
# What to Research About a Company Before Your Interview

Showing up to an interview knowing only what's on the homepage is a red flag. High-performing candidates perform targeted research to ask insightful questions and align their answers with the company's goals.

---

## The 4 Pillars of Pre-Interview Research

### 1. Product & Core Business Model
- How does the company make money? (B2B SaaS, Marketplace, Enterprise Sales, Ads?)
- Who is their core user persona?
- Try using their product or watching a live demo before the call!

### 2. Recent News & Engineering Blog Posts
- Search Google News for recent company press releases or funding rounds.
- Check their engineering blog or TechCrunch coverage to see what architecture challenges they are currently tackling.

### 3. Competitors & Market Landscape
- Identify 2-3 main competitors.
- Understand what differentiates this company from competitors in terms of features or market positioning.

### 4. Interviewer Profile
- Look up your interviewer on LinkedIn.
- Check their role, tenure at the company, and past work history to tailor your technical conversation.

---

## Great Questions to Ask at the End of the Interview
> *"I noticed your team recently launched [Feature X]. What were the biggest technical or product challenges in rolling that out?"*

> *"What does success look like for someone in this role over the first 90 days?"*
`,
  },
  {
    title: 'How to Talk About Your Weaknesses Honestly in an Interview',
    slug: 'how-to-talk-about-weaknesses-honestly',
    category: 'Interview Tips',
    summary: 'Avoid humblebrags like "I work too hard". Learn how to select a genuine weakness and demonstrate real growth and self-awareness.',
    content: `
# How to Talk About Your Weaknesses Honestly in an Interview

*"What is your greatest weakness?"* is a test of self-awareness and accountability. Cliche answers like *"I'm a perfectionist"* or *"I care too much about my work"* sound insincere and unreflective.

---

## The Winning Strategy

1. **Pick a Real, non-fatal Weakness**: Choose a genuine skill or habit that is relevant, but not a dealbreaker for the core job responsibilities.
2. **Explain the Impact**: Briefly mention how you recognized this weakness.
3. **Show Your Actionable Solution**: Spend 70% of your response explaining the system or habit you implemented to address it.

---

## Example Response

> *"Early in my projects, I used to struggle with delegating minor technical tasks, often taking on too much responsibility myself. I realized this created bottlenecks during crunch weeks.*
>
> *To solve this, I started implementing clear task ownership in GitHub projects and using daily standups to check in. Over the past year, this shift improved team velocity and taught me how to empower peers effectively."*

---

## Red Flags to Avoid
- **Humblebragging**: *"I work too hard and forget to sleep."*
- **Disqualifying Weaknesses**: *"I dislike writing code and testing."* (for a Software Engineer role)
- **Defensiveness**: Pretending you have no weaknesses.
`,
  },
  {
    title: 'Mastering "Tell Me About Yourself" (The 3-Part Framework)',
    slug: 'how-to-answer-tell-me-about-yourself',
    category: 'Interview Prep',
    summary: 'Ace the opening question of any interview with the Present-Past-Future narrative structure in under 90 seconds.',
    content: `
# Mastering "Tell Me About Yourself" (The 3-Part Framework)

"Tell me about yourself" is almost always the first question in any interview. It sets the tone for the entire conversation.

---

## The Present-Past-Future Framework

### 1. Present (30 Seconds)
Start with your current role, background, and key focus area.
> *"Currently, I'm a final-year Computer Science student specializing in full-stack web development and scalable RESTful API design..."*

### 2. Past (30-45 Seconds)
Highlight 1-2 major past projects, internships, or achievements relevant to the position.
> *"Over the past year, I built an automated resume review pipeline using Node.js and OpenAI APIs that reduced review time for peers by 60%..."*

### 3. Future (15-20 Seconds)
Explain why you are excited about **this specific role** and company.
> *"I'm really excited about this opportunity at your company because of your focus on high-scale candidate experiences, and I'd love to bring my backend skills to your engineering team."*

---

## Pro Tip
Keep your answer between **60 to 90 seconds**. Practice it out loud until it sounds conversational, not memorized!
`,
  },
  {
    title: 'Cracking Software Engineering Interviews: DSA, System Design & Behavioral',
    slug: 'cracking-software-engineering-interviews',
    category: 'Software Engineering',
    summary: 'A field guide to the three pillars of an SDE loop — data structures & algorithms, system design, and engineering behavioral questions — and how much weight each gets by level.',
    content: `
# Cracking Software Engineering Interviews: DSA, System Design & Behavioral

Most SDE loops (new-grad through senior) test three distinct skills. Confusing which one is being tested in the moment is the #1 reason strong engineers underperform.

---

## 1. Data Structures & Algorithms (DSA)
This is a **communication test disguised as a coding test**. Interviewers care more about your process than the final answer.

- **Clarify first**: restate constraints, ask about input size and edge cases (empty input, duplicates, negative numbers) before writing a line of code.
- **Think out loud**: narrate your approach — brute force first, then optimize. Silence reads as "stuck," not "thinking."
- **Test your own code**: trace through a small example by hand before saying "I'm done."

> Pattern-match, don't memorize. Most problems map to one of ~15 patterns (two pointers, sliding window, BFS/DFS, DP on subsequences, etc.). Learn the pattern, not the specific LeetCode number.

## 2. System Design
Tests whether you can navigate ambiguity and make defensible trade-offs at scale.

1. **Clarify scope & scale**: ask about read/write ratio, expected QPS, and data size before drawing boxes.
2. **Start with a simple design**, then layer in complexity (caching, sharding, replication) only when a bottleneck justifies it.
3. **Narrate trade-offs explicitly**: "I'm choosing eventual consistency here because [X], which means we accept [Y] risk."

For new grads, system design is usually lighter (e.g. "design a URL shortener"); for senior+, expect deep dives on a component you personally built.

## 3. Behavioral / Engineering Judgment
Use the STAR framework, but weight your Action step toward **technical decision-making**: why you chose one architecture over another, how you handled a production incident, or how you pushed back on a bad technical ask.

---

## Weighting by Level
| Level | DSA | System Design | Behavioral |
|---|---|---|---|
| New Grad / Intern | 60% | 10% | 30% |
| Mid-level (2-5 YOE) | 40% | 30% | 30% |
| Senior+ | 20% | 50% | 30% |

Calibrate your prep time accordingly — over-indexing on LeetCode as a senior candidate wastes prep time that should go to system design.
`,
  },
  {
    title: 'The PM Interview Playbook: Product Sense, Execution & Metrics',
    slug: 'pm-interview-playbook',
    category: 'Product Management',
    summary: 'How to structure answers for the three signature PM interview question types — product sense, execution/prioritization, and analytical/metrics — without sounding like a template.',
    content: `
# The PM Interview Playbook: Product Sense, Execution & Metrics

PM interviews don't test whether you know the "right" answer — there isn't one. They test **how you think** under ambiguity. Interviewers are grading your process, not your final recommendation.

---

## 1. Product Sense ("Design a product for X")
Use a lightweight structure, but don't recite it mechanically:

1. **Clarify the user & goal**: "When you say 'design an app for commuters,' are we optimizing for public transit riders or drivers?"
2. **Pick ONE user persona** and go deep rather than covering everyone shallowly.
3. **Identify their top pain point** with a quick "day in the life" walkthrough.
4. **Brainstorm 3 solutions**, then commit to one and defend the trade-off.
5. **Define success metrics** for your chosen solution (see Section 3).

> The most common failure mode: listing 10 shallow features instead of reasoning deeply about 1-2. Depth beats breadth every time.

## 2. Execution & Prioritization ("You have 3 engineers and 2 weeks...")
This tests operational judgment, not creativity.

- State your **prioritization framework** explicitly (impact vs. effort, RICE, or a simple "what's the riskiest assumption to test first").
- Acknowledge trade-offs out loud: "I'm cutting scope on X because it's not on the critical path to validating our core hypothesis."
- Mention how you'd communicate the plan to stakeholders — PMs are graded on cross-functional clarity too.

## 3. Analytical / Metrics ("A key metric dropped 20% — what do you do?")
Structure your investigation, don't guess randomly:

1. **Clarify the metric's definition** and time window first — is this a real drop or a measurement/logging bug?
2. **Segment**: by platform, geography, new vs. returning users, before jumping to root-cause theories.
3. **Correlate with known changes**: recent releases, marketing pushes, seasonality, competitor actions.
4. Only then propose hypotheses, ranked by likelihood and how cheaply they can be tested.

---

## Behavioral Questions Still Matter
Product sense gets the spotlight, but 30-40% of most PM loops is still behavioral — use the STAR framework, and emphasize **stakeholder management and influence without authority**, since that's the core PM skill behavioral rounds are probing for.
`,
  },
  {
    title: 'Digital Marketing Interviews: Campaign Strategy & Analytics Questions',
    slug: 'digital-marketing-interview-guide',
    category: 'Marketing',
    summary: 'How to answer campaign strategy, channel-mix, and marketing analytics questions with the rigor interviewers expect — plus the metrics vocabulary that signals fluency.',
    content: `
# Digital Marketing Interviews: Campaign Strategy & Analytics Questions

Marketing interviews increasingly test **quantitative rigor**, not just creative instinct. Interviewers want to see that you can connect a campaign idea to a measurable business outcome.

---

## 1. Campaign Strategy Questions
*"How would you launch [product] to [audience]?"*

1. **Define the objective first**: awareness, acquisition, or retention — each demands a different channel mix and success metric.
2. **Pick 2-3 channels deliberately** and explain why they fit the audience (e.g. LinkedIn for B2B decision-makers, TikTok for Gen Z awareness), instead of listing every channel that exists.
3. **State a testable hypothesis**: "I believe short-form video will outperform static ads for this audience because [reason] — I'd validate with a small A/B budget split before scaling."

## 2. Analytics & Metrics Questions
*"CAC went up 30% last quarter — what do you investigate?"*

Structure your answer the way a PM would structure a metrics drop:
1. Clarify the metric definition and timeframe.
2. Segment by channel — a blended CAC increase often hides one channel degrading while others stay flat.
3. Check for external factors: iOS privacy changes, rising CPMs, increased competitor bidding, or a landing page conversion regression.

## Metrics Vocabulary That Signals Fluency
Use these terms naturally, not as buzzword-dropping:
- **CAC** (Customer Acquisition Cost), **LTV** (Lifetime Value), and the **LTV:CAC ratio** as a health check.
- **CTR, CVR, ROAS** for paid campaign performance.
- **Attribution model** (first-touch, last-touch, multi-touch) — mentioning which model you'd use, and why it matters for the specific question, is a strong signal.

---

## Behavioral: Creative + Data Together
The best marketing behavioral answers combine a creative idea **and** a metric that proves it worked. Weak: *"I ran a campaign that people liked."* Strong: *"I ran a campaign that increased qualified leads by 24% quarter-over-quarter, measured via [specific tracking method]."*

Use the STAR framework, but make sure your Result step always has a number attached.
`,
  },
  {
    title: 'Investment Banking & Finance Interviews: Technicals + Fit',
    slug: 'finance-interview-technicals-and-fit',
    category: 'Finance',
    summary: 'The core technical questions (valuation, accounting, DCF basics) and "why banking" fit questions that dominate IB analyst and finance interviews.',
    content: `
# Investment Banking & Finance Interviews: Technicals + Fit

Finance interviews (IB, equity research, corporate finance) split cleanly into **technical questions** with objectively correct answers, and **fit questions** that test motivation and cultural signal. Both must be prepared separately.

---

## 1. Core Technical Questions
You are expected to answer these fluently, without hesitation:

- **Walk me through a DCF**: project unlevered free cash flows, discount at WACC, add a terminal value (Gordon Growth or exit multiple), sum to get enterprise value, then bridge to equity value.
- **The three financial statements and how they link**: net income flows into the cash flow statement and retained earnings on the balance sheet; capex flows into PP&E and depreciation; the balance sheet must always balance.
- **Walk me through what happens to the 3 statements if depreciation increases by $10**: a classic screening question — practice this specific one until it's automatic.
- **Valuation methods and when to use each**: comparable companies (relative, market-based), precedent transactions (includes control premium), and DCF (intrinsic, most assumption-sensitive).

> Precision matters more than depth here. A confident, correctly-sequenced answer to a basic question beats a fumbled answer to an advanced one.

## 2. "Why Banking / Why This Firm" Fit Questions
Generic answers ("I like fast-paced environments") are an instant red flag — interviewers have heard them hundreds of times.

- **Be specific about the firm**: reference a recent deal, a specific group's focus (e.g. TMT, healthcare), or something from an actual conversation with someone at the firm.
- **Connect your story credibly**: if you're pivoting from a non-finance background, explain the specific moment or project that pulled you toward finance — vague enthusiasm doesn't land.
- **Know your resume cold**: any number or deal on your resume is fair game for a technical follow-up ("You mention you built a valuation model — walk me through your assumptions").

---

## Prep Priority
Spend 60% of prep time on technicals until they're reflexive, and 40% on fit — but never skip fit prep entirely. A candidate who nails technicals but gives a hollow "why us" answer is a common rejection pattern at the analyst level.
`,
  },
  {
    title: 'Data Analyst & Data Science Interviews: SQL, Stats & Case Studies',
    slug: 'data-analyst-interview-guide',
    category: 'Data & Analytics',
    summary: 'What to expect across the SQL screen, statistics fundamentals, and open-ended analytics case study rounds common to data analyst and data scientist interviews.',
    content: `
# Data Analyst & Data Science Interviews: SQL, Stats & Case Studies

Data roles typically run candidates through three distinct rounds. Preparing for only one (usually SQL) is the most common gap.

---

## 1. SQL Screen
Almost universal, even for data science roles at product companies.

- Get fluent with **joins** (inner vs. left, and when a left join silently introduces NULLs you need to handle), **window functions** (\`ROW_NUMBER()\`, \`RANK()\`, running totals with \`SUM() OVER\`), and **GROUP BY with HAVING** for post-aggregation filters.
- Practice explaining your query logic out loud as you write it — many interviewers grade the verbal walkthrough as much as the syntax.
- Always sanity-check edge cases: duplicate rows, NULLs in join keys, and off-by-one date range errors (\`>=\` vs \`>\`).

## 2. Statistics & Probability Fundamentals
Expect questions on:
- **p-values and statistical significance**: what a p-value actually means (probability of the observed result under the null hypothesis), and common misinterpretations to avoid stating.
- **A/B testing pitfalls**: novelty effects, insufficient sample size / underpowered tests, and peeking at results before the test concludes.
- **Bias-variance trade-off** and overfitting, if the role touches modeling.

## 3. Analytics Case Studies
*"Engagement on Feature X dropped — how do you investigate?"* — nearly identical in structure to the PM metrics question:

1. Clarify the metric definition and check for a measurement/logging issue first.
2. Segment the data (platform, cohort, geography) to isolate where the drop is concentrated.
3. Form a ranked list of hypotheses and describe how you'd test each with the data available, rather than jumping to one guess.

---

## Communicating Technical Work to Non-Technical Stakeholders
A frequently underrated round: explaining a finding to a "VP" persona. Practice compressing a technical result into one plain-language sentence plus a clear recommendation — e.g. *"Retention dropped because of a specific onboarding step; I recommend we simplify it, which should recover roughly half the loss based on similar past fixes."*
`,
  },
  {
    title: 'UX/Product Design Interviews: Portfolio Walkthroughs & Whiteboard Challenges',
    slug: 'ux-design-interview-guide',
    category: 'Design',
    summary: 'How to present a portfolio case study that highlights process over polish, and how to approach live whiteboard design challenges under time pressure.',
    content: `
# UX/Product Design Interviews: Portfolio Walkthroughs & Whiteboard Challenges

Design interviews are unique in that a big part of evaluation happens **before** you speak — your portfolio. But how you narrate it matters just as much as the work itself.

---

## 1. Portfolio Case Study Walkthroughs
Interviewers are far more interested in your **process and reasoning** than the final visuals.

Structure each case study you present around:
1. **The problem**: what user or business problem existed, and how you knew (research, data, support tickets)?
2. **Your process**: what alternatives did you explore, and why did you reject them? Showing rejected directions signals real design thinking, not just execution.
3. **The decision & trade-offs**: what constraint (technical, business, timeline) shaped your final direction?
4. **The outcome**: ideally a metric (adoption, task completion time, support ticket reduction) — if you don't have hard metrics, qualitative user feedback is an acceptable substitute.

> Pick 2-3 projects and go deep rather than rushing through 6. Depth of reasoning is what's being graded.

## 2. Live Whiteboard / Design Challenges
*"Design a checkout flow for a grocery delivery app"* — done live, often on a shared screen.

1. **Ask clarifying questions first**: platform (mobile/web), user context, and any known constraints. Jumping straight to sketching without scoping is the most common mistake.
2. **Talk while you sketch**: narrate your reasoning for each screen or flow decision — silence during a whiteboard challenge reads as uncertainty even if your final output is strong.
3. **Address edge cases explicitly**: empty states, error states, and how the flow degrades on a slow connection — mentioning these unprompted is a strong signal of production-design maturity.
4. **Time-box yourself**: it's better to fully reason through a simpler flow than to leave an ambitious one half-sketched when time runs out.

---

## Behavioral: Collaboration & Feedback
Design behavioral rounds often probe how you handle **critique and cross-functional pushback**. Use the STAR framework, and make sure your story shows you incorporating feedback you initially disagreed with — that's the specific signal most design panels are listening for.
`,
  },
];

async function main() {
  console.log('🌱 Starting database seed for Resources...');

  for (const resource of sampleResources) {
    const upserted = await prisma.resource.upsert({
      where: { slug: resource.slug },
      update: {
        title: resource.title,
        category: resource.category,
        summary: resource.summary,
        content: resource.content.trim(),
      },
      create: {
        title: resource.title,
        slug: resource.slug,
        category: resource.category,
        summary: resource.summary,
        content: resource.content.trim(),
      },
    });
    console.log(`✅ Seeded Resource: ${upserted.title} (${upserted.slug})`);
  }

  console.log('🎉 Resource database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
