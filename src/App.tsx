import { useEffect, useRef, useState } from 'react';
import { AdminDashboardPage } from './admin/AdminDashboardPage';
import { AdminLoginPage } from './admin/AdminLoginPage';
import { usePortfolioStore } from './hooks/usePortfolioStore';
import { useRouter } from './hooks/useRouter';
import { PortfolioPage } from './pages/PortfolioPage';
import { isAuthorizedAdminSession } from './services/portfolioService';

export default function App() {
  const { route, navigate } = useRouter();
  const store = usePortfolioStore();
  const [adminPreviewMode, setAdminPreviewMode] = useState(false);
  const hasMountedRef = useRef(false);

  const isAuthenticatedAdmin = isAuthorizedAdminSession(store.adminSession);
  const { refreshPortfolio } = store;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (route === '/' && !adminPreviewMode) {
      void refreshPortfolio();
    }
  }, [route, adminPreviewMode, refreshPortfolio]);

  useEffect(() => {
    if (store.authLoading) return;
    if (route === '/admin/dashboard' && !isAuthenticatedAdmin) {
      navigate('/admin/login', true);
    } else if (route === '/admin/login' && isAuthenticatedAdmin) {
      navigate('/admin/dashboard', true);
    }
  }, [store.authLoading, route, isAuthenticatedAdmin, navigate]);

  const handleSignIn = async (email: string, password: string) => {
    const res = await store.signInAdmin(email, password);
    if (res.session) {
      navigate('/admin/dashboard', true);
      return { ok: true };
    }
    return { ok: false, error: res.error };
  };

  const handleLogout = async () => {
    setAdminPreviewMode(false);
    await store.signOut();
    navigate('/admin/login', true);
  };

  if (route === '/admin/login' || route === '/admin/dashboard') {
    if (store.authLoading) {
      return (
        <div className="min-h-screen bg-[#080D1A] text-slate-300 flex items-center justify-center px-4">
          <div className="text-sm font-mono">Checking Supabase session...</div>
        </div>
      );
    }

    if (isAuthenticatedAdmin && store.adminSession) {
      return (
        <AdminDashboardPage
          adminEmail={store.adminSession.user.email ?? ''}
          draftData={store.draftData}
          hasUnsavedChanges={store.hasUnsavedChanges}
          isSaving={store.isSaving}
          saveError={store.saveError}
          saveSuccessMessage={store.saveSuccessMessage}
          messages={store.messages}
          messagesLoading={store.messagesLoading}
          messagesError={store.messagesError}
          onRefreshMessages={store.refreshMessages}
          onChangeDraft={store.updateDraft}
          onSaveChanges={store.saveDraft}
          onCancelChanges={store.cancelDraft}
          onResetAll={store.resetAllData}
          onToggleMessageRead={store.toggleMessageRead}
          onDeleteMessage={store.deleteMessage}
          onPreviewChanges={() => {
            setAdminPreviewMode(true);
            navigate('/');
          }}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <AdminLoginPage
        onSignIn={handleSignIn}
        onBackToPortfolio={() => {
          setAdminPreviewMode(false);
          navigate('/');
        }}
      />
    );
  }

  const displayedData =
    adminPreviewMode && isAuthenticatedAdmin ? store.draftData : store.savedData;

  return (
    <PortfolioPage
      data={displayedData}
      onSubmitMessage={store.submitContactMessage}
      previewNotice={Boolean(adminPreviewMode && isAuthenticatedAdmin)}
      onReturnToAdmin={() => {
        setAdminPreviewMode(false);
        navigate('/admin/dashboard');
      }}
      onNavigateAdmin={() => {
        navigate(isAuthenticatedAdmin ? '/admin/dashboard' : '/admin/login');
      }}
    />
  );
}
