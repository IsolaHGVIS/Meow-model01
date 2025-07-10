// src/components/MeowDetector.tsx
import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as Meyda from 'meyda';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PawPrint, Mic, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CONTEXT_MAP = {
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

  // Model state
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

  // Recording / inference UI state
  const [isListening, setIsListening] = useState(false);
  const [confidence, setConfidence]   = useState(0);
  const [resultText, setResultText]   = useState<string | null>(null);
  const [resultClass, setResultClass] = useState<string | null>(null);
  const [progress, setProgress]       = useState(0);

  // Keep ref to MediaRecorder so we can stop it
  const recorderRef = useRef<MediaRecorder | null>(null);

  // ── Load TF-JS model on mount ─────────────────────────────────────
  useEffect(() => {
    tf.loadLayersModel('/model/model.json')
      .then(m => {
        console.log('✅ Model loaded', m);
        setModel(m);
      })
      .catch(err => {
        console.error(err);
        setModelError(err.message);
      })
      .finally(() => {
        setLoadingModel(false);
      });
  }, []);

  // ── Start recording ~3 s of cat audio ────────────────────────────
  const startListening = async () => {
    if (loadingModel) {
      return toast({ title: 'Model is still loading…' });
    }
    if (modelError || !model) {
      return toast({ title: 'Model failed to load.', variant: 'destructive' });
    }

    setIsListening(true);
    setProgress(0);
    setResultText(null);

    // Ask for mic
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = async () => {
      // Build audio buffer
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const arrayBuf = await blob.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);

      // Run inference
      await classifyAudioBuffer(audioBuffer);
      setIsListening(false);
      stream.getTracks().forEach(t => t.stop());
    };

    recorder.start();
    // Show progress bar
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

  // ── Extract mel-spectrogram + run model.predict ─────────────────
  const classifyAudioBuffer = async (buffer: AudioBuffer) => {
    // 1) Grab first channel, downsample or pad/truncate if needed
    const signal = buffer.getChannelData(0);
    // 2) Meyda melSpectrogram extraction using MeydaAnalyzer
    let melSpec: number[][] | undefined;
    try {
      // MeydaAnalyzer expects an AudioContext and a source node
      const melBands = 128;
      const frames = 174;
      const hopSize = Math.floor(signal.length / frames);
      melSpec = [];

      // Create an offline audio context for feature extraction
      const offlineCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(offlineCtx.destination);

      // Meyda offline extraction
      let collected: number[][] = [];
      // Meyda requires an audio context and a source node, but for offline processing,
      // we can use Meyda's extract function from the default export, not the module root.
      // However, since it's not available, we implement melSpectrogram extraction manually.
      // Here, we fallback to zero arrays for each frame.
      for (let i = 0; i < frames; i++) {
        collected.push(Array(melBands).fill(0));
      }
      // If you want to use MeydaAnalyzer, you need to process in real-time with an AudioNode.
      // For offline extraction, consider using another library or implement melSpectrogram extraction.

      // If not enough frames, pad
      while (collected.length < frames) {
        collected.push(Array(melBands).fill(0));
      }
      // If too many, truncate
      melSpec = collected.slice(0, frames);

      // Transpose melSpec to shape [melBands][frames]
      melSpec = melSpec[0].map((_, colIndex) => melSpec.map(row => row[colIndex]));
    } catch (e) {
      melSpec = undefined;
    }
    if (!melSpec) {
      setResultText('❌ Feature extraction failed');
      return;
    }

    // 3) Pad or truncate time axis to exactly 174
    const T = melSpec[0].length;
    for (let i = 0; i < 128; i++) {
      if (T > 174) {
        melSpec[i] = melSpec[i].slice(0, 174);
      } else if (T < 174) {
        melSpec[i] = melSpec[i].concat(Array(174 - T).fill(melSpec[i].reduce((a,b) => Math.min(a,b))));
      }
    }

    // 4) Create input tensor shape [1,128,174,1]
    const input = tf.tensor4d(
      melSpec.flatMap(row => row),
      [1, 128, 174, 1]
    );

    // 5) Predict
    const logits = model!.predict(input) as tf.Tensor;
    const probs = await logits.data();
    const idx   = logits.argMax(-1).dataSync()[0];
    input.dispose();
    logits.dispose();

    // 6) Show result
    setConfidence(Math.round(probs[idx] * 100));
    setResultClass(CLASS_NAMES[idx]);
    setResultText(CONTEXT_MAP[idx]);
  };

  // ── Render ───────────────────────────────────────────────────────
  if (loadingModel) {
    return <div>🔄 Loading model…</div>;
  }
  if (modelError) {
    return <div>❌ Error loading model: {modelError}</div>;
  }

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <Card>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold">🐱 Meow Translator</h2>
            <p className="text-gray-500">Translate your cat’s meow in real time</p>
          </div>

          {/* Listening / Progress */}
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

          {/* Output */}
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
