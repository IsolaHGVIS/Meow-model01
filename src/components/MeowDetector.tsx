// src/components/MeowDetector.tsx
import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import FFT from 'fft.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CONTEXT_MAP: Record<number, string> = {
  0: "I'm hungry! Feed me now, please!",
  1: "I'm alone. Where are you?",
  2: 'Pet me! I need attention!'
};

const CLASS_NAMES = [
  "Hungry",
  "Isolation",
  "Attention"
];

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
    // Progress animation
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          recorder.stop();
          clearInterval(interval);
          return 100;
        }
        return p + 5;
      });
    }, 150);
  };

  // ── Main feature extraction and prediction function ───────────────
  async function classifyAudioBuffer(buffer: AudioBuffer) {
    const rawSignal = buffer.getChannelData(0);
    const bufferSize = 2048;   // Must be power of two
    const frames     = 174;
    const hopSize    = Math.floor((rawSignal.length - bufferSize) / (frames - 1));
    const melBands   = 128;

    // Preparing FFT
    const fft = new FFT(bufferSize);
    const complex = fft.createComplexArray();  // Length = 2*bufferSize

    // Frame-by-frame extraction
    const melSpecFrames: number[][] = [];
    for (let i = 0; i < frames; i++) {
      const start = i * hopSize;
      // Filling FFT input
      const signalFrame = new Array(bufferSize).fill(0);
      for (let j = 0; j < bufferSize; j++) {
        signalFrame[j] = rawSignal[start + j] || 0;
      }
      // Transforming and padding spectrum
      fft.realTransform(complex, signalFrame);
      fft.completeSpectrum(complex);

      // Calculating magnitudes
      const half = bufferSize / 2;
      const mags = new Array(half + 1);
      for (let k = 0; k <= half; k++) {
        const re = complex[2 * k];
        const im = complex[2 * k + 1];
        mags[k] = Math.sqrt(re * re + im * im);
      }
      // just 128 mel bands
      melSpecFrames.push(mags.slice(0, melBands));
    }

    // Transpose: [frames][bands] → [bands][frames]
    const melSpec: number[][] = Array.from(
      { length: melBands },
      (_, m) => melSpecFrames.map(frame => frame[m])
    );

    // Creating tensor and predicting
    const flat = melSpec.flat();
    const input = tf.tensor4d(flat, [1, melBands, frames, 1]);
    const logits = model!.predict(input) as tf.Tensor;
    const probs  = await logits.data();
    const idx    = logits.argMax(-1).dataSync()[0];
    input.dispose();
    logits.dispose();

    // Updating UI
    setConfidence(Math.round(probs[idx] * 100));
    setResultClass(CLASS_NAMES[idx]);
    setResultText(CONTEXT_MAP[idx]);
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
                <span className="ml-auto px-2 text-sm bg-gray-100 rounded-full">
                  {confidence}% match
                </span>
              </div>
              <p>{resultText}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
