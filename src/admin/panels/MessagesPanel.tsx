import { useState } from 'react';
import { Check, Mail, MailOpen, RefreshCw, Trash2 } from 'lucide-react';
import type { ContactMessage } from '../../types/portfolio';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface MessagesPanelProps {
  messages: ContactMessage[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MessagesPanel({
  messages,
  loading,
  error,
  onRefresh,
  onToggleRead,
  onDelete,
}: MessagesPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered =
    filter === 'unread' ? messages.filter((m) => !m.read) : messages;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#101B30] border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Contact Messages</h2>
          <p className="mt-1 text-sm text-slate-400">
            Visitor inquiries stored in the Supabase{' '}
            <span className="font-mono">contact_messages</span> table.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-[#080D1A] hover:border-[#00D9FF] border border-slate-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <div className="inline-flex items-center gap-1 p-1 bg-[#080D1A] border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-[#078BFF] text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              All ({messages.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'unread'
                  ? 'bg-[#078BFF] text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Unread ({messages.filter((m) => !m.read).length})
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300"
        >
          {error}
        </div>
      )}

      {loading && messages.length === 0 ? (
        <div className="rounded-2xl bg-[#101B30] border border-slate-800 p-8 space-y-3">
          <div className="h-4 w-48 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-full bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-slate-800 rounded animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#101B30] border border-slate-800 p-10 text-center space-y-2">
          <Mail className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-medium text-slate-200">
            {filter === 'unread'
              ? 'No unread messages.'
              : 'No contact messages recorded yet.'}
          </p>
          <p className="text-xs text-slate-400">
            Messages submitted via the public Contact form appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-2xl bg-[#101B30] border p-5 space-y-3 ${
                msg.read ? 'border-slate-800/80' : 'border-[#078BFF]/60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`font-mono ${
                        msg.read ? 'text-slate-400' : 'text-[#00D9FF]'
                      }`}
                    >
                      {msg.read ? 'Read' : 'Unread'}
                    </span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-400 font-mono">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {msg.subject}
                  </h3>
                  <p className="text-xs text-slate-300">
                    From <span className="font-medium text-white">{msg.fullName}</span>{' '}
                    ({msg.email})
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleRead(msg.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#080D1A] hover:border-[#00D9FF] border border-slate-700 rounded-lg transition-colors"
                  >
                    {msg.read ? (
                      <>
                        <MailOpen className="w-3.5 h-3.5" />
                        <span>Mark Unread</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#00D9FF]" />
                        <span>Mark as Read</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(msg)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pt-2 border-t border-slate-800/80">
                {msg.message}
              </p>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Message?"
        description={`Permanently delete the message from "${deleteTarget?.fullName}" from Supabase?`}
        confirmLabel="Delete Message"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
