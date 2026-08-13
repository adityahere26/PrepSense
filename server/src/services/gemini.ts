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

export interface GeneratedInterviewQuestion {
  category: string;
  questionText: string;
}

export interface InterviewQuestionsResult {
  source?: 'ai' | 'heuristic_fallback';
  modelUsed?: string;
  categories: string[];
  questions: GeneratedInterviewQuestion[];
}

const interviewQuestionsJsonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    categories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of 4-5 core interview question categories tailored to the target role.',
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: 'One of the inferred categories above that this question belongs to.',
          },
          questionText: {
            type: Type.STRING,
            description: 'The personalized, clear interview question referencing candidate projects, skills, or experience.',
          },
        },
        required: ['category', 'questionText'],
      },
      description: 'List of 5-7 interview questions distributed across the inferred categories.',
    },
  },
  required: ['categories', 'questions'],
};

export async function generateInterviewQuestionsWithGemini(
  targetRole: string,
  parsedResumeJson?: any
): Promise<InterviewQuestionsResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ Gemini API key is missing. Executing local heuristic interview question generation fallback.');
    return fallbackHeuristicQuestions(targetRole, parsedResumeJson);
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert technical recruiter, hiring manager, and interviewer conducting a high-stakes interview for the target role: "${targetRole}".

Task:
1. **Infer 4-5 Interview Question Categories**: First, infer 4 to 5 appropriate interview question categories specifically tailored for the target role "${targetRole}".
   - Examples of role-to-category mappings:
     - "Software Engineer" → ["technical", "system_design", "behavioral", "problem_solving"]
     - "Product Manager" → ["product_sense", "execution", "behavioral", "metrics"]
     - "Digital Marketer" → ["campaign_strategy", "analytics", "behavioral", "creative_thinking"]
     - Adjust dynamically for any role (e.g. Data Scientist, UX Designer, Financial Analyst, Marketing Specialist).

2. **Generate 5-7 Personalized Questions**: Generate between 5 and 7 realistic interview questions distributed across those inferred categories.
   - **Personalize using candidate's resume**: Incorporate details from the candidate's parsed resume below (skills, projects, work experience, achievements) into the questions where relevant.
   - For instance, if the candidate lists specific technologies, projects, or past companies, tailor questions to probe their hands-on experience with those tools or scenarios.
   - If minimal resume data is provided, formulate role-specific questions tailored to standard professional scenarios for "${targetRole}".

Candidate Parsed Resume Data (JSON):
---
${parsedResumeJson ? JSON.stringify(parsedResumeJson, null, 2) : 'No structured resume provided.'}
---

Return strictly valid JSON matching the specified schema with:
- "categories": Array of 4-5 category strings.
- "questions": Array of 5-7 objects, each with "category" (matching one of the inferred categories) and "questionText".
`;

  const modelsToTry = await getAvailableGeminiModels(ai);

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: interviewQuestionsJsonSchema,
          temperature: 0.3,
        },
      });

      const responseText = response.text;
      if (responseText) {
        const result: InterviewQuestionsResult = JSON.parse(responseText);
        if (result.categories && Array.isArray(result.categories) && result.questions && Array.isArray(result.questions) && result.questions.length > 0) {
          result.source = 'ai';
          result.modelUsed = modelName;
          console.log(`✨ Successfully generated interview questions using Gemini API model: ${modelName}`);
          return result;
        }
      }
    } catch (error: any) {
      console.warn(`Gemini model ${modelName} question generation failed. Trying next model... Error:`, error?.message || error);
    }
  }

  console.warn('⚠️ All Gemini API models unavailable or rate limited for question generation. Executing local heuristic fallback.');
  return fallbackHeuristicQuestions(targetRole, parsedResumeJson);
}

function fallbackHeuristicQuestions(targetRole: string, parsedResumeJson?: any): InterviewQuestionsResult {
  const roleLower = targetRole.toLowerCase();
  let categories: string[];

  if (roleLower.includes('software') || roleLower.includes('developer') || roleLower.includes('engineer')) {
    categories = ['technical', 'system_design', 'behavioral', 'problem_solving'];
  } else if (roleLower.includes('product') || roleLower.includes('pm')) {
    categories = ['product_sense', 'execution', 'behavioral', 'metrics'];
  } else if (roleLower.includes('market') || roleLower.includes('growth')) {
    categories = ['campaign_strategy', 'analytics', 'behavioral', 'creative_thinking'];
  } else {
    categories = ['domain_knowledge', 'strategy', 'behavioral', 'problem_solving'];
  }

  const skills: string[] = parsedResumeJson?.skills || [];
  const projects = parsedResumeJson?.projects || [];
  const experiences = parsedResumeJson?.workExperience || [];

  const topSkill = skills[0] || 'your core technical tools';
  const topProject = projects[0]?.title || 'a major project from your experience';
  const topCompany = experiences[0]?.company || 'your previous position';

  const questions: GeneratedInterviewQuestion[] = [
    {
      category: categories[0],
      questionText: `Could you walk me through a complex technical challenge you faced while working with ${topSkill} at ${topCompany}, and how you resolved it?`,
    },
    {
      category: categories[1] || categories[0],
      questionText: `When designing or architecting systems for ${targetRole}, how do you approach scalability, maintainability, and performance optimization?`,
    },
    {
      category: categories[2] || 'behavioral',
      questionText: `Tell me about a time when you had to manage conflicting priorities or tight deadlines while working on ${topProject}. How did you handle stakeholder expectations?`,
    },
    {
      category: categories[3] || 'problem_solving',
      questionText: `Describe a situation where a critical bug or production issue occurred. Walk me through your step-by-step diagnostic and resolution process.`,
    },
    {
      category: categories[0],
      questionText: `How do you stay up-to-date with emerging industry best practices and apply new methodologies to your daily work in ${targetRole}?`,
    },
    {
      category: categories[2] || 'behavioral',
      questionText: `Can you give an example of how you collaborated with cross-functional team members to deliver a key business milestone?`,
    },
  ];

  return {
    source: 'heuristic_fallback',
    modelUsed: undefined,
    categories,
    questions,
  };
}

export async function generateQuestionTTSWithGemini(
  questionText: string
): Promise<{ audioBuffer: Buffer; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ Gemini API key is missing for TTS. Returning synthetic WAV audio fallback.');
    return generateFallbackTTSAudioBuffer(questionText);
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Please read this interview question out loud clearly and naturally: "${questionText}"`;

  const ttsModels = [
    'gemini-2.5-flash-preview-tts',
    'gemini-3.5-flash',
    'gemini-2.5-flash-native-audio-latest',
    'gemini-2.0-flash',
  ];

  for (const modelName of ttsModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck',
              },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts;
      if (parts && parts.length > 0) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const buffer = Buffer.from(part.inlineData.data, 'base64');
            const mimeType = part.inlineData.mimeType || 'audio/mp3';
            console.log(`✨ Generated native TTS audio with Gemini model ${modelName} (${buffer.length} bytes, ${mimeType})`);
            return { audioBuffer: buffer, mimeType };
          }
        }
      }
    } catch (err: any) {
      console.warn(`Gemini model ${modelName} TTS audio generation call failed. Error:`, err?.message || err);
    }
  }

  console.warn('⚠️ All Gemini TTS model calls unavailable. Returning synthetic WAV audio fallback.');
  return generateFallbackTTSAudioBuffer(questionText);
}

function generateFallbackTTSAudioBuffer(text: string): { audioBuffer: Buffer; mimeType: string } {
  // Valid 1-second 8kHz 16-bit mono PCM WAV audio buffer
  const sampleRate = 8000;
  const numSamples = sampleRate * 1;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  return { audioBuffer: buffer, mimeType: 'audio/wav' };
}

export async function transcribeAudioChunkWithGemini(
  audioBase64: string,
  mimeType: string = 'audio/pcm;rate=16000'
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
  ];

  const prompt = 'Transcribe the spoken audio verbatim in plain text. Output ONLY the exact transcribed English words spoken by the user. If the audio is silent or contains only background noise with no intelligible speech, output nothing (an empty string).';

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
            },
          },
          prompt,
        ],
      });

      const text = response.text ? response.text.trim() : '';
      if (text) {
        console.log(`[TRANSCRIPTION-SVC] Transcribed audio chunk with model ${modelName}: "${text}"`);
        return text;
      }
      return '';
    } catch (err: any) {
      console.warn(`[TRANSCRIPTION-SVC] Model ${modelName} chunk transcription failed:`, err?.message || err);
    }
  }

  return '';
}

export interface AnswerEvaluationResult {
  starScore: number;
  specificityScore: number;
  relevanceScore: number;
  scoreOverall: number;
  feedback: string;
  source?: 'ai' | 'heuristic_fallback';
  modelUsed?: string;
}

export interface SessionSummaryResult {
  overallScore: number;
  averageStarScore: number;
  averageSpecificityScore: number;
  averageRelevanceScore: number;
  topImprovementAreas: string[];
  summaryText: string;
  source?: 'ai' | 'heuristic_fallback';
  modelUsed?: string;
}

const answerEvaluationJsonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    starScore: { type: Type.INTEGER },
    specificityScore: { type: Type.INTEGER },
    relevanceScore: { type: Type.INTEGER },
    scoreOverall: { type: Type.INTEGER },
    feedback: { type: Type.STRING },
  },
  required: ['starScore', 'specificityScore', 'relevanceScore', 'scoreOverall', 'feedback'],
};

const sessionSummaryJsonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.INTEGER },
    averageStarScore: { type: Type.INTEGER },
    averageSpecificityScore: { type: Type.INTEGER },
    averageRelevanceScore: { type: Type.INTEGER },
    topImprovementAreas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    summaryText: { type: Type.STRING },
  },
  required: ['overallScore', 'averageStarScore', 'averageSpecificityScore', 'averageRelevanceScore', 'topImprovementAreas', 'summaryText'],
};

export async function evaluateInterviewAnswerWithGemini(
  questionText: string,
  transcript: string,
  targetRole: string = 'Candidate'
): Promise<AnswerEvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY is missing. Using heuristic fallback evaluation.');
    return fallbackHeuristicAnswerEvaluation(questionText, transcript);
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are an expert interviewer evaluating a candidate's response for the position of "${targetRole}".

INTERVIEW QUESTION:
"${questionText}"

CANDIDATE'S SPOKEN TRANSCRIPT:
"${transcript}"

Evaluate the answer on a 0 to 100 scale across 3 criteria:
1. STAR structure score (0-100): How well does the answer follow the Situation, Task, Action, Result framework?
2. Specificity score (0-100): Does the answer include concrete metrics, technical details, tools, and specific actions?
3. Relevance score (0-100): How directly and effectively does the response address the core question?

Also calculate scoreOverall (0-100) as the average of the 3 scores.
Provide concise written feedback (1-2 sentences) highlighting what was strong or what to improve.

Return ONLY a JSON object adhering to the schema.`;

  const modelsToTry = await getAvailableGeminiModels(ai);

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: answerEvaluationJsonSchema,
          temperature: 0.3,
        },
      });

      const responseText = response.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        if (
          typeof parsed.starScore === 'number' &&
          typeof parsed.specificityScore === 'number' &&
          typeof parsed.relevanceScore === 'number' &&
          typeof parsed.feedback === 'string'
        ) {
          const starScore = Math.min(100, Math.max(0, Math.round(parsed.starScore)));
          const specificityScore = Math.min(100, Math.max(0, Math.round(parsed.specificityScore)));
          const relevanceScore = Math.min(100, Math.max(0, Math.round(parsed.relevanceScore)));
          const scoreOverall = Math.min(100, Math.max(0, Math.round(parsed.scoreOverall || (starScore + specificityScore + relevanceScore) / 3)));

          console.log(`✨ Evaluated interview answer using model ${modelName}: Overall Score = ${scoreOverall}`);
          return {
            starScore,
            specificityScore,
            relevanceScore,
            scoreOverall,
            feedback: parsed.feedback.trim(),
            source: 'ai',
            modelUsed: modelName,
          };
        }
      }
    } catch (err: any) {
      console.warn(`Gemini model ${modelName} answer evaluation failed:`, err?.message || err);
    }
  }

  console.warn('⚠️ All Gemini API models failed for answer evaluation. Using heuristic fallback.');
  return fallbackHeuristicAnswerEvaluation(questionText, transcript);
}

function fallbackHeuristicAnswerEvaluation(questionText: string, transcript: string): AnswerEvaluationResult {
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  
  let starScore = 65;
  let specificityScore = 60;
  let relevanceScore = 70;

  if (wordCount > 40) starScore += 15;
  if (wordCount > 80) starScore += 10;
  if (/\b(because|result|achieved|improved|led to|built|using|percent|%|\d+)\b/i.test(transcript)) specificityScore += 25;
  if (transcript.length > 20) relevanceScore += 15;

  starScore = Math.min(95, starScore);
  specificityScore = Math.min(95, specificityScore);
  relevanceScore = Math.min(95, relevanceScore);

  const scoreOverall = Math.round((starScore + specificityScore + relevanceScore) / 3);

  let feedback = 'Good initial response. To improve, structure your answer clearly using Situation, Task, Action, and measurable Results.';
  if (wordCount < 15) {
    feedback = 'Your response was quite brief. Try providing a specific example with concrete details and metrics to demonstrate your experience.';
  } else if (specificityScore > 75) {
    feedback = 'Strong answer with good concrete details and relevant technical context. Keep up the clear impact-driven delivery!';
  }

  return {
    starScore,
    specificityScore,
    relevanceScore,
    scoreOverall,
    feedback,
    source: 'heuristic_fallback',
  };
}

export async function generateSessionSummaryWithGemini(
  targetRole: string,
  answers: Array<{ questionText: string; transcript: string; evaluation: AnswerEvaluationResult }>
): Promise<SessionSummaryResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  const validEvaluations = answers.map((a) => a.evaluation).filter(Boolean);
  const avgStar = validEvaluations.length > 0 ? Math.round(validEvaluations.reduce((s, e) => s + e.starScore, 0) / validEvaluations.length) : 70;
  const avgSpec = validEvaluations.length > 0 ? Math.round(validEvaluations.reduce((s, e) => s + e.specificityScore, 0) / validEvaluations.length) : 70;
  const avgRel = validEvaluations.length > 0 ? Math.round(validEvaluations.reduce((s, e) => s + e.relevanceScore, 0) / validEvaluations.length) : 70;
  const overallScore = Math.round((avgStar + avgSpec + avgRel) / 3);

  if (!apiKey || validEvaluations.length === 0) {
    return fallbackSessionSummary(targetRole, overallScore, avgStar, avgSpec, avgRel);
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Synthesize an end-of-session performance summary for a candidate interviewing for "${targetRole}".

SUMMARY OF QUESTIONS AND CANDIDATE ANSWERS:
${answers
  .map(
    (a, i) => `Q${i + 1}: "${a.questionText}"
Candidate Answer: "${a.transcript}"
Scores: STAR=${a.evaluation.starScore}, Specificity=${a.evaluation.specificityScore}, Relevance=${a.evaluation.relevanceScore}
Feedback: "${a.evaluation.feedback}"`
  )
  .join('\n\n')}

Analyze all candidate responses across the session.
Synthesize:
1. overallScore (integer 0-100)
2. averageStarScore (integer 0-100)
3. averageSpecificityScore (integer 0-100)
4. averageRelevanceScore (integer 0-100)
5. topImprovementAreas: Exactly 2 clear, actionable bullet points highlighting the candidate's top 2 areas to improve across the interview.
6. summaryText: A 2-3 sentence overall evaluation summary.

Return ONLY a JSON object matching the schema.`;

  const modelsToTry = await getAvailableGeminiModels(ai);

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: sessionSummaryJsonSchema,
          temperature: 0.3,
        },
      });

      const responseText = response.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        if (
          Array.isArray(parsed.topImprovementAreas) &&
          parsed.topImprovementAreas.length >= 2 &&
          typeof parsed.summaryText === 'string'
        ) {
          console.log(`✨ Generated interview session summary using model ${modelName}`);
          return {
            overallScore: Math.round(parsed.overallScore || overallScore),
            averageStarScore: Math.round(parsed.averageStarScore || avgStar),
            averageSpecificityScore: Math.round(parsed.averageSpecificityScore || avgSpec),
            averageRelevanceScore: Math.round(parsed.averageRelevanceScore || avgRel),
            topImprovementAreas: parsed.topImprovementAreas.slice(0, 2).map((s: string) => s.trim()),
            summaryText: parsed.summaryText.trim(),
            source: 'ai',
            modelUsed: modelName,
          };
        }
      }
    } catch (err: any) {
      console.warn(`Gemini model ${modelName} session summary generation failed:`, err?.message || err);
    }
  }

  return fallbackSessionSummary(targetRole, overallScore, avgStar, avgSpec, avgRel);
}

function fallbackSessionSummary(
  targetRole: string,
  overallScore: number,
  avgStar: number,
  avgSpec: number,
  avgRel: number
): SessionSummaryResult {
  const topImprovementAreas = [
    `Incorporate quantifiable impact and specific metrics (e.g. percentages, benchmarks) into your answers to strengthen specificity for ${targetRole} positions.`,
    `Ensure every story strictly follows the STAR method, emphasizing the concrete Actions YOU personally took and the final business/technical Results achieved.`,
  ];

  return {
    overallScore,
    averageStarScore: avgStar,
    averageSpecificityScore: avgSpec,
    averageRelevanceScore: avgRel,
    topImprovementAreas,
    summaryText: `Solid mock interview performance for ${targetRole}. You demonstrated clear domain understanding; focusing on STAR structure and quantifiable metrics will further elevate your delivery.`,
    source: 'heuristic_fallback',
  };
}



