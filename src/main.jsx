import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/hud.css';
import './styles/fx.css';

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
