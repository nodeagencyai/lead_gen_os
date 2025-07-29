import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { assertValidEnvironment, logEnvironmentStatus } from './utils/envValidator';

// 🚨 SECURITY: Validate environment variables before app starts
try {
  assertValidEnvironment();
  logEnvironmentStatus();
} catch (error) {
  console.error(error);
  // Show user-friendly error instead of broken app
  document.body.innerHTML = `
    <div style="
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #1a1a1a;
      color: #fff;
      border-radius: 8px;
      border: 1px solid #ef4444;
    ">
      <h1 style="color: #ef4444; margin-top: 0;">🚨 Configuration Error</h1>
      <pre style="
        background: #0f0f0f;
        padding: 15px;
        border-radius: 4px;
        overflow-x: auto;
        white-space: pre-wrap;
        font-size: 14px;
        line-height: 1.5;
      ">${error instanceof Error ? error.message : 'Unknown configuration error'}</pre>
    </div>
  `;
  throw error;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
