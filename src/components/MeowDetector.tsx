import React, { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PawPrint, Mic, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MeowDetectorProps {
  catProfile?: any;
}

const MeowDetector: React.FC<MeowDetectorProps> = ({ catProfile }) => {
  // ── MODEL LOADING STATE ───────────────────────────────────────────
  const [model, setModel]       = useState<tf.LayersModel | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError]     = useState<Error | null>(null);

  useEffect(() => {
    tf.loadLayersModel('/model/model.json')
      .then(loaded => {
        console.log('✅ Model loaded:', loaded);
        loaded.summary();                   // prints architecture
        setModel(loaded);
      })
      .catch(err => {
        console.error('❌ Failed to load model:', err);
        setModelError(err);
      })
      .finally(() => {
        setModelLoading(false);
      });
  }, []);

  // ── EXISTING MEOW-DETECTOR STATE ─────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [meowResult, setMeowResult]   = useState<string | null>(null);
  const [meowType, setMeowType]       = useState<string | null>(null);
  const [confidence, setConfidence]   = useState(0);
  const [animateWave, setAnimateWave] = useState(false);
  const { toast } = useToast();
  
  const meowTypes = [
    { type: "Hungry",   translation: "I'm hungry! Feed me now, please!" },
    { type: "Attention",translation: "Pet me! I need attention!" },
    { type: "Greeting", translation: "Hello human, nice to see you!" },
    { type: "Annoyed",  translation: "I'm irritated! Leave me alone." },
    { type: "Playful",  translation: "Let's play! I'm feeling energetic!" },
  ];
  
  const startListening = () => {
    if (modelLoading) {
      return toast({ title: 'Model still loading…', variant: 'default' });
    }
    if (modelError || !model) {
      return toast({ title: 'Model failed to load.', variant: 'destructive' });
    }

    setIsListening(true);
    setAnimateWave(true);
    setMeowResult(null);
    setMeowType(null);
    setConfidence(0);
    
    toast({
      title: "Listening for meows",
      description: "Make sure your cat is nearby and meowing.",
    });
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setConfidence(progress);
      if (progress >= 100) {
        clearInterval(interval);
        processRecordedAudio();
      }
    }, 100);
  };
  
  const stopListening = () => {
    setIsListening(false);
    setAnimateWave(false);
  };

  // ── REPLACE simulateMeowDetection WITH ACTUAL MODEL INFERENCE ────
  const processRecordedAudio = async () => {
    // here you’d extract features from the real audio buffer, then:
    // const inputTensor = tf.tensor4d([...], [1, time, features, 1]);
    // const logits = (model as tf.LayersModel).predict(inputTensor) as tf.Tensor;
    // const probs = await logits.data();
    // const idx  = logits.argMax(-1).dataSync()[0];

    // For now we still simulate:
    const randomIndex = Math.floor(Math.random() * meowTypes.length);
    const detected = meowTypes[randomIndex];

    setMeowType(detected.type);
    setMeowResult(detected.translation);
    setConfidence(Math.floor(Math.random() * 30) + 70); // simulate confidence
    setIsListening(false);
    setTimeout(() => setAnimateWave(false), 500);
  };

  // ── RENDER ───────────────────────────────────────────────────────
  if (modelLoading) {
    return <div>🔄 Loading model…</div>;
  }
  if (modelError) {
    return <div>❌ Error loading model: {modelError.message}</div>;
  }

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
            /* listening UI */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Listening…</span>
                <span>{confidence}%</span>
              </div>
              <Progress value={confidence} className="h-2" />
              <Button onClick={stopListening} variant="outline" className="w-full">
                Cancel
              </Button>
            </div>
          ) : (
            /* result or start button */
            meowResult ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center mb-2">
                    <Volume2 size={16} />
                    <span className="ml-2 font-medium">{meowType}</span>
                    <span className="ml-auto text-xs px-2 rounded-full bg-gray-100">
                      {confidence}% match
                    </span>
                  </div>
                  <p>{meowResult}</p>
                </div>
                <Button onClick={startListening} className="w-full">
                  Detect Another Meow
                </Button>
              </div>
            ) : (
              <Button onClick={startListening} className="w-full">
                <Mic size={16} className="mr-2" /> Start Listening
              </Button>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MeowDetector;
