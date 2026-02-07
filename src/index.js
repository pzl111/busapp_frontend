import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Listen for messages from React Native
window.addEventListener('message', (event) => {
  if (event.data === 'android-back-button') {
    const btn = document.querySelector('.back-button');
    if (btn) {
      alert('Back button pressed');
      btn.click();
    } else {
      alert('No back-button found');
    }
  }
});

