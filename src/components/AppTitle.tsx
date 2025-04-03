
import React from 'react';
import { Heart } from 'lucide-react';

const AppTitle: React.FC = () => {
  return (
    <div className="text-center mb-4 mt-2">
      <div className="flex items-center justify-center">
        <Heart className="text-red-500 mr-2" size={24} />
        <h1 className="text-2xl font-bold text-white">VitalScan</h1>
      </div>
      <p className="text-xs text-gray-400">Monitoreo no invasivo de signos vitales</p>
    </div>
  );
};

export default AppTitle;
