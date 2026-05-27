import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'
import 'flyonui/flyonui'


// Global error listener to display runtime crashes on the page
window.onerror = function(message, source, lineno, colno, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100vw';
  errorDiv.style.height = '100vh';
  errorDiv.style.backgroundColor = '#1e1e2e';
  errorDiv.style.color = '#f38ba8';
  errorDiv.style.padding = '30px';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.style.fontSize = '16px';
  errorDiv.style.zIndex = '999999';
  errorDiv.style.overflow = 'auto';
  errorDiv.innerHTML = `
    <h1 style="color: #f38ba8; margin-top: 0;">🚨 Client Runtime Error:</h1>
    <p><strong>Message:</strong> ${message}</p>
    <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
    <pre style="background: #313244; padding: 15px; border-radius: 8px; color: #cdd6f4; margin-top: 15px;">${error ? error.stack : 'No stack trace available'}</pre>
  `;
  document.body.appendChild(errorDiv);
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100vw';
  errorDiv.style.height = '100vh';
  errorDiv.style.backgroundColor = '#1e1e2e';
  errorDiv.style.color = '#f9e2af';
  errorDiv.style.padding = '30px';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.style.fontSize = '16px';
  errorDiv.style.zIndex = '999999';
  errorDiv.style.overflow = 'auto';
  errorDiv.innerHTML = `
    <h1 style="color: #f9e2af; margin-top: 0;">⚠️ Unhandled Promise Rejection:</h1>
    <p><strong>Reason:</strong> ${event.reason}</p>
    <pre style="background: #313244; padding: 15px; border-radius: 8px; color: #cdd6f4; margin-top: 15px;">${event.reason && event.reason.stack ? event.reason.stack : 'No stack trace available'}</pre>
  `;
  document.body.appendChild(errorDiv);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster position="top-right" />
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

