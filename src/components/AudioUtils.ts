// src/components/AudioUtils.ts
import * as tf from '@tensorflow/tfjs';
import FFT from 'fft.js';

export const CLASS_NAMES = [
  "Enviroment",
  "Growl",
  "Hissing",
  "Satistfied",
  "Attention",
  "Isolation",
  "Hungry"
];

export const CONTEXT_MAP: Record<number, string> = {
  0: "Environment Sounds",
  1: "I'm angry. Get away from me!",
  2: "I feel threatened and scared. Leave me alone!",
  3: "I am super satisfied! I love you!",
  4: 'Pet me! I want to play with you',
  5: "I feel lonely. Where are you?",
  6: "I'm hungry! Feed me now, please!"
};

export interface AudioClassificationResult {
  class: string;
  text: string;
  confidence: number;
  probabilities: number[]; 
  debugInfo?: string;
}

export async function processAudioBuffer(
  buffer: AudioBuffer,
  model: tf.LayersModel
): Promise<AudioClassificationResult> {
  const rawSignal = buffer.getChannelData(0);
  
  // Check audio level
  const audioThreshold = 0.005;
  const signalStrength = rawSignal.reduce((sum, value) => sum + Math.abs(value), 0) / rawSignal.length;
  
  console.log('Signal strength:', signalStrength);

 if (signalStrength < audioThreshold) {
    return {
      class: CLASS_NAMES[0],
      text: CONTEXT_MAP[0],
      confidence: 100,
      probabilities: new Array(CLASS_NAMES.length).fill(0).map((_, i) => i === 0 ? 1 : 0),
      debugInfo: "Low audio level detected"
    };
  }

    // Prepare mel spectrogram
  const bufferSize = 2048;
  const frames = 174;
  const hopSize = Math.floor((rawSignal.length - bufferSize) / (frames - 1));
  const melBands = 128;

  /// Preparing FFT
  const fft = new FFT(bufferSize);
  const complex = fft.createComplexArray();

  // Frame-by-frame extraction
  const melSpecFrames: number[][] = [];
  for (let i = 0; i < frames; i++) {
    const start = i * hopSize;
    const signalFrame = new Array(bufferSize).fill(0);
    for (let j = 0; j < bufferSize; j++) {
      signalFrame[j] = rawSignal[start + j] || 0;
    }
    
    fft.realTransform(complex, signalFrame);
    fft.completeSpectrum(complex);

    const half = bufferSize / 2;
    const mags = new Array(half + 1);
    for (let k = 0; k <= half; k++) {
      const re = complex[2 * k];
      const im = complex[2 * k + 1];
      mags[k] = Math.sqrt(re * re + im * im);
    }
    melSpecFrames.push(mags.slice(0, melBands));
  }

  // Transpose: [frames][bands] → [bands][frames]
  const melSpec = Array.from(
    { length: melBands },
    (_, m) => melSpecFrames.map(frame => frame[m])
  );

  // Creating tensor and predicting
  const flat = melSpec.flat();
  const input = tf.tensor4d(flat, [1, melBands, frames, 1]);
  const logits = model.predict(input) as tf.Tensor;
  const probs = await logits.data();
  const idx = logits.argMax(-1).dataSync()[0];
  input.dispose(); //previous code
  logits.dispose(); //previous code
    
  // Create debug info
  const debugLines = CLASS_NAMES.map((name, i) => {
    return `Class ${i} (${name}): ${(probs[i] * 100).toFixed(1)}%`;
  });

  const debugInfo = [
    `🐱 Cat Sound Analysis:`,
    `Detected Context: ${CONTEXT_MAP[idx]}`,
    `Confidence: ${(probs[idx] * 100).toFixed(1)}%`,
    '',
    `Debug Info:`,
    ...debugLines,
  ].join('\n');

  // Cleanup
  input.dispose();
  logits.dispose();

  return {
    class: CLASS_NAMES[idx],
    text: CONTEXT_MAP[idx],
    confidence: Math.round(probs[idx] * 100),
    probabilities: Array.from(probs)
      //debugInfo: debugInfo
  };
}