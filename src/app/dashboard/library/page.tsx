'use client';

import React from 'react';
import {
  BookOpen,
  UploadCloud,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  FolderOpen
} from 'lucide-react';
import { KnowledgeService } from '@/services/knowledge.service';
import { CurriculumService } from '@/services/curriculum.service';

const DOC_TYPES = [
  { value: 'icai_material', label: 'ICAI Study Material' },
  { value: 'rtp', label: 'Revision Test Paper (RTP)' },
  { value: 'mtp', label: 'Mock Test Paper (MTP)' },
  { value: 'pyq', label: 'Previous Year Question (PYQ)' },
  { value: 'teacher_notes', label: 'Teacher Notes' },
  { value: 'formula_sheet', label: 'Formula Sheet' },
  { value: 'other', label: 'Other Reference Document' },
];

export default function LibraryPage() {
  const [documents, setDocuments] = React.useState<any[]>([]);
  const [subjects, setSubjects] = React.useState<any[]>([]);
  
  // Upload form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [docType, setDocType] = React.useState('icai_material');
  const [selectedSubject, setSelectedSubject] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');

  const loadLibraryData = React.useCallback(async () => {
    try {
      const docs = await KnowledgeService.getDocuments();
      setDocuments(Array.isArray(docs) ? docs : docs.results || []);
      
      const subs = await CurriculumService.getSubjects();
      setSubjects(Array.isArray(subs) ? subs : subs.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadLibraryData();
    // Poll documents status every 5 seconds to show real-time processing updates
    const interval = setInterval(async () => {
      try {
        const docs = await KnowledgeService.getDocuments();
        setDocuments(Array.isArray(docs) ? docs : docs.results || []);
      } catch (e) {}
    }, 5000);

    return () => clearInterval(interval);
  }, [loadLibraryData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) {
        // Auto-fill title from filename
        const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setTitle(cleanName);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!file) {
      setError('Please select a PDF, DOCX, or TXT file to upload.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('doc_type', docType);
    formData.append('file', file);
    if (selectedSubject) {
      formData.append('subject', selectedSubject);
    }

    try {
      await KnowledgeService.uploadDocument(formData);
      setSuccessMsg('Document uploaded! RAG embedding pipeline started in the background.');
      setTitle('');
      setDescription('');
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      loadLibraryData();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to upload document. Please check size limits (50MB).');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'processing':
      case 'chunking':
      case 'embedding':
        return <RefreshCw className="h-5 w-5 text-indigo-400 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-black text-white">ICAI Knowledge Brain</h2>
        <p className="text-zinc-500 text-sm">Upload study books, revision test papers, and notes. The AI will index and quote them.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Upload form */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit space-y-6">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Upload Reference material</h3>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            {/* File drag-drop input */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Document File (PDF, DOCX, TXT)
              </label>
              <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-6 text-center cursor-pointer relative bg-zinc-950 transition-colors">
                <input
                  id="file-upload-input"
                  type="file"
                  required
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-white text-xs font-medium">
                  {file ? file.name : 'Select or drop file here'}
                </p>
                <p className="text-zinc-500 text-[10px] mt-1">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Max size: 50MB'}
                </p>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Document Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Accounting Module Chapter 2"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of the content..."
                rows={2}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                {DOC_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Course Subject Link
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Subject (Optional)</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right column: Document list */}
        <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Library Index</h3>
            </div>
            <span className="text-xs px-2.5 py-1 bg-zinc-800 rounded-lg text-zinc-400 font-mono">
              {documents.length} Files
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-zinc-500 flex flex-col items-center">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
              <span>Scanning library index...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 space-y-2 border border-dashed border-zinc-800 rounded-xl">
              <BookOpen className="h-10 w-10 text-zinc-700 mx-auto" />
              <p className="text-white font-semibold text-sm">Your library is currently empty</p>
              <p className="text-xs max-w-xs mx-auto">Upload the ICAI chapter PDFs on the left to activate RAG mentor assistance.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{doc.title}</h4>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {doc.doc_type_display} • {doc.subject_name || 'General'}
                      </p>
                      <p className="text-zinc-500 text-[10px] mt-1">
                        Size: {(doc.file_size / (1024 * 1024)).toFixed(2)} MB • Chunks: {doc.chunk_count} • Pages: {doc.page_count}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold capitalize">
                      {getStatusIcon(doc.status)}
                      <span className={
                        doc.status === 'ready' ? 'text-emerald-400' : (doc.status === 'error' ? 'text-red-400' : 'text-indigo-400')
                      }>
                        {doc.status_display}
                      </span>
                    </div>

                    {/* Date */}
                    <span className="text-zinc-600 text-[10px]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
