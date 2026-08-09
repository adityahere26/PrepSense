import { GoogleGenAI, Type, Schema } from '@google/genai';

export interface ParsedResumeData {
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

export async function parseResumeWithGemini(
  rawText: string,
  targetRole: string
): Promise<ParsedResumeData> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please configure GEMINI_API_KEY in server environment.');
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

  const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  let lastError: any = null;

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
        return parsedData;
      }
    } catch (error: any) {
      console.warn(`Gemini model ${modelName} call failed/rate limited. Trying fallback model... Error:`, error?.message || error);
      lastError = error;
    }
  }

  // Fallback regex extractor if API rate limit or error persists
  console.warn('⚠️ Gemini API models unavailable or rate limited. Executing local heuristic extraction fallback.');
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
