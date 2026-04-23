import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  ChevronRight, Mail, Phone, MapPin, Github, Linkedin, Award,
  Briefcase, MessageSquare, Loader2, CheckCircle, XCircle, Star, ExternalLink
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const PIPELINE_STAGES = [
  { value: 'screening', label: 'Screening' },
  { value: 'phone_interview', label: 'Phone Interview' },
  { value: 'technical', label: 'Technical' },
  { value: 'final_interview', label: 'Final Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

export default function CandidateDetailPage() {
  const { candidateId } = useParams();
  const location = useLocation();
  const jobId = location.state?.jobId;

  const [candidate, setCandidate] = useState(null);
  const [application, setApplication] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/candidates/${candidateId}`),
    ]).then(([res]) => {
      setCandidate(res.data.candidate);
      if (jobId && res.data.candidate.applications) {
        const app = res.data.candidate.applications.find(a => a.job_id === jobId);
        if (app) setApplication(app);
      }
    }).catch(() => toast.error('Failed to load candidate')).finally(() => setLoading(false));
  }, [candidateId, jobId]);

  const generateQuestions = async () => {
    if (!jobId) { toast.error('No job context — navigate here from a job results page'); return; }
    setLoadingQuestions(true);
    try {
      const { data } = await api.post(`/candidates/${candidateId}/interview-questions/${jobId}`);
      setQuestions(data.questions);
      toast.success(`${data.questions.length} interview questions generated!`);
    } catch { toast.error('Failed to generate questions'); }
    finally { setLoadingQuestions(false); }
  };

  const updateStage = async (stage) => {
    if (!application) return;
    try {
      await api.put(`/candidates/pipeline/${application.id}`, { stage });
      setApplication(prev => ({ ...prev, pipeline_stage: stage }));
      toast.success(`Moved to ${stage.replace('_', ' ')}`);
    } catch { toast.error('Failed to update stage'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="text-primary-400 animate-spin" />
    </div>
  );

  if (!candidate) return (
    <div className="p-8 text-center text-slate-500">Candidate not found</div>
  );

  const skills = Array.isArray(candidate.skills) ? candidate.skills :
    (typeof candidate.skills === 'string' ? JSON.parse(candidate.skills || '[]') : []);
  const education = Array.isArray(candidate.education) ? candidate.education :
    (typeof candidate.education === 'string' ? JSON.parse(candidate.education || '[]') : []);
  const matchScore = application?.match_score;
  const skillGap = application?.skill_gap ? (typeof application.skill_gap === 'string' ? JSON.parse(application.skill_gap) : application.skill_gap) : [];
  const matchedSkills = application?.matched_skills ? (typeof application.matched_skills === 'string' ? JSON.parse(application.matched_skills) : application.matched_skills) : [];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-slide-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/jobs" className="hover:text-slate-300">Jobs</Link>
        {jobId && <><ChevronRight size={14} /><Link to={`/jobs/${jobId}/candidates`} className="hover:text-slate-300">Candidates</Link></>}
        <ChevronRight size={14} />
        <span className="text-slate-300">{candidate.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Profile Card */}
          <div className="card text-center">
            <div className="w-20 h-20 rounded-full bg-primary-500/10 border-2 border-primary-500/30 flex items-center justify-center mx-auto mb-4 text-3xl font-display font-bold text-primary-400">
              {candidate.name?.[0]?.toUpperCase() || '?'}
            </div>
            <h2 className="font-display text-xl font-bold text-white mb-1">{candidate.name}</h2>
            {candidate.email && (
              <a href={`mailto:${candidate.email}`} className="flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-primary-400 mb-1 transition-colors">
                <Mail size={13} /> {candidate.email}
              </a>
            )}
            {candidate.phone && (
              <p className="flex items-center justify-center gap-1.5 text-sm text-slate-500 mb-1">
                <Phone size={13} /> {candidate.phone}
              </p>
            )}
            {candidate.location && (
              <p className="flex items-center justify-center gap-1.5 text-sm text-slate-500">
                <MapPin size={13} /> {candidate.location}
              </p>
            )}
            <div className="flex justify-center gap-3 mt-4">
              {candidate.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noreferrer"
                  className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center text-blue-400 hover:bg-blue-900/30 transition-colors">
                  <Linkedin size={16} />
                </a>
              )}
              {candidate.github_url && (
                <a href={candidate.github_url} target="_blank" rel="noreferrer"
                  className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center text-slate-300 hover:bg-dark-600 transition-colors">
                  <Github size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Match Score */}
          {matchScore !== undefined && (
            <div className="card text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Match Score</p>
              <div className={`text-5xl font-display font-bold mb-2
                ${matchScore >= 80 ? 'text-emerald-400' : matchScore >= 60 ? 'text-blue-400' : matchScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {matchScore}%
              </div>
              <div className="w-full h-3 bg-dark-900 rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full transition-all duration-1000 ${matchScore >= 80 ? 'bg-emerald-500' : matchScore >= 60 ? 'bg-blue-500' : matchScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${matchScore}%` }} />
              </div>
              {matchScore >= 80 && <p className="text-xs text-emerald-400">⭐ Strongly Recommended</p>}
              {matchScore >= 60 && matchScore < 80 && <p className="text-xs text-blue-400">👍 Recommended</p>}
              {matchScore < 60 && <p className="text-xs text-slate-500">Consider other candidates first</p>}
            </div>
          )}

          {/* Pipeline Stage */}
          {application && (
            <div className="card">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Pipeline Stage</p>
              <div className="space-y-1.5">
                {PIPELINE_STAGES.map(s => (
                  <button key={s.value} onClick={() => updateStage(s.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between
                      ${application.pipeline_stage === s.value
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                        : 'text-slate-400 hover:bg-dark-700 hover:text-slate-200'}`}>
                    {s.label}
                    {application.pipeline_stage === s.value && <CheckCircle size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={16} className="text-primary-400" />
              <p className="font-medium text-white text-sm">Experience</p>
            </div>
            <p className="text-2xl font-display font-bold text-white">{candidate.experience_years || 0}</p>
            <p className="text-slate-500 text-sm">years of experience</p>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Summary */}
          {candidate.summary && (
            <div className="card">
              <h3 className="font-display font-semibold text-white mb-3">Summary</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{candidate.summary}</p>
            </div>
          )}

          {/* Skills */}
          <div className="card">
            <h3 className="font-display font-semibold text-white mb-4">Skills ({skills.length})</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => {
                const isMatched = matchedSkills.some(m => m.skill?.toLowerCase() === skill.toLowerCase());
                const isGap = false; // not a gap since they have it
                return (
                  <span key={skill} className={isMatched ? 'badge badge-green' : 'badge badge-gray'}>
                    {isMatched && <CheckCircle size={10} />}
                    {skill}
                  </span>
                );
              })}
            </div>

            {skillGap.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dark-700">
                <p className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1.5">
                  <XCircle size={14} /> Skill Gaps ({skillGap.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {skillGap.map(s => (
                    <span key={s} className="badge badge-red"><XCircle size={10} /> {s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Education */}
          {education.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} className="text-primary-400" />
                <h3 className="font-display font-semibold text-white">Education</h3>
              </div>
              <div className="space-y-3">
                {education.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-dark-900">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 shrink-0 text-xs font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{e.degree}</p>
                      {e.institution && <p className="text-xs text-slate-500">{e.institution}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interview Questions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-primary-400" />
                <h3 className="font-display font-semibold text-white">Interview Questions</h3>
              </div>
              <button onClick={generateQuestions} disabled={loadingQuestions || !jobId} className="btn-primary text-sm py-1.5">
                {loadingQuestions ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
                {questions.length > 0 ? 'Regenerate' : 'Generate'}
              </button>
            </div>

            {!jobId && (
              <p className="text-sm text-slate-600 text-center py-4">Navigate here from a job results page to generate questions</p>
            )}

            {questions.length > 0 && (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="p-4 rounded-xl bg-dark-900 border border-dark-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge text-xs
                        ${q.type === 'Technical' ? 'badge-blue' :
                          q.type === 'Behavioral' ? 'badge-green' :
                          q.type === 'Situational' ? 'badge-yellow' :
                          'badge-gray'}`}>
                        {q.type}
                      </span>
                      <span className="text-xs text-slate-600">{q.category}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{q.question}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
