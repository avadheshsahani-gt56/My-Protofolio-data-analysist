import {
  Award,
  CheckCircle2,
  FolderKanban,
  GraduationCap,
  Layers,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { AdminSectionId, ContactMessage, PortfolioData } from '../../types/portfolio';

interface OverviewPanelProps {
  data: PortfolioData;
  messages: ContactMessage[];
  hasUnsavedChanges: boolean;
  onNavigateSection: (section: AdminSectionId) => void;
  onEditWebsite: () => void;
}

export function OverviewPanel({
  data,
  messages,
  hasUnsavedChanges,
  onNavigateSection,
  onEditWebsite,
}: OverviewPanelProps) {
  const unreadCount = messages.filter((m) => !m.read).length;
  const visibleProjects = data.projects.filter((p) => p.visible).length;

  const stats = [
    {
      label: 'Skills Listed',
      value: data.skills.length,
      icon: <Layers className="w-5 h-5 text-[#00D9FF]" />,
      target: 'skills' as AdminSectionId,
    },
    {
      label: 'Projects (Visible)',
      value: `${visibleProjects} / ${data.projects.length}`,
      icon: <FolderKanban className="w-5 h-5 text-[#00D9FF]" />,
      target: 'projects' as AdminSectionId,
    },
    {
      label: 'Certificates',
      value: data.certificates.length,
      icon: <Award className="w-5 h-5 text-[#00D9FF]" />,
      target: 'certificates' as AdminSectionId,
    },
    {
      label: 'Education Entries',
      value: data.education.length,
      icon: <GraduationCap className="w-5 h-5 text-[#00D9FF]" />,
      target: 'education' as AdminSectionId,
    },
    {
      label: 'Unread Contact Messages',
      value: `${unreadCount} / ${messages.length}`,
      icon: <Mail className="w-5 h-5 text-[#00D9FF]" />,
      target: 'messages' as AdminSectionId,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#101B30] border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Dashboard Overview</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage Avadhesh Sahani&apos;s portfolio sections, Power BI screenshots,
            certificates, resume PDF, and visitor contact messages in Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={onEditWebsite}
          className="px-4 py-2.5 text-sm font-semibold text-white bg-[#078BFF] hover:bg-[#078BFF]/90 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Edit Website
        </button>
      </div>

      {isSupabaseConfigured ? (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-200/90 leading-relaxed">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-300">
              Supabase Backend Connected
            </p>
            <p className="mt-1">
              Authenticated via Supabase Auth. Portfolio changes save to{' '}
              <span className="font-mono">portfolio_content</span>, visitor inquiries
              load from <span className="font-mono">contact_messages</span>, and uploaded
              files store in the <span className="font-mono">portfolio-assets</span>{' '}
              Storage bucket.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-300">
              Supabase Publishable Key Not Configured
            </p>
            <p className="mt-1">
              Add <span className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</span> to
              enable live database saves and storage uploads.
            </p>
          </div>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="p-4 rounded-xl bg-[#078BFF]/10 border border-[#078BFF]/40 text-sm text-slate-200">
          You have unsaved draft modifications. Click &ldquo;Save Changes&rdquo; in the
          top bar to persist them to Supabase or &ldquo;Cancel&rdquo; to revert.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigateSection(item.target)}
            className="text-left p-5 rounded-xl bg-[#101B30] border border-slate-800 hover:border-[#078BFF]/60 transition-colors space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{item.label}</span>
              {item.icon}
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">
              {item.value}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
