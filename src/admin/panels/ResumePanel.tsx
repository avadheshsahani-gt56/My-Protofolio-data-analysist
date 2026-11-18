import { useRef, useState, type ChangeEvent } from 'react';
import { FileText, RotateCcw, Trash2, Upload } from 'lucide-react';
import { INITIAL_PORTFOLIO_DATA } from '../../data/initialPortfolio';
import { uploadAssetToSupabaseStorage } from '../../services/portfolioService';
import type { PortfolioData } from '../../types/portfolio';
import { useResolvedAssetUrl } from '../../hooks/useResolvedAssetUrl';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface ResumePanelProps {
  data: PortfolioData;
  onChange: (updater: (prev: PortfolioData) => PortfolioData) => void;
}

export function ResumePanel({ data, onChange }: ResumePanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const resolvedResumeUrl = useResolvedAssetUrl(data.resume.fileUrl);

  const handleUploadPdf = async (e: ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadWarning(null);
    setUploadSuccess(null);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      inputEl.value = '';
      setUploadError('Please select a valid PDF file (.pdf).');
      return;
    }

    setIsUploading(true);
    try {
      const { url, warning, error } = await uploadAssetToSupabaseStorage(
        file,
        'resume'
      );
      if (error || !url) {
        setUploadError(error ?? 'Failed to upload resume PDF to Supabase Storage.');
        return;
      }

      onChange((prev) => ({
        ...prev,
        resume: {
          fileName: file.name,
          fileUrl: url,
          updatedAt: `Uploaded ${new Date().toLocaleDateString()}`,
        },
      }));
      if (warning) setUploadWarning(warning);
      setUploadSuccess(
        'Resume PDF uploaded to Storage. Click "Save Changes" in the header to persist it to Supabase.'
      );
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unexpected upload error.'
      );
    } finally {
      setIsUploading(false);
      inputEl.value = '';
    }
  };

  const handleRestoreInitial = () => {
    setUploadError(null);
    setUploadWarning(null);
    setUploadSuccess(null);
    onChange((prev) => ({
      ...prev,
      resume: { ...INITIAL_PORTFOLIO_DATA.resume },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#101B30] border border-slate-800 p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-white">Resume Management</h2>
          <p className="mt-1 text-sm text-slate-400">
            Upload or replace the portfolio resume PDF in Supabase Storage, preview it
            below, or restore the supplied resume asset.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleUploadPdf}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#078BFF] hover:bg-[#078BFF]/90 disabled:opacity-60 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>
              {isUploading
                ? 'Uploading PDF...'
                : data.resume.fileUrl
                  ? 'Replace Resume PDF'
                  : 'Upload Resume PDF'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleRestoreInitial}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-200 bg-[#080D1A] hover:border-[#00D9FF] border border-slate-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Supplied Resume</span>
          </button>

          {data.resume.fileUrl && (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove PDF</span>
            </button>
          )}
        </div>

        {uploadError && (
          <p className="text-xs text-rose-400" role="alert">
            {uploadError}
          </p>
        )}

        {uploadWarning && (
          <p className="text-xs text-amber-300" role="status">
            {uploadWarning}
          </p>
        )}

        {uploadSuccess && (
          <p className="text-xs text-emerald-400" role="status">
            {uploadSuccess}
          </p>
        )}

        <div className="p-4 rounded-xl bg-[#080D1A] border border-slate-800 flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-[#00D9FF] shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-white truncate">
                {data.resume.fileUrl ? data.resume.fileName : 'No resume PDF attached'}
              </p>
              <p className="text-xs text-slate-400">{data.resume.updatedAt}</p>
            </div>
          </div>
        </div>
      </div>

      {resolvedResumeUrl && (
        <div className="rounded-2xl bg-[#101B30] border border-slate-800 overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-800 text-xs font-mono text-slate-400">
            Embedded PDF Preview
          </div>
          <iframe
            key={resolvedResumeUrl}
            title="Admin Resume PDF Preview"
            src={resolvedResumeUrl}
            className="w-full h-[520px] bg-white"
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove}
        title="Remove Resume PDF?"
        description="Download and preview buttons on the public portfolio will be disabled gracefully until a new PDF is uploaded."
        confirmLabel="Remove Resume"
        destructive
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setUploadError(null);
          setUploadWarning(null);
          setUploadSuccess(null);
          onChange((prev) => ({
            ...prev,
            resume: { fileName: '', fileUrl: null, updatedAt: 'No file attached' },
          }));
          setConfirmRemove(false);
        }}
      />
    </div>
  );
}
