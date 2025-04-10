import './fontAwesome'; // Add this line
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import '../src/styles/globals.css';
import App from './App.jsx'

// Firebase setup script has been removed

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
