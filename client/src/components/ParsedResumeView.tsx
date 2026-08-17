import React from 'react';
import {
  FileText,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  Briefcase,
  GraduationCap,
  FolderGit2,
  CheckCircle2,
  Download,
  Upload,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ResumeAnalysisView } from './ResumeAnalysisView';

export interface ParsedResumeProps {
  resume: {
    id: string;
    resumeGroupId?: string;
    fileUrl: string;
    targetRole?: string | null;
    version?: number;
    createdAt?: string;
    parsedJson: {
      contact?: {
        name?: string;
        email?: string;
        phone?: string;
        location?: string;
        linkedin?: string;
        github?: string;
        portfolio?: string;
      };
      summary?: string;
      workExperience?: Array<{
        company?: string;
        position?: string;
        startDate?: string;
        endDate?: string;
        location?: string;
        description?: string[];
      }>;
      skills?: string[];
      education?: Array<{
        institution?: string;
        degree?: string;
        fieldOfStudy?: string;
        startDate?: string;
        endDate?: string;
        score?: string;
      }>;
      projects?: Array<{
        title?: string;
        description?: string;
        technologies?: string[];
        link?: string;
      }>;
    };
  };
  onReupload?: () => void;
}

export const ParsedResumeView: React.FC<ParsedResumeProps> = ({ resume, onReupload }) => {
  const { parsedJson, targetRole, fileUrl, createdAt } = resume;
  const contact = parsedJson?.contact || {};
  const workExperience = parsedJson?.workExperience || [];
  const skills = parsedJson?.skills || [];
  const education = parsedJson?.education || [];
  const projects = parsedJson?.projects || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Candidate Header */}
      <Card className="glass-panel p-8 rounded-3xl relative overflow-hidden border-teal-100 bg-white/95 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Parsed via Gemini AI
              </span>
              {targetRole && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-[#0891b2] border border-cyan-200/60 text-xs font-bold">
                  Target: {targetRole}
                </span>
              )}
            </div>

            <h1 className="font-heading text-3xl font-extrabold text-[#043c44]">
              {contact.name || 'Candidate Resume'}
            </h1>

            {/* Contact pills */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1.5 hover:text-[#0d9488] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#0d9488]" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#0d9488]" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0d9488]" />
                  <span>{contact.location}</span>
                </div>
              )}
            </div>

            {/* Social Links */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {contact.linkedin && (
                <a
                  href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-[#0d9488] transition-all text-xs font-medium"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  LinkedIn
                </a>
              )}
              {contact.github && (
                <a
                  href={contact.github.startsWith('http') ? contact.github : `https://${contact.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-[#0d9488] transition-all text-xs font-medium"
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </a>
              )}
              {contact.portfolio && (
                <a
                  href={contact.portfolio.startsWith('http') ? contact.portfolio : `https://${contact.portfolio}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-[#0d9488] transition-all text-xs font-medium"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Portfolio
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-10">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all shadow-xs"
              >
                <Download className="w-4 h-4 text-slate-500" />
                View Original File
              </a>
            )}

            <Button
              onClick={onReupload}
              className="px-4 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all shadow-md shadow-[#043c44]/20 flex items-center gap-2 border border-[#043c44]"
            >
              <Upload className="w-4 h-4 text-teal-300" />
              Upload New Version
            </Button>
          </div>
        </div>

        {/* Glow decoration */}
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
      </Card>

      {/* AI Resume Analysis Section */}
      <ResumeAnalysisView resumeId={resume.id} targetRole={targetRole || undefined} />

      {/* Summary Section */}
      {parsedJson?.summary && (
        <Card className="glass-panel p-6 rounded-2xl border-teal-100 bg-white/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-lg">
            <Sparkles className="w-5 h-5 text-[#0d9488]" />
            <h2>Professional Summary</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed font-normal">{parsedJson.summary}</p>
        </Card>
      )}

      {/* Main Grid: Experience + Skills / Education */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 columns: Experience & Projects */}
        <div className="lg:col-span-2 space-y-8">
          {/* Work Experience */}
          <Card className="glass-panel p-6 rounded-2xl border-teal-100 bg-white/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-lg">
                <Briefcase className="w-5 h-5 text-[#0d9488]" />
                <h2>Work Experience</h2>
              </div>
              <span className="text-xs text-slate-400 font-semibold">{workExperience.length} items</span>
            </div>

            {workExperience.length > 0 ? (
              <div className="space-y-6">
                {workExperience.map((exp, idx) => (
                  <div
                    key={idx}
                    className="relative pl-6 border-l-2 border-teal-200/80 space-y-2 group hover:border-[#0d9488] transition-colors"
                  >
                    {/* Circle Dot */}
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#0d9488] group-hover:bg-[#0d9488] transition-colors" />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-base text-[#043c44]">{exp.position || 'Role Title'}</h3>
                      {(exp.startDate || exp.endDate) && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                          <Calendar className="w-3 h-3 text-[#0d9488]" />
                          {exp.startDate} - {exp.endDate || 'Present'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-[#0d9488]">
                      {exp.company} {exp.location ? `• ${exp.location}` : ''}
                    </p>

                    {exp.description && exp.description.length > 0 && (
                      <ul className="list-disc list-outside ml-4 space-y-1.5 pt-1 text-xs text-slate-600 leading-relaxed">
                        {exp.description.map((bullet, bIdx) => (
                          <li key={bIdx}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No work experience listed in resume.</p>
            )}
          </Card>

          {/* Projects */}
          {projects.length > 0 && (
            <Card className="glass-panel p-6 rounded-2xl border-teal-100 bg-white/90 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-lg">
                  <FolderGit2 className="w-5 h-5 text-[#0d9488]" />
                  <h2>Projects</h2>
                </div>
                <span className="text-xs text-slate-400 font-semibold">{projects.length} items</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:border-teal-300 hover:bg-teal-50/30 transition-colors duration-150 space-y-2 flex flex-col justify-between min-h-[120px] shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-[#043c44]">{proj.title}</h3>
                        {proj.link && (
                          <a
                            href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#0d9488] hover:underline font-semibold"
                          >
                            Link
                          </a>
                        )}
                      </div>
                      {proj.description && (
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {proj.description}
                        </p>
                      )}
                    </div>

                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {proj.technologies.map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right 1 column: Skills & Education */}
        <div className="space-y-8">
          {/* Skills */}
          <Card className="glass-panel p-6 rounded-2xl border-teal-100 bg-white/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-lg border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-[#0d9488]" />
              <h2>Skills</h2>
            </div>

            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3 py-1 rounded-xl bg-teal-50 text-[#0d9488] border border-teal-200/80 font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No explicit skills listed.</p>
            )}
          </Card>

          {/* Education */}
          <Card className="glass-panel p-6 rounded-2xl border-teal-100 bg-white/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-lg border-b border-slate-100 pb-3">
              <GraduationCap className="w-5 h-5 text-[#0d9488]" />
              <h2>Education</h2>
            </div>

            {education.length > 0 ? (
              <div className="space-y-4">
                {education.map((edu, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                    <h3 className="font-bold text-sm text-[#043c44]">{edu.degree || 'Degree'}</h3>
                    {edu.fieldOfStudy && (
                      <p className="text-xs text-[#0d9488] font-medium">{edu.fieldOfStudy}</p>
                    )}
                    <p className="text-xs text-slate-600 font-semibold">{edu.institution}</p>
                    {(edu.startDate || edu.endDate || edu.score) && (
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400 pt-1">
                        <span>
                          {edu.startDate} {edu.endDate ? `- ${edu.endDate}` : ''}
                        </span>
                        {edu.score && <span className="font-semibold text-slate-600">Score: {edu.score}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No education listed.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
