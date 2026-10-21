import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/fonts.css';
import './styles/effects.css';
import './styles/index.css';

// أيقونات Material Symbols مخفية حتى يجهز خطها، فلا تظهر أسماؤها (shopping_bag، search…) كنص أثناء التحميل.
const root = document.documentElement;
if (document.fonts?.load) {
  document.fonts
    .load('24px "Material Symbols Outlined"', 'home')
    .then((faces) => faces.length > 0 && root.classList.add('icons-ready'))
    .catch(() => undefined);
} else {
  root.classList.add('icons-ready');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
