import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PawPrint, Mic, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MeowDetectorProps {
  catProfile?: any;
}

const MeowDetector: React.FC<MeowDetectorProps> = ({ catProfile }) => {
  const [isListening, setIsListening] = useState(false);
  const [meowResult, setMeowResult] = useState<string | null>(null);
  const [meowType, setMeowType] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [animateWave, setAnimateWave] = useState(false);
  const { toast } = useToast();
  
  const meowTypes = [
    { type: "Hungry", translation: "I'm hungry! Feed me now, please!", probability: 0.8 },
    { type: "Attention", translation: "Pet me! I need attention!", probability: 0.7 },
    { type: "Greeting", translation: "Hello human, nice to see you!", probability: 0.9 },
    { type: "Annoyed", translation: "I'm irritated! Leave me alone.", probability: 0.6 },
    { type: "Playful", translation: "Let's play! I'm feeling energetic!", probability: 0.85 },
  ];
  
  const startListening = () => {
    // In a real app, this would access the microphone
    setIsListening(true);
    setAnimateWave(true);
    setMeowResult(null);
    setMeowType(null);
    setConfidence(0);
    
    // Show toast notification
    toast({
      title: "Listening for meows",
      description: "Make sure your cat is nearby and meowing.",
    });
    
    // Simulate recording and processing
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setConfidence(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        simulateMeowDetection();
      }
    }, 100);
  };
  
  const stopListening = () => {
    setIsListening(false);
    setAnimateWave(false);
  };
  
  const simulateMeowDetection = () => {
    // In a real app, this would process actual audio
    // For demo, we'll randomly select a meow type
    const randomIndex = Math.floor(Math.random() * meowTypes.length);
    const detectedMeow = meowTypes[randomIndex];
    
    setMeowType(detectedMeow.type);
    setMeowResult(detectedMeow.translation);
    setConfidence(Math.floor(detectedMeow.probability * 100));
    setIsListening(false);
    
    // Keep the wave animation for a bit longer
    setTimeout(() => {
      setAnimateWave(false);
    }, 1000);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div 
                className={`w-20 h-20 rounded-full bg-meow-pink flex items-center justify-center transition-all duration-300 ${isListening ? 'scale-110' : ''}`}
              >
                {isListening ? (
                  <Mic size={32} className="text-white animate-pulse" />
                ) : (
                  <PawPrint size={32} className="text-white" />
                )}
              </div>
              
              {/* Sound waves animation */}
              {animateWave && (
                [...Array(3)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute inset-0 rounded-full border border-meow-pink/70 animate-ping"
                    style={{ 
                      animationDuration: `${1.5 + i * 0.5}s`,
                      animationDelay: `${i * 0.2}s`
                    }}
                  />
                ))
              )}
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Meow Detector</h2>
            <p className="text-gray-500 text-sm mt-1">
              {catProfile ? 
                `Ready to translate ${catProfile.age} ${catProfile.breed} meows` : 
                "Ready to translate cat language"}
            </p>
          </div>
          
          {isListening ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Listening...</span>
                <span className="text-sm font-medium">{confidence}%</span>
              </div>
              <Progress value={confidence} className="h-2" />
              
              <Button 
                onClick={stopListening}
                variant="outline" 
                className="w-full mt-4 border-meow-pink text-meow-pink hover:bg-meow-pink/10"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div>
              {meowResult ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-meow-peach/20 rounded-lg p-4 border border-meow-peach">
                    <div className="flex items-center mb-2">
                      <Volume2 size={16} className="text-meow-navy mr-2" />
                      <span className="font-medium text-meow-navy">{meowType} Meow</span>
                      <span className="ml-auto text-xs bg-meow-navy/10 px-2 py-0.5 rounded-full">
                        {confidence}% match
                      </span>
                    </div>
                    <p className="text-lg">{meowResult}</p>
                  </div>
                  
                  <Button 
                    onClick={startListening} 
                    className="w-full bg-meow-pink hover:bg-meow-pink/90 text-white"
                  >
                    Detect Another Meow
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={startListening} 
                  className="w-full bg-meow-pink hover:bg-meow-pink/90 text-white"
                >
                  <Mic size={16} className="mr-2" />
                  Start Listening
                </Button>
              )}
            </div>
          )}
          
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Position your device near your cat while they are vocalizing</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeowDetector;
