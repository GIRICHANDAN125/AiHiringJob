import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Upload, Search, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({});

  const fetchResumes = async (searchTerm = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/resumes', { params: { search: searchTerm, limit: 50 } });
      setResumes(data.resumes || []);
      setPagination(data.pagination || {});
    } catch { toast.error('Failed to load resumes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResumes(); }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchResumes(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this resume?')) return;
    try {
      await api.delete(`/resumes/${id}`);
      setResumes(prev => prev.filter(r => r.id !== id));
      toast.success('Resume deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const QualityBadge = ({ score }) => {
    if (score >= 70) return <span className="badge badge-green">{score}% quality</span>;
    if (score >= 40) return <span className="badge badge-yellow">{score}% quality</span>;
    return <span className="badge badge-red">{score}% quality</span>;
  };

  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Resume Library</h1>
          <p className="text-slate-500">{pagination.total || 0} resumes in your talent pool</p>
        </div>
        <Link to="/resumes/upload" className="btn-primary"><Upload size={16} /> Upload Resumes</Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" className="input pl-10" placeholder="Search by name or filename..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-primary-400 animate-spin" />
        </div>
      ) : resumes.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={48} className="text-slate-700 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-white mb-2">No resumes yet</h3>
          <p className="text-slate-500 mb-6">Upload your first batch of resumes to get started.</p>
          <Link to="/resumes/upload" className="btn-primary mx-auto w-fit"><Upload size={16} /> Upload Now</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {resumes.map(r => (
            <div key={r.id} className="card hover:border-dark-600 transition-all group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{r.filename}</p>
                  <p className="text-xs text-slate-500">{r.candidate_name || 'Unknown Candidate'}</p>
                </div>
                <button onClick={() => handleDelete(r.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <QualityBadge score={r.quality_score || 0} />
                {r.is_duplicate && (
                  <span className="badge badge-yellow"><AlertTriangle size={10} /> Duplicate</span>
                )}
                {r.experience_years > 0 && (
                  <span className="badge badge-gray">{r.experience_years}y exp</span>
                )}
              </div>

              {/* Top Skills */}
              <div className="flex flex-wrap gap-1 mb-3">
                {(Array.isArray(r.skills) ? r.skills : (typeof r.skills === 'string' ? JSON.parse(r.skills || '[]') : [])).slice(0, 4).map(s => (
                  <span key={s} className="badge badge-blue text-xs">{s}</span>
                ))}
              </div>

              <div className="pt-3 border-t border-dark-700 flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
                {r.email && (
                  <a href={`mailto:${r.email}`} className="text-xs text-slate-500 hover:text-primary-400 transition-colors truncate max-w-36">
                    {r.email}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
