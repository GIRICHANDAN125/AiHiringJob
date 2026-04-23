import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, Users, ChevronRight, Edit2, Trash2, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const styles = { active: 'badge-green', closed: 'badge-red', draft: 'badge-gray' };
  return <span className={styles[status] || 'badge-gray'}>{status}</span>;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = () => {
    setLoading(true);
    api.get('/api/jobs').then(r => setJobs(r.data.jobs || [])).catch(() => toast.error('Failed to load jobs')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/jobs/${id}`);
      toast.success('Job deleted');
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Job Openings</h1>
          <p className="text-slate-500">{jobs.length} jobs created</p>
        </div>
        <Link to="/jobs/new" className="btn-primary"><Plus size={16} /> New Job</Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-primary-400 animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase size={48} className="text-slate-700 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-white mb-2">No jobs yet</h3>
          <p className="text-slate-500 mb-6">Create your first job opening to start matching candidates.</p>
          <Link to="/jobs/new" className="btn-primary mx-auto w-fit"><Plus size={16} /> Create First Job</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map(job => (
            <div key={job.id} className="card hover:border-dark-600 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-semibold text-white truncate">{job.title}</h3>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="text-sm text-slate-500">{job.location || 'Remote'} · {job.employment_type}</p>
                </div>
                <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to={`/jobs/${job.id}/edit`} className="btn-ghost p-2"><Edit2 size={15} /></Link>
                  <button onClick={() => handleDelete(job.id, job.title)} className="btn-ghost p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"><Trash2 size={15} /></button>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(job.required_skills || []).slice(0, 5).map(s => (
                  <span key={s} className="badge badge-blue">{s}</span>
                ))}
                {(job.required_skills || []).length > 5 && (
                  <span className="badge badge-gray">+{job.required_skills.length - 5} more</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-dark-700">
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><Users size={14} /> {job.application_count || 0} candidates</span>
                  {job.avg_match_score && (
                    <span className="text-emerald-400 font-medium">Avg {Math.round(job.avg_match_score)}% match</span>
                  )}
                </div>
                <Link to={`/jobs/${job.id}/candidates`} className="btn-primary py-1.5 text-sm">
                  Match Candidates <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
