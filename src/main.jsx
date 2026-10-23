import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css' // ĐÂY LÀ DÒNG QUAN TRỌNG NHẤT ĐỂ LOAD TAILWIND CSS

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)