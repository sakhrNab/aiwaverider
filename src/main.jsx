import './fontAwesome'; // Add this line
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import '../src/styles/globals.css';
import App from './App.jsx'

// Import temp populate script in development mode
if (import.meta.env.DEV) {
  import('./utils/tempPopulateAITools')
    .then(() => console.log('Temp AI tools population script loaded'))
    .catch(err => console.error('Failed to load temp populate script:', err));
}

// Firebase setup script has been removed

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
