import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // 이 코드가 index.css 파일을 불러옵니다.
import App from './App'; // 메인 앱 컴포넌트를 불러옵니다.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);