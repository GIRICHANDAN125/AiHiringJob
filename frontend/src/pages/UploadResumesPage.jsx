import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const FileItem = ({ file, status, result, error }) => (
  <div className="flex items-center gap-4 p-4 rounded-xl bg-dark-900 border border-dark-700">
    <div className="w-10 h-10 bg-dark-800 rounded-lg flex items-center justify-center shrink-0">
      <FileText size={20} className="text-slate-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
      {result && (
        <div className="flex flex-wrap gap-2 mt-2">
          {result.candidateName && <span className="badge badge-blue">{result.candidateName}</span>}
          {result.skillsFound > 0 && <span className="badge badge-green">{result.skillsFound} skills</span>}
          {result.qualityScore && <span className="badge badge-gray">Quality: {result.qualityScore}%</span>}
          {result.isDuplicate && <span className="badge badge-yellow">⚠ Duplicate</span>}
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
    <div className="shrink-0">
      {status === 'pending' && <div className="w-5 h-5 bg-dark-700 rounded-full" />}
      {status === 'uploading' && <Loader2 size={20} className="text-primary-400 animate-spin" />}
      {status === 'done' && <CheckCircle size={20} className="text-emerald-400" />}
      {status === 'error' && <AlertCircle size={20} className="text-red-400" />}
    </div>
  </div>
);

export default function UploadResumesPage() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState({});
  const [uploaded, setUploaded] = useState(false);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error('Some files were rejected. Only PDF and Word documents are allowed (max 10MB).');
    }
    const newFiles = accepted.map(f => ({ file: f, status: 'pending', id: Math.random().toString(36).slice(2) }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    // Mark all as uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })));

    const formData = new FormData();
    files.forEach(({ file }) => formData.append('resumes', file));

    try {
      const { data } = await api.post('/api/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const resultMap = {};
      data.results.forEach(r => { resultMap[r.filename] = { ...r, status: 'done' }; });
      data.errors.forEach(e => { resultMap[e.filename] = { error: e.error, status: 'error' }; });

      setFiles(prev => prev.map(f => ({
        ...f,
        status: resultMap[f.file.name]?.status || 'done',
      })));
      setResults(resultMap);
      setUploaded(true);
      toast.success(`${data.results.length} resume(s) processed successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setResults({});
    setUploaded(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white mb-1">Upload Resumes</h1>
        <p className="text-slate-500">Upload up to 20 resumes at once. We'll parse and extract candidate info automatically.</p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-6',
          isDragActive
            ? 'border-primary-400 bg-primary-900/10 dropzone-active'
            : 'border-dark-600 bg-dark-800/50 hover:border-dark-500 hover:bg-dark-800'
        )}
      >
        <input {...getInputProps()} />
        <div className={clsx(
          'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors',
          isDragActive ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-700 text-slate-500'
        )}>
          <Upload size={28} />
        </div>
        {isDragActive ? (
          <p className="text-primary-400 font-medium text-lg">Drop them here!</p>
        ) : (
          <>
            <p className="text-white font-medium text-lg mb-1">Drag & drop resumes here</p>
            <p className="text-slate-500 mb-4">or click to browse files</p>
            <p className="text-xs text-slate-600">Supports PDF, DOC, DOCX • Max 10MB per file • Up to 20 files</p>
          </>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-300">{files.length} file(s) selected</p>
            {!uploading && <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Clear all</button>}
          </div>
          {files.map(({ file, status, id }) => (
            <div key={id} className="relative">
              <FileItem
                file={file}
                status={status}
                result={results[file.name]}
                error={results[file.name]?.error}
              />
              {status === 'pending' && !uploading && (
                <button
                  onClick={() => removeFile(id)}
                  className="absolute top-3 right-3 text-slate-600 hover:text-slate-300 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!uploaded ? (
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="btn-primary flex-1 justify-center py-3"
          >
            {uploading ? (
              <><Loader2 size={16} className="animate-spin" /> Processing {files.length} files...</>
            ) : (
              <><Upload size={16} /> Upload {files.length > 0 ? `${files.length} ` : ''}Resumes</>
            )}
          </button>
        ) : (
          <div className="flex gap-3 w-full">
            <button onClick={clearAll} className="btn-secondary flex-1 justify-center py-3">
              Upload More
            </button>
            <Link to="/jobs" className="btn-primary flex-1 justify-center py-3">
              Match to Jobs <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-8 p-5 rounded-xl bg-dark-800 border border-dark-700">
        <h3 className="text-sm font-semibold text-white mb-3">💡 Tips for better results</h3>
        <ul className="space-y-1.5 text-sm text-slate-500">
          <li>• Use standard resume formats for best parsing accuracy</li>
          <li>• Resumes with clear sections (Skills, Experience, Education) parse best</li>
          <li>• Duplicate resumes are automatically detected and flagged</li>
          <li>• After uploading, go to a Job and click "Match Candidates"</li>
        </ul>
      </div>
    </div>
  );
}
