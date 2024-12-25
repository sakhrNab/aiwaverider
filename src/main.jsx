import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import '../src/styles/globals.css';
import App from './App.jsx'
// Add this at the top of your entry file (e.g., index.js or App.js)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
