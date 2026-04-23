import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, ChevronRight, Loader2, TrendingUp, AlertCircle, Star } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ScoreBar = ({ score }) => {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-dark-900 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold font-mono w-10 text-right ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-blue-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
        {score}%
      </span>
    </div>
  );
};

const RecommendationBadge = ({ rec }) => {
  if (!rec) return null;
  const styles = {
    green: 'badge-green',
    blue: 'badge-blue',
    yellow: 'badge-yellow',
    red: 'badge-red',
  };
  return <span className={styles[rec.color] || 'badge-gray'}>{rec.icon} {rec.label}</span>;
};

export default function CandidateResultsPage() {
  const { jobId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matched, setMatched] = useState(false);
  const [jobInfo, setJobInfo] = useState(null);

  useEffect(() => {
    api.get(`/jobs/${jobId}`).then(r => setJobInfo(r.data.job)).catch(() => {});
    // Auto-match on load
    runMatch();
  }, [jobId]);

  const runMatch = async () => {
    setLoading(true);
    try {
      const { data: result } = await api.post(`/candidates/match/${jobId}`);
      setData(result);
      setMatched(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Matching failed');
    } finally {
      setLoading(false);
    }
  };

  const candidates = data?.candidates || [];
  const topCandidates = candidates.filter(c => c.matchScore >= 60).length;

  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Link to="/jobs" className="hover:text-slate-300 transition-colors">Jobs</Link>
          <ChevronRight size={14} />
          <span className="text-slate-300">{jobInfo?.title || 'Job'}</span>
          <ChevronRight size={14} />
          <span>Candidates</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white mb-1">{jobInfo?.title || 'Candidate Results'}</h1>
            {matched && (
              <p className="text-slate-500">
                {candidates.length} candidates ranked · <span className="text-emerald-400">{topCandidates} strong matches</span>
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={runMatch} disabled={loading} className="btn-secondary text-sm">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <TrendingUp size={15} />}
              Re-run Matching
            </button>
            <Link to={`/jobs/${jobId}/edit`} className="btn-ghost text-sm py-2">Edit Job</Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      {matched && candidates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Candidates', value: candidates.length, color: 'text-white' },
            { label: 'Strong Matches (≥80%)', value: candidates.filter(c => c.matchScore >= 80).length, color: 'text-emerald-400' },
            { label: 'Good Matches (≥60%)', value: candidates.filter(c => c.matchScore >= 60).length, color: 'text-blue-400' },
            { label: 'Avg Match Score', value: `${Math.round(candidates.reduce((a, c) => a + c.matchScore, 0) / candidates.length)}%`, color: 'text-primary-400' },
          ].map(s => (
            <div key={s.label} className="card-sm text-center">
              <p className={`font-display text-2xl font-bold ${s.color} mb-1`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card text-center py-20">
          <Loader2 size={40} className="text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Running AI matching...</p>
          <p className="text-slate-500 text-sm mt-1">Analyzing skills, experience, and education</p>
        </div>
      )}

      {/* Empty */}
      {!loading && matched && candidates.length === 0 && (
        <div className="card text-center py-16">
          <Users size={48} className="text-slate-700 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-white mb-2">No candidates yet</h3>
          <p className="text-slate-500 mb-6">Upload resumes first, then come back to match candidates.</p>
          <Link to="/resumes/upload" className="btn-primary mx-auto w-fit">Upload Resumes</Link>
        </div>
      )}

      {/* Candidate List */}
      {!loading && candidates.length > 0 && (
        <div className="space-y-4">
          {candidates.map((c, idx) => (
            <div key={c.candidateId} className="card hover:border-dark-600 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Rank & Avatar */}
                <div className="flex items-center gap-4 sm:w-48 shrink-0">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg
                      ${idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                        idx === 1 ? 'bg-slate-500/20 text-slate-300 border border-slate-500/40' :
                        idx === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40' :
                        'bg-dark-700 text-slate-500 border border-dark-600'}`}>
                      {idx < 3 ? ['🥇','🥈','🥉'][idx] : `#${idx + 1}`}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{c.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{c.experienceYears || 0}y exp</p>
                    {c.email && <p className="text-xs text-slate-600 truncate max-w-32">{c.email}</p>}
                  </div>
                </div>

                {/* Score */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <RecommendationBadge rec={c.recommendation} />
                    <span className="text-xs text-slate-500">{c.matchedSkills?.length || 0}/{(c.matchedSkills?.length || 0) + (c.skillGap?.length || 0)} required skills</span>
                  </div>
                  <ScoreBar score={c.matchScore} />

                  {/* Skills */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(c.matchedSkills || []).slice(0, 5).map(s => (
                      <span key={s.skill} className="badge badge-green text-xs">{s.skill}</span>
                    ))}
                    {(c.skillGap || []).slice(0, 3).map(s => (
                      <span key={s} className="badge badge-red text-xs">Missing: {s}</span>
                    ))}
                    {(c.skillGap || []).length > 3 && (
                      <span className="badge badge-gray text-xs">+{c.skillGap.length - 3} gaps</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col gap-2 sm:w-32 shrink-0">
                  <Link to={`/candidates/${c.candidateId}`} state={{ jobId }}
                    className="btn-primary text-xs py-1.5 justify-center flex-1 sm:flex-none">
                    View Profile <ChevronRight size={13} />
                  </Link>
                </div>
              </div>

              {/* Score Breakdown (collapsed) */}
              {c.breakdown && (
                <div className="mt-4 pt-4 border-t border-dark-700 grid grid-cols-4 gap-3">
                  {Object.entries(c.breakdown).map(([key, val]) => {
                    const labels = { requiredSkills: 'Required Skills', niceToHaveSkills: 'Nice-to-have', experience: 'Experience', education: 'Education' };
                    return (
                      <div key={key} className="text-center">
                        <p className="font-mono font-bold text-primary-400 text-sm">{val.score}/{val.max}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{labels[key]}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
