
import { BrowserRouter as Router, Routes, Route } from "react-navigation-native";
import { Toaster } from "@/components/ui/toaster";
import Index from "./src/pages/Index";
import NotFound from "./src/pages/NotFound";
import { useEffect } from 'react';
import './src/App.css';
import { useMobileOptimizations } from './src/hooks/useMobileOptimizations';
import ResponsiveContainer from './src/components/ResponsiveContainer';

const App = () => {
  // Apply mobile optimizations
  const { isMobile, isLowPowerMode } = useMobileOptimizations({
    reducedMotion: true,
    optimizeRendering: true,
    reducedImageQuality: true,
    batteryAwareness: true
  });

  useEffect(() => {
    // App initialization code
    if (isLowPowerMode) {
      console.log('Running in low power mode');
    }
  }, [isLowPowerMode]);

  return (
    <Router>
      <ResponsiveContainer className="app-container" optimizeForMedicalData={true}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </ResponsiveContainer>
    </Router>
  );
};

export default App;
