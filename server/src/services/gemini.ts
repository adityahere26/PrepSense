import { GoogleGenAI, Type, Schema } from '@google/genai';

export interface ParsedResumeData {
  source?: 'ai' | 'heuristic_fallback';
  modelUsed?: string;
  contact: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    portfolio: string;
  };
  summary: string;
  workExperience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    location: string;
    description: string[];
  }>;
  skills: string[];
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
    score: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    technologies: string[];
    link: string;
  }>;
}

const resumeJsonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    contact: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        location: { type: Type.STRING },
        linkedin: { type: Type.STRING },
        github: { type: Type.STRING },
        portfolio: { type: Type.STRING },
      },
      required: ['name', 'email'],
    },
    summary: { type: Type.STRING },
    workExperience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          position: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          location: { type: Type.STRING },
          description: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['company', 'position'],
      },
    },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          fieldOfStudy: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          score: { type: Type.STRING },
        },
        required: ['institution', 'degree'],
      },
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          technologies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          link: { type: Type.STRING },
        },
        required: ['title'],
      },
    },
  },
  required: ['contact', 'workExperience', 'skills', 'education', 'projects'],
};

let cachedResolvedModels: string[] | null = null;

/**
 * Dynamically query the Gemini API's list models endpoint to retrieve available models
 * for this API key rather than hardcoding deprecated guesses.
 */
export async function getAvailableGeminiModels(ai: GoogleGenAI): Promise<string[]> {
  if (cachedResolvedModels && cachedResolvedModels.length > 0) {
    return cachedResolvedModels;
  }

  try {
    const list = await ai.models.list();
    const available: string[] = [];

    for await (const m of list as any) {
      const rawName = m.name || m.id || m;
      if (typeof rawName === 'string') {
        const cleanName = rawName.replace(/^models\//, '');
        available.push(cleanName);
      }
    }

    // Priority ordering of active Gemini Flash/Pro models
    const priorityList = [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3-flash-preview',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-flash-latest',
      'gemini-3.1-pro-preview',
    ];

    const sorted = priorityList.filter((p) => available.includes(p));

    for (const name of available) {
      if (!sorted.includes(name) && (name.includes('flash') || name.includes('gemini'))) {
        sorted.push(name);
      }
    }

    if (sorted.length > 0) {
      cachedResolvedModels = sorted;
      console.log('🤖 Dynamically resolved active Gemini models from API key list:', cachedResolvedModels);
      return cachedResolvedModels;
    }
  } catch (err: any) {
    console.warn('⚠️ Dynamic model listing failed, falling back to active flash defaults:', err?.message || err);
  }

  cachedResolvedModels = ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.0-flash', 'gemini-flash-latest'];
  return cachedResolvedModels;
}

export async function parseResumeWithGemini(
  rawText: string,
  targetRole: string
): Promise<ParsedResumeData> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ Gemini API key is missing. Executing local heuristic extraction fallback.');
    return fallbackHeuristicParser(rawText, targetRole);
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert resume parser and AI recruiting specialist.
Extract the structured fields from the raw resume text provided below.
The candidate's target role is: "${targetRole}".

Extract the following information accurately:
1. Contact Information (name, email, phone, location, linkedin URL, github URL, portfolio URL).
2. Professional Summary / Objective.
3. Work Experience (company, position/title, start date, end date, location, list of key achievements/description bullet points).
4. Skills (list of technical and professional skills as clean concise strings).
5. Education (institution name, degree, field of study, start date, end date, GPA or score if mentioned).
6. Projects (title, summary description, list of technologies used, project link if available).

Return strictly valid JSON adhering to the specified schema. If any optional field is not present in the resume, return an empty string "" or empty array [].

Raw Resume Text:
---
${rawText}
---
`;

  const modelsToTry = await getAvailableGeminiModels(ai);

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: resumeJsonSchema,
          temperature: 0.1,
        },
      });

      const responseText = response.text;
      if (responseText) {
        const parsedData: ParsedResumeData = JSON.parse(responseText);
        parsedData.source = 'ai';
        parsedData.modelUsed = modelName;
        console.log(`✨ Successfully parsed resume with Gemini API model: ${modelName}`);
        return parsedData;
      }
    } catch (error: any) {
      console.warn(`Gemini model ${modelName} parse call failed. Trying next model... Error:`, error?.message || error);
    }
  }

  // Fallback regex extractor if API rate limit or error persists
  console.warn('⚠️ All Gemini API models unavailable or rate limited. Executing local heuristic extraction fallback.');
  return fallbackHeuristicParser(rawText, targetRole);
}

function fallbackHeuristicParser(rawText: string, targetRole: string): ParsedResumeData {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const name = lines[0] || 'Candidate Name';
  
  const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = rawText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const linkedinMatch = rawText.match(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+/i);
  const githubMatch = rawText.match(/(https?:\/\/)?(www\.)?github\.com\/[\w-]+/i);

  return {
    source: 'heuristic_fallback',
    modelUsed: undefined,
    contact: {
      name,
      email: emailMatch ? emailMatch[0] : 'email@example.com',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: '',
      linkedin: linkedinMatch ? linkedinMatch[0] : '',
      github: githubMatch ? githubMatch[0] : '',
      portfolio: '',
    },
    summary: `Candidate targeting ${targetRole}. Resume raw text parsed.`,
    workExperience: [
      {
        company: 'Experience Section',
        position: targetRole,
        startDate: '',
        endDate: 'Present',
        location: '',
        description: lines.slice(1, 6),
      },
    ],
    skills: ['General Professional Skills', targetRole],
    education: [
      {
        institution: 'Degree Institution',
        degree: 'Bachelor / Degree',
        fieldOfStudy: targetRole,
        startDate: '',
        endDate: '',
        score: '',
      },
    ],
    projects: [],
  };
}

export interface SectionFeedback {
  section: string;
  score: number;
  status: 'strong' | 'good' | 'needs_improvement' | 'critical';
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface RewriteSuggestion {
  section?: string;
  original: string;
  rewritten: string;
  reasoning: string;
}

export interface ResumeAnalysisResult {
  source?: 'ai' | 'heuristic_fallback';
  modelUsed?: string;
  aiQualityScore: number;
  atsReasoning: string;
  matchScore: number | null;
  jdReasoning?: string;
  overallSummary: string;
  sectionFeedback: SectionFeedback[];
  rewriteSuggestions: RewriteSuggestion[];
}

const analysisJsonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    aiQualityScore: { type: Type.INTEGER },
    atsReasoning: { type: Type.STRING },
    matchScore: { type: Type.INTEGER },
    jdReasoning: { type: Type.STRING },
    overallSummary: { type: Type.STRING },
    sectionFeedback: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING },
          score: { type: Type.INTEGER },
          status: { type: Type.STRING },
          feedback: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['section', 'score', 'status', 'feedback', 'strengths', 'improvements'],
      },
    },
    rewriteSuggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING },
          original: { type: Type.STRING },
          rewritten: { type: Type.STRING },
          reasoning: { type: Type.STRING },
        },
        required: ['original', 'rewritten', 'reasoning'],
      },
    },
  },
  required: ['aiQualityScore', 'atsReasoning', 'overallSummary', 'sectionFeedback', 'rewriteSuggestions'],
};

export async function analyzeResumeWithGemini(
  parsedResumeJson: any,
  targetRole: string,
  jdText?: string
): Promise<ResumeAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  const hasJd = Boolean(jdText && jdText.trim().length > 10);

  if (!apiKey) {
    console.warn('⚠️ Gemini API key is missing. Executing local heuristic analysis fallback.');
    return fallbackHeuristicAnalysis(parsedResumeJson, targetRole, jdText);
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an elite ATS resume auditor, hiring manager, and talent acquisition specialist across diverse industries.
Analyze the following candidate resume for the target role: "${targetRole}".
${hasJd ? `\nTarget Job Description (JD):\n---\n${jdText?.trim()}\n---` : '\n(No specific Job Description was provided for this analysis.)'}

Resume Data (JSON):
---
${JSON.stringify(parsedResumeJson, null, 2)}
---

Provide a comprehensive, role-specific audit covering:
1. **AI Content Quality Score (0-100)** (aiQualityScore): Calculate how well this resume's content, keyword density, and action verbs align with industry norms for "${targetRole}". Provide thorough field-specific reasoning (atsReasoning).
2. **Job Description Match Score (0-100)**: ${hasJd ? 'Calculate how well candidate experience, skills, and projects match the provided JD requirements and responsibilities. Provide detailed JD match reasoning.' : 'Set matchScore to 0 or null and leave jdReasoning as an empty string since no JD was provided.'}
3. **Overall Summary**: Concise 2-3 sentence overview of candidate standing for "${targetRole}".
4. **Section-by-Section Feedback**: Provide detailed evaluations for sections present in the resume ("Summary", "Work Experience", "Skills", "Education", "Projects").
   For each section, assign a score (0-100), status ('strong', 'good', 'needs_improvement', or 'critical'), detailed feedback text, a list of key strengths, and specific areas for improvement.
5. **Bullet-Point Rewrite Suggestions**: Provide AT LEAST 3 (or up to 5) specific bullet-point rewrite suggestions in strict Before / After format.
   - 'original': Extract an actual weak, vague, unquantified bullet point or statement from the resume (or construct a representative weak phrase from candidate experience).
   - 'rewritten': Transform it into a high-impact, quantified bullet point using strong action verbs, specific metrics, and industry terminology typical for top candidates in "${targetRole}".
   - 'reasoning': Explain why this rewrite improves ATS indexing and recruiter impression for "${targetRole}".

Return strictly valid JSON matching the specified schema.
`;

  const modelsToTry = await getAvailableGeminiModels(ai);

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: analysisJsonSchema,
          temperature: 0.2,
        },
      });

      const responseText = response.text;
      if (responseText) {
        const result: ResumeAnalysisResult = JSON.parse(responseText);
        if (!hasJd) {
          result.matchScore = null;
        }
        result.source = 'ai';
        result.modelUsed = modelName;
        console.log(`✨ Successfully generated resume analysis using Gemini API model: ${modelName}`);
        return result;
      }
    } catch (error: any) {
      console.warn(`Gemini model ${modelName} analysis failed. Trying next model... Error:`, error?.message || error);
    }
  }

  console.warn('⚠️ All Gemini API models unavailable or rate limited for analysis. Executing local heuristic analysis fallback.');
  return fallbackHeuristicAnalysis(parsedResumeJson, targetRole, jdText);
}

function fallbackHeuristicAnalysis(parsedResumeJson: any, targetRole: string, jdText?: string): ResumeAnalysisResult {
  const hasJd = Boolean(jdText && jdText.trim().length > 10);
  const skills: string[] = parsedResumeJson?.skills || [];
  const experiences = parsedResumeJson?.workExperience || [];
  const projects = parsedResumeJson?.projects || [];
  
  const skillCount = skills.length;
  const expCount = experiences.length;
  const projCount = projects.length;

  let aiQualityScore = 72;
  if (skillCount > 5) aiQualityScore += 10;
  if (expCount > 0) aiQualityScore += 10;
  if (projCount > 0) aiQualityScore += 5;
  aiQualityScore = Math.min(95, Math.max(50, aiQualityScore));

  let matchScore: number | null = null;
  let jdReasoning = '';

  if (hasJd) {
    const jdLower = (jdText || '').toLowerCase();
    const matchedSkills = skills.filter((s) => jdLower.includes(s.toLowerCase()));
    const ratio = skills.length > 0 ? matchedSkills.length / skills.length : 0.5;
    matchScore = Math.round(60 + ratio * 35);
    jdReasoning = `Matched ${matchedSkills.length} key skills (${matchedSkills.slice(0, 3).join(', ') || 'core competencies'}) against job description criteria for ${targetRole}.`;
  }

  const firstBullet = experiences[0]?.description?.[0] || 'Responsible for handling daily tasks and team deliverables.';
  const secondBullet = experiences[0]?.description?.[1] || projects[0]?.description || 'Worked on developing internal features and fixing issues.';
  const thirdBullet = projects[0]?.title ? `Built ${projects[0].title} project.` : 'Assisted with project management and documentation.';

  return {
    source: 'heuristic_fallback',
    modelUsed: undefined,
    aiQualityScore,
    atsReasoning: `Resume parsed with standard section headers and key competencies relevant for ${targetRole}. Incorporating more quantitative metrics (e.g. percentages, scale, revenue/efficiency numbers) will elevate content quality ranking.`,
    matchScore,
    jdReasoning,
    overallSummary: `Solid foundation for a ${targetRole} candidate. Clear layout with experience and technical skills present, but needs stronger action verbs and quantified impact metrics across bullet points.`,
    sectionFeedback: [
      {
        section: 'Professional Summary',
        score: 75,
        status: 'good',
        feedback: `Summary clearly targets ${targetRole}, but can be sharpened with clear value propositions and core achievements.`,
        strengths: [`Explicitly mentions target field context`, `Professional tone`],
        improvements: [`Add 1-2 key metrics (e.g. years of experience, scale of systems/campaigns handled)`],
      },
      {
        section: 'Work Experience',
        score: expCount > 0 ? 78 : 60,
        status: expCount > 0 ? 'good' : 'needs_improvement',
        feedback: `Experience entries cover key duties. Reframe bullets from passive responsibilities to active achievements using the Action + Context + Quantified Result framework.`,
        strengths: [`Includes position titles and company timeline`, `Clear role descriptions`],
        improvements: [`Quantify outcomes (e.g., % increase in efficiency, # of users served, latency reduction)`],
      },
      {
        section: 'Skills & Technical Competencies',
        score: skillCount >= 5 ? 85 : 65,
        status: skillCount >= 5 ? 'strong' : 'needs_improvement',
        feedback: `Good variety of tools listed. Group skills into categorical tags (e.g. Frameworks, Languages, Tools) to optimize ATS keyword parsing.`,
        strengths: [`Contains ${skillCount} skills relevant to ${targetRole}`],
        improvements: [`Categorize skills by domain/toolchain for faster recruiter scanning`],
      },
      {
        section: 'Projects & Case Studies',
        score: projCount > 0 ? 80 : 65,
        status: projCount > 0 ? 'strong' : 'needs_improvement',
        feedback: `Projects demonstrate practical application of skills for ${targetRole}. Include live demo links and technical scope.`,
        strengths: [`Demonstrates hands-on implementation`],
        improvements: [`Add measurable performance or adoption stats`],
      },
    ],
    rewriteSuggestions: [
      {
        section: 'Work Experience',
        original: firstBullet,
        rewritten: `Spearheaded key initiatives for ${targetRole}, optimizing execution workflows by 32% and driving measurable cross-functional delivery.`,
        reasoning: `Replaces passive responsibility statement with strong action verb ('Spearheaded') and quantified impact percentage (32%).`,
      },
      {
        section: 'Work Experience',
        original: secondBullet,
        rewritten: `Engineered scalable end-to-end solutions for ${targetRole}, reducing resolution turnaround times by 40% across 5+ production modules.`,
        reasoning: `Introduces specific technical action ('Engineered') and quantifiable efficiency metrics for ${targetRole}.`,
      },
      {
        section: 'Projects',
        original: thirdBullet,
        rewritten: `Architected and deployed full-lifecycle ${targetRole} application serving 1,000+ active users with 99.9% uptime.`,
        reasoning: `Elevates basic project description into high-impact accomplishment showing scale (1,000+ users) and reliability (99.9% uptime).`,
      },
    ],
  };
}
