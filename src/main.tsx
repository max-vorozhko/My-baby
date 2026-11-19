import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App'
import { db } from './db'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// iOS: після повернення з фону перший запит до IndexedDB іноді «зависає» до наступної дії.
// Будимо базу одразу, щоб перший тап користувача не чекав.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void db.settings.get('session').catch(() => {})
})
