import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './components/layout/MainLayout';
import OverviewPage from './pages/OverviewPage';
import DevicesPage from './pages/DevicesPage';
import SpeedTestPage from './pages/SpeedTestPage';
import AlertsPage from './pages/AlertsPage';
import ToolsPage from './pages/ToolsPage';
import SettingsPage from './pages/SettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import { useSettings } from './hooks/useSettings';
import { ToastProvider } from './components/common/Toast';
import Spinner from './components/common/Spinner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppRoutes() {
  const { data: settings, isLoading } = useSettings();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-dark flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const needsOnboarding = !settings?.onboardingCompleted;

  return (
    <Routes>
      <Route path="/onboarding" element={
        needsOnboarding ? <OnboardingPage /> : <Navigate to="/" replace />
      } />
      <Route element={
        needsOnboarding ? <Navigate to="/onboarding" replace /> : <MainLayout />
      }>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/speed-test" element={<SpeedTestPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
