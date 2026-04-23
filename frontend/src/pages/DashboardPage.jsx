import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Briefcase, Users, TrendingUp, Upload, Plus,
  ArrowUpRight, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const StatCard = ({ icon: Icon, label, value, change, color = 'blue', to }) => (
  <Link to={to || '#'} className="card hover:border-dark-600 transition-all duration-200 group">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
        ${color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
          color === 'green' ? 'bg-emerald-500/10 text-emerald-400' :
          color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
          'bg-amber-500/10 text-amber-400'}`}>
        <Icon size={20} />
      </div>
      <ArrowUpRight size={16} className="text-slate-600 group-hover:text-primary-400 transition-colors" />
    </div>
    <p className="text-3xl font-display font-bold text-white mb-1">{value ?? '—'}</p>
    <p className="text-sm text-slate-500">{label}</p>
  </Link>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {};
  const recentActivity = data?.recentActivity || [];
  const topSkills = data?.topSkills || [];
  const pipelineStats = data?.pipelineStats || [];
  const scoreDistribution = data?.scoreDistribution || [];

  // Fill last 7 days even if no data
  const activityData = (() => {
    const map = {};
    recentActivity.forEach(r => { map[r.date] = parseInt(r.count); });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().split('T')[0];
      return { date: key.slice(5), count: map[key] || 0 };
    });
  })();

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="w-10 h-10 bg-dark-700 rounded-xl mb-4" />
              <div className="h-8 w-16 bg-dark-700 rounded mb-2" />
              <div className="h-4 w-24 bg-dark-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Good morning, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">Here's what's happening in your hiring pipeline.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/resumes/upload" className="btn-secondary text-sm py-2">
            <Upload size={15} /> Upload Resumes
          </Link>
          <Link to="/jobs/new" className="btn-primary text-sm py-2">
            <Plus size={15} /> New Job
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Resumes" value={stats.totalResumes} color="blue" to="/resumes" />
        <StatCard icon={Briefcase} label="Active Jobs" value={stats.totalJobs} color="purple" to="/jobs" />
        <StatCard icon={Users} label="Candidates" value={stats.totalCandidates} color="green" to="/jobs" />
        <StatCard icon={TrendingUp} label="Applications" value={stats.totalApplications} color="amber" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Activity */}
        <div className="card">
          <h3 className="font-display font-semibold text-white mb-1">Resume Uploads</h3>
          <p className="text-xs text-slate-500 mb-6">Last 7 days</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Resumes" stroke="#0ea5e9" fill="url(#blueGrad)" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Score Distribution */}
        <div className="card">
          <h3 className="font-display font-semibold text-white mb-1">Match Score Distribution</h3>
          <p className="text-xs text-slate-500 mb-6">Across all applications</p>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={scoreDistribution.length ? scoreDistribution : [{ range: 'No Data', count: 1 }]}
                  dataKey="count" nameKey="range" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {(scoreDistribution.length ? scoreDistribution : [{ range: 'No Data', count: 1 }]).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {(scoreDistribution.length ? scoreDistribution : [{ range: 'No data yet', count: 0 }]).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-400 text-xs">{s.range}</span>
                  </div>
                  <span className="text-white font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills */}
        <div className="card">
          <h3 className="font-display font-semibold text-white mb-1">Top Skills in Talent Pool</h3>
          <p className="text-xs text-slate-500 mb-6">Most common among your candidates</p>
          {topSkills.length === 0 ? (
            <div className="text-center py-8 text-slate-600">Upload resumes to see skill data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topSkills.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Candidates" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pipeline */}
        <div className="card">
          <h3 className="font-display font-semibold text-white mb-1">Hiring Pipeline</h3>
          <p className="text-xs text-slate-500 mb-6">Candidates by stage</p>
          {pipelineStats.length === 0 ? (
            <div className="text-center py-8 text-slate-600">Match candidates to jobs to see pipeline data</div>
          ) : (
            <div className="space-y-3">
              {pipelineStats.map((s, i) => {
                const max = Math.max(...pipelineStats.map(x => parseInt(x.count)));
                const pct = max > 0 ? (parseInt(s.count) / max) * 100 : 0;
                const labels = {
                  screening: { label: 'Screening', color: 'bg-slate-500' },
                  phone_interview: { label: 'Phone Interview', color: 'bg-blue-500' },
                  technical: { label: 'Technical', color: 'bg-purple-500' },
                  final_interview: { label: 'Final Interview', color: 'bg-amber-500' },
                  offer: { label: 'Offer', color: 'bg-emerald-500' },
                  hired: { label: 'Hired', color: 'bg-green-400' },
                  rejected: { label: 'Rejected', color: 'bg-red-500' },
                };
                const meta = labels[s.pipeline_stage] || { label: s.pipeline_stage, color: 'bg-primary-500' };
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-400">{meta.label}</span>
                      <span className="text-white font-medium">{s.count}</span>
                    </div>
                    <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
                      <div className={`h-full ${meta.color} rounded-full progress-bar`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="font-display font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/resumes/upload', icon: Upload, label: 'Upload Resumes', desc: 'Add candidate resumes to your pool', color: 'text-blue-400' },
            { to: '/jobs/new', icon: Plus, label: 'Create Job Opening', desc: 'Define skills and requirements', color: 'text-emerald-400' },
            { to: '/jobs', icon: ChevronRight, label: 'Match Candidates', desc: 'Run AI matching on any job', color: 'text-purple-400' },
          ].map(({ to, icon: Icon, label, desc, color }) => (
            <Link key={to} to={to} className="flex items-start gap-4 p-4 rounded-xl bg-dark-900 border border-dark-700 hover:border-dark-600 transition-all group">
              <div className={`mt-0.5 ${color}`}><Icon size={20} /></div>
              <div>
                <p className="font-medium text-white text-sm group-hover:text-primary-400 transition-colors">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
