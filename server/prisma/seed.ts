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
