import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { ConvexProvider } from 'convex/react';
import { convex } from './lib/convexClient.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ConvexProvider>
  </StrictMode>,
);

