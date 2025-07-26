// src/components/MeowDetector.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, Volume2, Upload, FileAudio } from 'lucide-react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [resultClass, setResultClass] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const [debugText, setDebugText] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Loading model on mount ────────────────────────
  useEffect(() => {
    tf.loadLayersModel('/model/model.json')
      .then(m => {
        setModel(m);
        console.log('Model loaded successfully');
      })
      .catch(err => {
        console.error('Model loading error:', err);
        setModelError(err.message);
      })
      .finally(() => setLoadingModel(false));
  }, []);

  // ── Main feature extraction and prediction function ───────────────
  async function classifyAudioBuffer(buffer: AudioBuffer) {
    if (!model) return;

    try {
      setIsProcessing(true);
      console.log('Starting classification...');
      
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

      console.log('Classification completed:', debugInfo);
      setDebugText(debugInfo);

    } catch (error) {
      console.error('Classification error:', error);
      toast({
        title: 'Classification failed',
        description: 'Please try again with a different audio file',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Audio Upload Handler ───────────────
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!model) {
      toast({ title: 'Model not loaded yet', variant: 'destructive' });
      return;
    }

    // Check file type
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/m4a', 'audio/flac'];
    if (!file.type.startsWith('audio/') && !validTypes.includes(file.type)) {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please upload an audio file (wav, mp3, ogg, m4a, flac)',
        variant: 'destructive' 
      });
      return;
    }

    try {
      setIsProcessing(true);
      setResultText(null);
      setDebugText(null);

      console.log('Processing uploaded file:', file.name, file.type, file.size);

      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Create AudioContext and decode audio
      const audioContext = new AudioContext({ sampleRate: 44100 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      console.log('Audio decoded:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      });

      // Process the audio
      await classifyAudioBuffer(audioBuffer);

      toast({ 
        title: 'Audio processed successfully!',
        description: `Processed ${file.name} - Check results below`
      });

    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: 'File processing failed',
        description: 'Please try a different audio file or check the format',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ── Starting recording ──────────────────────────────────
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
    setDebugText(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } 
      });
      
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
      const recordingDuration = 3000;
      const updateInterval = 50;
      const progressIncrement = (100 * updateInterval) / recordingDuration;

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

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording failed',
        description: 'Please check microphone permissions',
        variant: 'destructive'
      });
      setIsListening(false);
    }
  };

  // ── Rendering ────────────────────────────────────────────────
  if (loadingModel) return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
        <div>🔄 Loading model…</div>
      </div>
    </div>
  );
  
  if (modelError) return (
    <div className="text-center text-red-600">
      <div>❌ Error loading model: {modelError}</div>
      <div className="text-sm mt-2">Please refresh the page and try again</div>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">🐱 Meow Translator</h2>
            <p className="text-gray-500">Translate your cat's meow in real time</p>
          </div>

          {/* Recording Section */}
          {isListening ? (
            <div className="space-y-2">
              <div className="text-center text-sm text-gray-600">Recording...</div>
              <Progress value={progress} className="h-2" />
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => recorderRef.current?.stop()}
              >
                Stop Recording
              </Button>
            </div>
          ) : (
            <Button 
              className="w-full" 
              onClick={startListening}
              disabled={isProcessing}
            >
              <Mic className="mr-2" /> 
              {isProcessing ? 'Processing...' : 'Start Recording (3s)'}
            </Button>
          )}

          {/* Upload Section */}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing || isListening}
            />
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isListening}
            >
              <Upload className="mr-2" />
              {isProcessing ? 'Processing...' : 'Upload Audio File'}
            </Button>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              Processing audio...
            </div>
          )}

          {/* Results Section - FIXED WITH DARK BACKGROUND */}
          {resultText && (
            <div className="p-4 border rounded-lg space-y-2 bg-gray-900">
              <div className="flex items-center">
                <Volume2 className="mr-2 text-white" />
                <span className="font-medium text-white">{resultClass}</span>
                <span className="ml-auto px-2 py-1 text-sm bg-gray-700 rounded-full text-white">
                  {confidence}% confidence
                </span>
              </div>
              <p className="text-gray-300">{resultText}</p>
            </div>
          )}

          {/* Debug Info */}
          {debugText && (
            <div className="p-4 border rounded-lg space-y-2 bg-gray-900">
              <div className="flex items-center">
                <FileAudio className="mr-2 text-white" />
                <span className="font-medium text-white">Analysis Details</span>
              </div>
              <pre className="text-sm text-white whitespace-pre-wrap font-mono overflow-x-auto">
                {debugText}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
