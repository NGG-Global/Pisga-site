import '@fontsource-variable/heebo/wght.css';
import './theme/tokens.css';
import './styles/app.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';
import { NOT_CONFIGURED } from './lib/env';
import { NotConfigured } from './screens/NotConfigured';
import { applyBrand } from './theme/brand';

applyBrand();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: true } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {NOT_CONFIGURED ? (
      <NotConfigured />
    ) : (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    )}
  </StrictMode>,
);
