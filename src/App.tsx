
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import './App.css';
import Index from './pages/Index';
import MonitoringPage from './pages/Monitoring';
import { initializeErrorTrackingSystem } from './utils/errorTracking';

// Initialize error tracking system
initializeErrorTrackingSystem();

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
