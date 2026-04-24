import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.debug('[login] submit', { email: form.email });

    try {
      const result = await login({ email: form.email, password: form.password });

      if (result.success) {
        toast.success('Welcome back!');
        navigate('/dashboard', { replace: true });
        return;
      }

      if (result.error?.toLowerCase().includes('not verified')) {
        toast.error(result.error);
        navigate('/verify-otp', { state: { email: form.email }, replace: true });
        return;
      }

      toast.error(result.error || 'Login failed');
      console.warn('[login] failed', result.error);
    } catch (error) {
      console.error('[login] unexpected error', error);
      toast.error('Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-dark-900 border-r border-dark-700 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-transparent" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Zap size={22} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white">AI Hiring Platform</span>
          </div>

          <h2 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            Hire smarter,<br />not harder.
          </h2>
          <p className="text-slate-400 text-lg mb-12 leading-relaxed">
            AI-powered resume intelligence that ranks candidates, analyzes skill gaps, and generates interview questions automatically.
          </p>

          <div className="space-y-4">
            {[
              { emoji: '⚡', title: 'Instant Matching', desc: 'Match 100s of resumes to a job in seconds' },
              { emoji: '🎯', title: 'Explainable Scores', desc: 'Understand exactly why each candidate ranked' },
              { emoji: '🤖', title: 'AI Interview Prep', desc: 'Auto-generate tailored interview questions' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                <span className="text-2xl">{f.emoji}</span>
                <div>
                  <p className="font-medium text-white text-sm">{f.title}</p>
                  <p className="text-slate-500 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-white">AI Hiring Platform</span>
          </div>

          <h1 className="font-display text-3xl font-bold text-white mb-2">Sign in</h1>
          <p className="text-slate-500 mb-8">Welcome back — your hiring pipeline awaits.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  className="input pl-10"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 mt-6 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
              Create one free
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
