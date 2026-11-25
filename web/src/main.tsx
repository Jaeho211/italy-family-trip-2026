import React from 'react';
import ReactDOM from 'react-dom/client';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource-variable/fraunces/wght.css';
import '@fontsource-variable/fraunces/wght-italic.css';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Missing React root');
ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
