import './styles/music-and-selects.css';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import './styles/index.css';
import './styles/holocommand.css';
import './styles/welcome.css';
import './styles/cinematics.css';
import './styles/galaxy-menu.css';
import './styles/classic.css';
import './styles/experience.css';
import './styles/spatial.css';
import './styles/command-room.css';
import './styles/clean-play.css';
import './styles/setup-menu.css';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
