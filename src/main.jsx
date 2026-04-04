import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LanguageProvider } from './i18n/LanguageContext'
import { AuthProvider } from './hooks/useAuth'
import { PoolProvider } from './hooks/usePools'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <PoolProvider>
          <App />
        </PoolProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
)
