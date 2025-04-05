
import React from 'react';
import AppTitle from '../components/AppTitle';

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <AppTitle />
        <div className="mt-8 text-center">
          <h1 className="text-2xl font-bold">Welcome to the App</h1>
        </div>
      </div>
    </div>
  );
};

export default Index;
