import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  Sparkles,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  Building2,
  Calendar,
  Code2,
} from 'lucide-react';
import { ResumeAnalysisView } from './ResumeAnalysisView';
import { ResumeDocumentPreview } from './ResumeDocumentPreview';

export interface ParsedResumeProps {
  resume: {
    id: string;
    resumeGroupId?: string;
    fileUrl: string;
    targetRole?: string | null;
    version?: number;
    createdAt?: string;
    parsedJson?: any;
  };
  onReupload?: () => void;
}

function safeParseJson(data: any): any {
  if (!data) return {};
  let current = data;
  let attempts = 0;
  while (typeof current === 'string' && attempts < 5) {
    try {
      const parsed = JSON.parse(current);
      current = parsed;
      attempts++;
    } catch {
      break;
    }
  }
  return typeof current === 'object' && current !== null ? current : {};
}

export const ParsedResumeView: React.FC<ParsedResumeProps> = ({ resume }) => {
  const rawParsed = safeParseJson(resume?.parsedJson);

  const { targetRole, fileUrl } = resume;
  const contact = rawParsed.contact || {};
  const summary: string = rawParsed.summary || '';
  const workExperience: Array<any> = Array.isArray(rawParsed.workExperience) ? rawParsed.workExperience : [];
  const skills: string[] = Array.isArray(rawParsed.skills) ? rawParsed.skills : [];
  const education: Array<any> = Array.isArray(rawParsed.education) ? rawParsed.education : [];
  const projects: Array<any> = Array.isArray(rawParsed.projects) ? rawParsed.projects : [];

  const candidateName = contact.name || 'Candidate Resume';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* ORDER 1: STRUCTURED TEXT SUMMARY                                          */}
      {/* ========================================================================= */}

      {/* Candidate Header Banner Card */}
      <Card className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden border-teal-100 bg-white/95 shadow-sm space-y-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200 text-xs font-semibold px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-[#0d9488]" />
                Parsed via Gemini AI
              </Badge>
              {targetRole && (
                <Badge className="bg-[#043c44] text-teal-300 text-xs font-semibold px-3 py-1 rounded-full">
                  {targetRole}
                </Badge>
              )}
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#043c44]">
              {candidateName}
            </h2>
          </div>
        </div>

        {/* Contact Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {contact.email && (
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <Mail className="w-4 h-4 text-[#0d9488] shrink-0" />
              <a href={`mailto:${contact.email}`} className="truncate hover:text-[#0d9488] transition-colors">
                {contact.email}
              </a>
            </div>
          )}

          {contact.phone && (
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <Phone className="w-4 h-4 text-[#0d9488] shrink-0" />
              <span>{contact.phone}</span>
            </div>
          )}

          {contact.location && (
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <MapPin className="w-4 h-4 text-[#0d9488] shrink-0" />
              <span className="truncate">{contact.location}</span>
            </div>
          )}

          {contact.linkedin && (
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <Linkedin className="w-4 h-4 text-[#0d9488] shrink-0" />
              <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer" className="truncate hover:text-[#0d9488] transition-colors">
                {contact.linkedin.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {contact.github && (
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <Github className="w-4 h-4 text-[#0d9488] shrink-0" />
              <a href={contact.github.startsWith('http') ? contact.github : `https://${contact.github}`} target="_blank" rel="noopener noreferrer" className="truncate hover:text-[#0d9488] transition-colors">
                {contact.github.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {contact.portfolio && (
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <Globe className="w-4 h-4 text-[#0d9488] shrink-0" />
              <a href={contact.portfolio.startsWith('http') ? contact.portfolio : `https://${contact.portfolio}`} target="_blank" rel="noopener noreferrer" className="truncate hover:text-[#0d9488] transition-colors">
                {contact.portfolio.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* Professional Summary */}
      {summary && (
        <Card className="glass-panel p-6 sm:p-7 rounded-3xl border-teal-100 bg-white/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-base border-b border-slate-100 pb-3">
            <Briefcase className="w-4 h-4 text-[#0d9488]" />
            <h3>Professional Summary</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
            {summary}
          </p>
        </Card>
      )}

      {/* Work Experience Timeline */}
      {workExperience.length > 0 && (
        <Card className="glass-panel p-6 sm:p-7 rounded-3xl border-teal-100 bg-white/90 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-base border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-[#0d9488]" />
            <h3>Work Experience</h3>
          </div>

          <div className="space-y-6">
            {workExperience.map((exp: any, idx: number) => {
              const position = exp.position || exp.title || exp.role || 'Role';
              const company = exp.company || exp.organization || 'Company';
              const duration = exp.duration || exp.dates || (exp.startDate ? `${exp.startDate} - ${exp.endDate || 'Present'}` : null);
              const highlights: string[] = Array.isArray(exp.highlights)
                ? exp.highlights
                : Array.isArray(exp.responsibilities)
                ? exp.responsibilities
                : Array.isArray(exp.bullets)
                ? exp.bullets
                : typeof exp.description === 'string'
                ? [exp.description]
                : [];

              return (
                <div key={idx} className="relative pl-5 border-l-2 border-teal-200/80 space-y-2">
                  <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-[#0d9488] ring-4 ring-white" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="font-heading font-semibold text-sm text-[#043c44]">
                      {position} <span className="text-slate-400 font-normal">at</span> <span className="text-[#0d9488] font-medium">{company}</span>
                    </h4>
                    {duration && (
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {duration}
                      </span>
                    )}
                  </div>

                  {highlights.length > 0 && (
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600 pl-1">
                      {highlights.map((bullet: string, bIdx: number) => (
                        <li key={bIdx} className="leading-relaxed">
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Projects Grid */}
      {projects.length > 0 && (
        <Card className="glass-panel p-6 sm:p-7 rounded-3xl border-teal-100 bg-white/90 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-base border-b border-slate-100 pb-3">
            <FolderGit2 className="w-4 h-4 text-[#0d9488]" />
            <h3>Projects</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj: any, idx: number) => {
              const name = proj.name || proj.title || `Project ${idx + 1}`;
              const desc = proj.description || proj.details || '';
              const techStack: string[] = Array.isArray(proj.technologies)
                ? proj.technologies
                : Array.isArray(proj.techStack)
                ? proj.techStack
                : [];

              return (
                <div key={idx} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-heading font-bold text-xs text-[#043c44] flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-[#0d9488]" />
                        {name}
                      </h4>
                      {proj.link && (
                        <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#0d9488] hover:underline font-medium">
                          Link ↗
                        </a>
                      )}
                    </div>
                    {desc && <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>}
                  </div>

                  {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {techStack.map((tech: string, tIdx: number) => (
                        <Badge key={tIdx} variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-600">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Skills Badges */}
      {skills.length > 0 && (
        <Card className="glass-panel p-6 sm:p-7 rounded-3xl border-teal-100 bg-white/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-base border-b border-slate-100 pb-3">
            <Wrench className="w-4 h-4 text-[#0d9488]" />
            <h3>Skills & Competencies</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill: string, idx: number) => (
              <Badge key={idx} className="bg-teal-50/90 text-teal-800 border border-teal-200 text-xs px-3 py-1 rounded-xl font-medium shadow-2xs">
                {skill}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Education List */}
      {education.length > 0 && (
        <Card className="glass-panel p-6 sm:p-7 rounded-3xl border-teal-100 bg-white/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-base border-b border-slate-100 pb-3">
            <GraduationCap className="w-4 h-4 text-[#0d9488]" />
            <h3>Education</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {education.map((edu: any, idx: number) => {
              const degree = edu.degree || edu.fieldOfStudy || edu.program || 'Degree';
              const institution = edu.institution || edu.school || edu.university || 'University';
              const year = edu.dates || edu.year || edu.graduationYear || '';

              return (
                <div key={idx} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-1">
                  <h4 className="font-heading font-semibold text-xs text-[#043c44]">{degree}</h4>
                  <p className="text-xs text-[#0d9488] font-medium">{institution}</p>
                  {year && <p className="text-[11px] text-slate-400">{year}</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ORDER 2: EMBEDDED FILE PREVIEW (PDF inline iframe / DOCX format card)     */}
      {/* ========================================================================= */}
      <ResumeDocumentPreview fileUrl={fileUrl} targetRole={targetRole} />

      {/* ========================================================================= */}
      {/* ORDER 3: AI RESUME ANALYSIS & QUALITY SCORES                             */}
      {/* ========================================================================= */}
      <ResumeAnalysisView resumeId={resume.id} targetRole={targetRole || undefined} />
    </div>
  );
};
