
import React, { useEffect, useState } from 'react';
import { PawPrint } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [showScreen, setShowScreen] = useState(true);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setShowScreen(false);
            onComplete();
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 100);
    
    return () => clearInterval(timer);
  }, [onComplete]);
  
  if (!showScreen) return null;
  
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center">
        <div className="relative">
          <PawPrint 
            size={80} 
            className="text-meow-pink animate-bounce-in" 
          />
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className={`absolute h-1.5 w-1.5 bg-meow-pink rounded-full animate-pulse-soft`}
              style={{
                top: `${20 + Math.sin(i * 1.5) * 10}px`,
                left: `${40 + Math.cos(i * 1.5) * 20}px`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
        
        <h1 className="text-3xl font-bold mt-6 mb-2 text-meow-navy">MeowMatic</h1>
        <p className="text-gray-500 mb-6">Translating purrfect language...</p>
        
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full meow-gradient rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">{progress}%</p>
      </div>
      
      <div className="absolute bottom-8">
        <div className="flex space-x-3">
          {[...Array(4)].map((_, i) => (
            <PawPrint 
              key={i}
              size={i % 2 === 0 ? 24 : 20}
              className={`text-meow-pink/50 animate-paw-step`}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
