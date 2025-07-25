// src/components/MeowDetector.tsx
import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CLASS_NAMES, CONTEXT_MAP, processAudioBuffer } from './AudioUtils';


export default function MeowDetector() {
  const { toast } = useToast();

  // ── model TF-JS ─────────────────────────────────────────
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

  // ── UI State ───────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [resultClass, setResultClass] = useState<string | null>(null);
  const [resultText, setResultText]   = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder>();

  // ── Loading model on mount ────────────────────────
  useEffect(() => {
    tf.loadLayersModel('/model/model.json')
      .then(m => setModel(m))
      .catch(err => setModelError(err.message))
      .finally(() => setLoadingModel(false));
  }, []);

  // ── Starting recording after ~3 seconds ──────────────────────────────────
  const startListening = async () => {
    if (loadingModel) {
      toast({ title: 'Model is still loading…' });
      return;
    }
    if (!model || modelError) {
      toast({ title: 'Model failed to load.', variant: 'destructive' });
      return;
    }

    setIsListening(true);
    setProgress(0);
    setResultText(null);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const arrayBuf = await blob.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);

      await classifyAudioBuffer(audioBuffer);
      setIsListening(false);
      stream.getTracks().forEach(t => t.stop());
    };

    recorder.start();

    // Progress animation for 3 seconds
  const recordingDuration = 3000; // 3 seconds
  const updateInterval = 50; // Update every 50ms
  const progressIncrement = (100 * updateInterval) / recordingDuration;

    // Progress animation
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          recorder.stop();
          clearInterval(interval);
          return 100;
        }
        return p + progressIncrement;
      });
    }, updateInterval);
    
  };

  // ── Main feature extraction and prediction function ───────────────
// First, add the debugText state at the component level with other states
const [debugText, setDebugText] = useState<string | null>(null);

// Simplified classifyAudioBuffer function
async function classifyAudioBuffer(buffer: AudioBuffer) {
  if (!model) return;

  try {
    const result = await processAudioBuffer(buffer, model);
    
    // Update UI states
    setConfidence(result.confidence);
    setResultClass(result.class);
    setResultText(result.text);

    // Get the class index from the result
    const classIndex = CLASS_NAMES.indexOf(result.class);
    
    // Create debug info with probabilities
    const probabilities = result.probabilities || [];
    const debugLines = CLASS_NAMES.map((name, i) => {
      return `Class ${i} (${name}): ${(probabilities[i] * 100).toFixed(1)}%`;
    });

    const audioDuration = (buffer.length / buffer.sampleRate).toFixed(1);
    const debugInfo = [
      `🐱 Cat Sound Analysis:`,
      `Detected Context: ${CONTEXT_MAP[classIndex]}`,
      `Confidence: ${result.confidence}%`,
      `Audio Duration: ${audioDuration} seconds`,
      '',
      `Debug Info:`,
      ...debugLines,
    ].join('\n');

    console.log(debugInfo);
    setDebugText(debugInfo);

  } catch (error) {
    console.error('Classification error:', error);
    toast({
      title: 'Classification failed',
      description: 'Please try recording again',
      variant: 'destructive'
    });
  }
}

  // ── Rendering ────────────────────────────────────────────────
  if (loadingModel) return <div>🔄 Loading model…</div>;
  if (modelError)   return <div>❌ Error loading model: {modelError}</div>;

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <Card>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold">🐱 Meow Translator</h2>
            <p className="text-gray-500">Translate your cat’s meow in real time</p>
          </div>

          {isListening ? (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <Button variant="outline" onClick={() => recorderRef.current?.stop()}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={startListening}>
              <Mic className="mr-2" /> Start Recording
            </Button>
          )}

          {resultText && (
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center">
                <Volume2 className="mr-2" />
                <span className="font-medium">{resultClass}</span>
                <span className="ml-auto px-2 text-sm bg-gray-100 rounded-full text-black">
                  {confidence}% match
                </span>
              </div>
              <p>{resultText}</p>
            </div>
          )}

          {/* Add debug info display here */}
          {debugText && (
            <div className="p-4 border rounded-lg space-y-2 bg-gray-800"> {/* Same style as result card */}
              <div className="flex items-center">
                 <span className="font-medium text-white">Debug Information</span>
              </div>
             <pre className="text-sm text-white whitespace-pre-wrap font-mono">
             {debugText}
            </pre>
           </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
