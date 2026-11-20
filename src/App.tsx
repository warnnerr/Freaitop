import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { Layout } from './components/Layout';
import { wagmiConfig } from './config/wagmi';
import { CreateWarrantyPage } from './pages/CreateWarrantyPage';
import { HomePage } from './pages/HomePage';
import { MyWarrantiesPage } from './pages/MyWarrantiesPage';
import { VerifierDeskPage } from './pages/VerifierDeskPage';
import { WarrantyDetailPage } from './pages/WarrantyDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const freaitopTheme = lightTheme({
  accentColor: '#1C2B3B',
  accentColorForeground: '#FFFFFF',
  borderRadius: 'medium',
  fontStack: 'system',
});

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={freaitopTheme} modalSize="compact">
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/create" element={<CreateWarrantyPage />} />
                <Route path="/warranties" element={<MyWarrantiesPage />} />
                <Route path="/warranties/:id" element={<WarrantyDetailPage />} />
                <Route path="/verifier" element={<VerifierDeskPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
