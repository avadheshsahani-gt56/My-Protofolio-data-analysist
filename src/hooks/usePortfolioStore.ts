import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { INITIAL_PORTFOLIO_DATA } from '../data/initialPortfolio';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  deleteContactMessageFromSupabase,
  fetchContactMessagesFromSupabase,
  fetchPortfolioContent,
  isAuthorizedAdminSession,
  type PortfolioRowMeta,
  savePortfolioContent,
  signInAdminWithPassword,
  signOutAdmin,
  submitContactMessageToSupabase,
  updateContactMessageReadInSupabase,
} from '../services/portfolioService';
import type { ContactMessage, PortfolioData } from '../types/portfolio';

export function usePortfolioStore() {
  const [savedData, setSavedData] = useState<PortfolioData>(() =>
    structuredClone(INITIAL_PORTFOLIO_DATA)
  );
  const [draftData, setDraftData] = useState<PortfolioData>(() =>
    structuredClone(INITIAL_PORTFOLIO_DATA)
  );
  const [rowMeta, setRowMeta] = useState<PortfolioRowMeta>({
    rowId: null,
    payloadColumn: 'content',
    hasExistingRow: false,
  });
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [portfolioLoadError, setPortfolioLoadError] = useState<string | null>(null);

  const [adminSession, setAdminSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const savedDataRef = useRef(savedData);
  const draftDataRef = useRef(draftData);
  const rowMetaRef = useRef(rowMeta);

  savedDataRef.current = savedData;
  draftDataRef.current = draftData;
  rowMetaRef.current = rowMeta;

  const refreshPortfolio = useCallback(async () => {
    const res = await fetchPortfolioContent();
    if (res.error && rowMetaRef.current.hasExistingRow) {
      return;
    }

    const hadUnsavedEdits =
      JSON.stringify(savedDataRef.current) !== JSON.stringify(draftDataRef.current);

    savedDataRef.current = res.data;
    rowMetaRef.current = res.meta;
    setSavedData(res.data);
    setRowMeta(res.meta);
    setPortfolioLoadError(res.error ?? null);

    if (!hadUnsavedEdits) {
      const clonedDraft = structuredClone(res.data);
      draftDataRef.current = clonedDraft;
      setDraftData(clonedDraft);
    }
  }, []);

  // Load initial portfolio content from Supabase (never overwrites existing DB data)
  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoadingPortfolio(true);
      const res = await fetchPortfolioContent();
      if (!active) return;
      savedDataRef.current = res.data;
      const clonedDraft = structuredClone(res.data);
      draftDataRef.current = clonedDraft;
      rowMetaRef.current = res.meta;
      setSavedData(res.data);
      setDraftData(clonedDraft);
      setRowMeta(res.meta);
      setPortfolioLoadError(res.error ?? null);
      setIsLoadingPortfolio(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Refresh public portfolio data when tab regains visibility (without overwriting unsaved admin drafts)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshPortfolio();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshPortfolio]);

  // Listen to persistent Supabase Auth session
  useEffect(() => {
    const client = supabase;
    if (!client || !isSupabaseConfigured) {
      setAdminSession(null);
      setAuthLoading(false);
      return;
    }

    let active = true;
    client.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const session = data.session;
      if (session && !isAuthorizedAdminSession(session)) {
        await client.auth.signOut();
        if (active) setAdminSession(null);
      } else {
        setAdminSession(session);
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (session && !isAuthorizedAdminSession(session)) {
        await client.auth.signOut();
        setAdminSession(null);
      } else {
        setAdminSession(session);
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!adminSession || !isAuthorizedAdminSession(adminSession)) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    setMessagesError(null);
    const res = await fetchContactMessagesFromSupabase();
    setMessages(res.messages);
    setMessagesError(res.error ?? null);
    setMessagesLoading(false);
  }, [adminSession]);

  // Load contact messages when authenticated as authorized admin
  useEffect(() => {
    if (adminSession && isAuthorizedAdminSession(adminSession)) {
      refreshMessages();
    } else {
      setMessages([]);
    }
  }, [adminSession, refreshMessages]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(savedData) !== JSON.stringify(draftData),
    [savedData, draftData]
  );

  // If initial public load failed or missed a protected row, refresh once admin signs in
  useEffect(() => {
    if (
      !adminSession ||
      !isAuthorizedAdminSession(adminSession) ||
      isLoadingPortfolio ||
      hasUnsavedChanges
    ) {
      return;
    }
    if (!portfolioLoadError && rowMetaRef.current.hasExistingRow) {
      return;
    }

    let active = true;
    (async () => {
      const res = await fetchPortfolioContent();
      if (!active || res.error || !res.meta.hasExistingRow) return;
      if (JSON.stringify(savedDataRef.current) !== JSON.stringify(draftDataRef.current)) {
        return;
      }
      savedDataRef.current = res.data;
      const clonedDraft = structuredClone(res.data);
      draftDataRef.current = clonedDraft;
      rowMetaRef.current = res.meta;
      setSavedData(res.data);
      setDraftData(clonedDraft);
      setRowMeta(res.meta);
      setPortfolioLoadError(null);
    })();

    return () => {
      active = false;
    };
  }, [adminSession, isLoadingPortfolio, portfolioLoadError, hasUnsavedChanges]);

  const updateDraft = useCallback(
    (updater: (prev: PortfolioData) => PortfolioData) => {
      setSaveError(null);
      setSaveSuccessMessage(null);
      setDraftData((prev) => {
        const next = updater(prev);
        draftDataRef.current = next;
        return next;
      });
    },
    []
  );

  const saveDraft = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccessMessage(null);

    const payloadToSave = structuredClone(draftDataRef.current);
    const res = await savePortfolioContent(payloadToSave, rowMetaRef.current);
    setIsSaving(false);

    if (!res.ok) {
      setSaveError(res.error ?? 'Failed to save portfolio changes to Supabase.');
      return false;
    }

    rowMetaRef.current = res.meta;
    savedDataRef.current = payloadToSave;
    setRowMeta(res.meta);
    setSavedData(payloadToSave);
    setSaveSuccessMessage('Changes saved to Supabase database.');
    return true;
  }, []);

  const cancelDraft = useCallback(() => {
    setSaveError(null);
    setSaveSuccessMessage(null);
    const reverted = structuredClone(savedDataRef.current);
    draftDataRef.current = reverted;
    setDraftData(reverted);
  }, []);

  const resetAllData = useCallback(() => {
    setSaveError(null);
    const seeded = structuredClone(INITIAL_PORTFOLIO_DATA);
    draftDataRef.current = seeded;
    setDraftData(seeded);
    setSaveSuccessMessage(
      'Default content loaded into draft. Click "Save Changes" to apply to Supabase.'
    );
  }, []);

  const submitContactMessage = useCallback(
    async (
      input: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>
    ): Promise<{ ok: boolean; error?: string }> => {
      const res = await submitContactMessageToSupabase(input);
      if (res.ok && adminSession && isAuthorizedAdminSession(adminSession)) {
        refreshMessages();
      }
      return res;
    },
    [adminSession, refreshMessages]
  );

  const toggleMessageRead = useCallback(
    async (id: string) => {
      const target = messages.find((m) => m.id === id);
      if (!target) return;
      const nextRead = !target.read;

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read: nextRead } : m))
      );

      const res = await updateContactMessageReadInSupabase(id, nextRead);
      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, read: target.read } : m))
        );
        setMessagesError(res.error ?? 'Failed to update message status.');
      }
    },
    [messages]
  );

  const deleteMessage = useCallback(
    async (id: string) => {
      const previous = messages;
      setMessages((prev) => prev.filter((m) => m.id !== id));

      const res = await deleteContactMessageFromSupabase(id);
      if (!res.ok) {
        setMessages(previous);
        setMessagesError(res.error ?? 'Failed to delete message.');
      }
    },
    [messages]
  );

  const signInAdmin = useCallback(async (email: string, password: string) => {
    const res = await signInAdminWithPassword(email, password);
    if (res.session) {
      setAdminSession(res.session);
    }
    return res;
  }, []);

  const signOut = useCallback(async () => {
    await signOutAdmin();
    setAdminSession(null);
    setMessages([]);
  }, []);

  return {
    savedData,
    draftData,
    isLoadingPortfolio,
    portfolioLoadError,
    hasUnsavedChanges,
    isSaving,
    saveError,
    saveSuccessMessage,
    updateDraft,
    saveDraft,
    cancelDraft,
    resetAllData,
    refreshPortfolio,
    messages,
    messagesLoading,
    messagesError,
    refreshMessages,
    submitContactMessage,
    toggleMessageRead,
    deleteMessage,
    adminSession,
    authLoading,
    signInAdmin,
    signOut,
  };
}
