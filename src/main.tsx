import React from 'react';
import { createRoot } from 'react-dom/client';
import { MagnetismLab } from './components/magnetism/MagnetismLab';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><MagnetismLab /></React.StrictMode>);
