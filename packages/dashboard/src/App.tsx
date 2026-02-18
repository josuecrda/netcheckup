import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './components/layout/MainLayout';
import OverviewPage from './pages/OverviewPage';
import DevicesPage from './pages/DevicesPage';
import SpeedTestPage from './pages/SpeedTestPage';
import AlertsPage from './pages/AlertsPage';
import ToolsPage from './pages/ToolsPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/speed-test" element={<SpeedTestPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
