import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import AdminPortal from './components/admin/AdminPortal';

const isAdmin = window.location.pathname.startsWith('/admin');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminPortal /> : <App />}
  </React.StrictMode>
);
