import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContextNew'
import { ToastProvider } from './components/toast/ToastProvider'

console.log('main.tsx loading...');

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </StrictMode>,
  )
} else {
  console.error('Root element not found!');
}
