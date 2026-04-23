import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X, Briefcase, ChevronRight, Wand2, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const ALL_SKILLS = [
  'JavaScript','TypeScript','Python','Java','C++','C#','Go','Rust','Ruby','PHP','Swift','Kotlin','Scala','R',
  'React','Vue','Angular','Svelte','Next.js','Nuxt.js','HTML','CSS','Tailwind','Bootstrap','Redux','Vite','Webpack',
  'Node.js','Express','FastAPI','Django','Flask','Spring Boot','Laravel','Rails','NestJS','GraphQL','REST','gRPC',
  'PostgreSQL','MySQL','MongoDB','Redis','Elasticsearch','Cassandra','SQLite','DynamoDB','Firebase','ClickHouse',
  'AWS','GCP','Azure','Docker','Kubernetes','Terraform','Ansible','Jenkins','GitHub Actions','CI/CD','Linux','Bash',
  'Machine Learning','Deep Learning','TensorFlow','PyTorch','Scikit-learn','Pandas','NumPy','Spark','Kafka','Airflow',
  'React Native','Flutter','iOS','Android',
  'Git','Jira','Figma','Postman','Agile','Scrum','TDD','BDD','SOLID','Design Patterns',
];

const CATEGORIES = {
  'Frontend': ['JavaScript','TypeScript','React','Vue','Angular','Svelte','Next.js','HTML','CSS','Tailwind','Bootstrap','Redux'],
  'Backend': ['Node.js','Python','Java','Go','Express','FastAPI','Django','Flask','Spring Boot','NestJS','GraphQL','REST'],
  'Database': ['PostgreSQL','MySQL','MongoDB','Redis','Elasticsearch','DynamoDB','Firebase','ClickHouse'],
  'DevOps / Cloud': ['AWS','GCP','Azure','Docker','Kubernetes','Terraform','CI/CD','GitHub Actions','Linux'],
  'Mobile': ['React Native','Flutter','iOS','Android','Swift','Kotlin'],
  'Data / ML': ['Machine Learning','Deep Learning','TensorFlow','PyTorch','Pandas','NumPy','Spark','Kafka'],
  'Tools': ['Git','Jira','Figma','Agile','Scrum','TDD'],
};

const SkillChip = ({ skill, selected, onClick }) => (
  <button type="button" onClick={() => onClick(skill)}
    className={selected ? 'skill-chip-selected' : 'skill-chip-default'}>
    {selected && <X size={12} />}
    {skill}
  </button>
);

export default function JobBuilderPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(jobId);

  const [form, setForm] = useState({
    title: '', description: '',
    requiredSkills: [], niceToHaveSkills: [],
    experienceMin: 2, experienceMax: 5,
    educationLevel: '', location: '', employmentType: 'full-time',
  });
  const [activeTab, setActiveTab] = useState('required');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchSkill, setSearchSkill] = useState('');
  const [activeCategory, setActiveCategory] = useState('Frontend');

  useEffect(() => {
    if (isEdit) {
      api.get(`/api/jobs/${jobId}`).then(r => {
        const j = r.data.job;
        setForm({
          title: j.title || '',
          description: j.description || '',
          requiredSkills: j.required_skills || [],
          niceToHaveSkills: j.nice_to_have_skills || [],
          experienceMin: j.experience_min || 2,
          experienceMax: j.experience_max || 5,
          educationLevel: j.education_level || '',
          location: j.location || '',
          employmentType: j.employment_type || 'full-time',
        });
      }).catch(() => toast.error('Failed to load job'));
    }
  }, [jobId]);

  const toggleSkill = (skill, type) => {
    setForm(prev => {
      const key = type === 'required' ? 'requiredSkills' : 'niceToHaveSkills';
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill],
      };
    });
  };

  const filteredSkills = searchSkill
    ? ALL_SKILLS.filter(s => s.toLowerCase().includes(searchSkill.toLowerCase()))
    : (CATEGORIES[activeCategory] || []);

  const handleGenerateDesc = async () => {
    if (!form.title) { toast.error('Enter a job title first'); return; }
    setGenerating(true);
    try {
      const { data } = await api.post('/api/jobs/generate-description', {
        title: form.title,
        requiredSkills: form.requiredSkills,
        niceToHaveSkills: form.niceToHaveSkills,
        experienceMin: form.experienceMin,
        experienceMax: form.experienceMax,
        employmentType: form.employmentType,
        location: form.location,
      });
      setForm(prev => ({ ...prev, description: data.description }));
      toast.success('Description generated!');
    } catch {
      toast.error('Failed to generate description');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) { toast.error('Job title is required'); return; }
    if (form.requiredSkills.length === 0) { toast.error('Add at least one required skill'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/api/jobs/${jobId}`, form);
        toast.success('Job updated!');
      } else {
        const { data } = await api.post('/api/jobs', form);
        toast.success('Job created!');
        navigate(`/jobs/${data.job.id}/candidates`);
        return;
      }
      navigate('/jobs');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white mb-1">
          {isEdit ? 'Edit Job Opening' : 'Create Job Opening'}
        </h1>
        <p className="text-slate-500">Build your job requirement by selecting skills — no typing needed.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card space-y-5">
          <h2 className="font-display font-semibold text-white flex items-center gap-2">
            <Briefcase size={18} className="text-primary-400" /> Basic Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Job Title *</label>
              <input type="text" className="input" placeholder="e.g. Senior Full Stack Engineer"
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Location</label>
              <input type="text" className="input" placeholder="e.g. Remote / New York"
                value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="label">Employment Type</label>
              <select className="input" value={form.employmentType} onChange={e => setForm(p => ({ ...p, employmentType: e.target.value }))}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="label">Min Experience (years)</label>
              <input type="number" min={0} max={20} className="input"
                value={form.experienceMin} onChange={e => setForm(p => ({ ...p, experienceMin: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Max Experience (years)</label>
              <input type="number" min={0} max={30} className="input"
                value={form.experienceMax} onChange={e => setForm(p => ({ ...p, experienceMax: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Education Level</label>
              <select className="input" value={form.educationLevel} onChange={e => setForm(p => ({ ...p, educationLevel: e.target.value }))}>
                <option value="">Any</option>
                <option value="high school">High School</option>
                <option value="associate">Associate</option>
                <option value="bachelor">Bachelor's</option>
                <option value="master">Master's</option>
                <option value="phd">PhD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Skill Selector */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-white">Skill Requirements</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setActiveTab('required')}
                className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', activeTab === 'required' ? 'bg-primary-500/20 text-primary-300' : 'text-slate-400 hover:text-white')}>
                Required ({form.requiredSkills.length})
              </button>
              <button type="button" onClick={() => setActiveTab('nice')}
                className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', activeTab === 'nice' ? 'bg-primary-500/20 text-primary-300' : 'text-slate-400 hover:text-white')}>
                Nice-to-have ({form.niceToHaveSkills.length})
              </button>
            </div>
          </div>

          {/* Selected Skills */}
          {(activeTab === 'required' ? form.requiredSkills : form.niceToHaveSkills).length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-dark-900 min-h-12">
              {(activeTab === 'required' ? form.requiredSkills : form.niceToHaveSkills).map(skill => (
                <button key={skill} type="button"
                  onClick={() => toggleSkill(skill, activeTab === 'required' ? 'required' : 'nice')}
                  className="skill-chip-selected text-sm">
                  <X size={12} /> {skill}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <input type="text" className="input" placeholder="Search skills..."
            value={searchSkill} onChange={e => setSearchSkill(e.target.value)} />

          {/* Category Tabs */}
          {!searchSkill && (
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(CATEGORIES).map(cat => (
                <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
                  className={clsx('px-3 py-1 rounded-lg text-xs font-medium transition-colors', activeCategory === cat ? 'bg-dark-700 text-white' : 'text-slate-500 hover:text-slate-300')}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Skill Chips */}
          <div className="flex flex-wrap gap-2">
            {filteredSkills.map(skill => {
              const isReq = form.requiredSkills.includes(skill);
              const isNice = form.niceToHaveSkills.includes(skill);
              return (
                <SkillChip
                  key={skill}
                  skill={skill}
                  selected={activeTab === 'required' ? isReq : isNice}
                  onClick={() => toggleSkill(skill, activeTab === 'required' ? 'required' : 'nice')}
                />
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-white">Job Description</h2>
            <button type="button" onClick={handleGenerateDesc} disabled={generating}
              className="btn-secondary text-sm py-1.5">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Auto-Generate
            </button>
          </div>
          <textarea
            rows={10}
            className="input resize-none font-mono text-sm"
            placeholder="Job description will appear here, or write your own..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/jobs')} className="btn-secondary flex-1 justify-center py-3">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
            {loading ? <Loader2 size={16} className="animate-spin" /> : isEdit ? 'Save Changes' : 'Create & Match'}
            {!loading && <ChevronRight size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
