import { useRef, useState, type ChangeEvent } from 'react';
import { RotateCcw, Trash2, Upload, User } from 'lucide-react';
import { INITIAL_PORTFOLIO_DATA } from '../../data/initialPortfolio';
import { uploadAssetToSupabaseStorage } from '../../services/portfolioService';
import type { PortfolioData } from '../../types/portfolio';
import { isValidImageFile } from '../../utils/storage';
import { FallbackImage } from '../../components/FallbackImage';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface PhotoPanelProps {
  data: PortfolioData;
  onChange: (updater: (prev: PortfolioData) => PortfolioData) => void;
}

export function PhotoPanel({ data, onChange }: PhotoPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadWarning(null);
    setUploadSuccess(null);

    if (!isValidImageFile(file)) {
      inputEl.value = '';
      setUploadError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setIsUploading(true);
    try {
      const { url, warning, error } = await uploadAssetToSupabaseStorage(
        file,
        'profile'
      );
      if (error || !url) {
        setUploadError(error ?? 'Failed to upload image to Supabase Storage.');
        return;
      }

      onChange((prev) => ({
        ...prev,
        profile: { ...prev.profile, photoUrl: url },
      }));
      if (warning) setUploadWarning(warning);
      setUploadSuccess(
        'Photo uploaded to Storage. Click "Save Changes" in the header to persist it to Supabase.'
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

  const handleRestoreOriginal = () => {
    setUploadError(null);
    setUploadWarning(null);
    setUploadSuccess(null);
    onChange((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        photoUrl: INITIAL_PORTFOLIO_DATA.profile.photoUrl,
      },
    }));
  };

  return (
    <div className="rounded-2xl bg-[#101B30] border border-slate-800 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Profile Photo Management</h2>
        <p className="mt-1 text-sm text-slate-400">
          Preview, upload a replacement photograph to Supabase Storage, restore the
          supplied portrait, or remove the photo.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="w-40 h-40 rounded-full overflow-hidden bg-[#080D1A] border border-slate-700 shrink-0">
          <FallbackImage
            key={data.profile.photoUrl ?? 'admin-no-photo'}
            src={data.profile.photoUrl}
            alt="Profile photo preview"
            className="w-full h-full object-cover object-top"
            fallbackTitle="No Photo"
            fallbackIcon={<User className="w-10 h-10" />}
          />
        </div>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
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
                  ? 'Uploading to Storage...'
                  : data.profile.photoUrl
                    ? 'Replace Photo'
                    : 'Upload Photo'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleRestoreOriginal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-200 bg-[#080D1A] hover:border-[#00D9FF] border border-slate-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore Supplied Photo</span>
            </button>

            {data.profile.photoUrl && (
              <button
                type="button"
                onClick={() => setConfirmRemoveOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Uploaded images are stored in the Supabase Storage{' '}
            <span className="font-mono">portfolio-assets</span> bucket. Remember to click
            &ldquo;Save Changes&rdquo; to update the database record.
          </p>

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
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemoveOpen}
        title="Remove Profile Photo?"
        description="The Hero and About sections will show a clean placeholder avatar until you upload or restore a photograph."
        confirmLabel="Remove Photo"
        destructive
        onCancel={() => setConfirmRemoveOpen(false)}
        onConfirm={() => {
          setUploadError(null);
          setUploadWarning(null);
          setUploadSuccess(null);
          onChange((prev) => ({
            ...prev,
            profile: { ...prev.profile, photoUrl: null },
          }));
          setConfirmRemoveOpen(false);
        }}
      />
    </div>
  );
}
