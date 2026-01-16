import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'

// --- QUAN TRỌNG: Import Provider ---
import { AppProvider } from './context/AppContext.jsx' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* --- QUAN TRỌNG: Bọc AppProvider ở đây --- */}
      {/* Nó giúp toàn bộ trang web (Home, Login, Profile) dùng chung được dữ liệu */}
      <AppProvider>
        <App />
      </AppProvider>
      
    </BrowserRouter>
  </React.StrictMode>,
)