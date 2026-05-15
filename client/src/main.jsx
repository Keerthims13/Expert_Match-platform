import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App.jsx'
import AdminApp from './app/AdminApp.jsx'
import './styles/global.css'
import './styles/feedback-prominent.css'
import './styles/admin.css'

// Check if the current path is an admin path
const isAdminPath = window.location.pathname.startsWith('/admin');
const AppComponent = isAdminPath ? AdminApp : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppComponent />
  </React.StrictMode>
);
