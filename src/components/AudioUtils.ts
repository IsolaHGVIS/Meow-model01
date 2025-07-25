// src/components/AudioUtils.ts
import * as tf from '@tensorflow/tfjs';
import FFT from 'fft.js';
import Meyda from 'meyda';

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

// Create Mel filterbank matrix
function createMelFilterbank(
  sampleRate: number,
  fftSize: number,
  melBands: number,
  fMin = 0,
  fMax = 8000
): number[][] {
  const freqToMel = (f: number) => 2595 * Math.log10(1 + f / 700);
  const melToFreq = (m: number) => 700 * (10 ** (m / 2595) - 1);

  const melMin = freqToMel(fMin);
  const melMax = freqToMel(fMax);

  const melPoints = Array.from({ length: melBands + 2 }, (_, i) =>
    melMin + (i * (melMax - melMin)) / (melBands + 1)
  );
  const hzPoints = melPoints.map(melToFreq);

  const binFrequencies = Array.from({ length: fftSize / 2 + 1 }, (_, i) =>
    (i * sampleRate) / fftSize
  );

  const filterbank: number[][] = [];

  for (let m = 0; m < melBands; m++) {
    const fLeft = hzPoints[m];
    const fCenter = hzPoints[m + 1];
    const fRight = hzPoints[m + 2];

    const filter: number[] = [];

    for (let k = 0; k < binFrequencies.length; k++) {
      const freq = binFrequencies[k];
      let weight = 0;
      if (freq >= fLeft && freq <= fCenter) {
        weight = (freq - fLeft) / (fCenter - fLeft);
      } else if (freq >= fCenter && freq <= fRight) {
        weight = (fRight - freq) / (fRight - fCenter);
      }
      filter.push(weight);
    }

    filterbank.push(filter);
  }

  return filterbank;
}

export async function processAudioBuffer(
  buffer: AudioBuffer,
  model: tf.LayersModel
): Promise<AudioClassificationResult> {
  const signal = buffer.getChannelData(0);

  const audioThreshold = 0.005;
  const strength = signal.reduce((acc, x) => acc + Math.abs(x), 0) / signal.length;
  console.log('Signal strength:', strength);
  if (strength < audioThreshold) {
    return {
      class: CLASS_NAMES[0],
      text: CONTEXT_MAP[0],
      confidence: 100,
      probabilities: CLASS_NAMES.map((_, i) => (i === 0 ? 1 : 0)),
      debugInfo: 'Low audio level detected'
    };
  }

  // === Parameters ===
  const melBands = 128;
  const frameSize = 2048;
  const hopSize = 512;
  const targetFrames = 174;
  const fft = new FFT(frameSize);
  const fftOutput = new Float32Array(frameSize * 2);
  const melFilterbank = createMelFilterbank(buffer.sampleRate, frameSize, melBands);

  // === Pre-emphasis ===
  const preEmphasized = signal.map((v, i) => v - 0.97 * (signal[i - 1] || 0));

  // === Framing & FFT ===
  const melSpectrogram: number[][] = [];

  for (let start = 0; start + frameSize <= preEmphasized.length; start += hopSize) {
    const frame = preEmphasized.slice(start, start + frameSize);

    // Apply Hamming window
    for (let i = 0; i < frame.length; i++) {
      frame[i] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
    }

    const real = new Float32Array(frameSize);
    const imag = new Float32Array(frameSize);
    frame.forEach((v, i) => (real[i] = v));

    fft.realTransform(fftOutput, real);
    fft.completeSpectrum(fftOutput);

    // Power spectrum
    const powerSpectrum = [];
    for (let i = 0; i <= frameSize / 2; i++) {
      const re = fftOutput[2 * i];
      const im = fftOutput[2 * i + 1];
      powerSpectrum.push(re * re + im * im);
    }

    // Apply mel filterbank
    const melBandsFrame = melFilterbank.map(filter =>
      filter.reduce((sum, w, i) => sum + w * powerSpectrum[i], 0)
    );
    melSpectrogram.push(melBandsFrame);
  }

  // Pad or crop to fixed frame count
  while (melSpectrogram.length < targetFrames) {
    melSpectrogram.push(new Array(melBands).fill(0));
  }
  melSpectrogram.length = targetFrames;

  // Transpose: [melBands][frames]
  const melSpec = Array.from({ length: melBands }, (_, m) =>
    melSpectrogram.map(frame => frame[m])
  );

  // === Log-mel scaling ===
  for (let i = 0; i < melBands; i++) {
    for (let j = 0; j < targetFrames; j++) {
      melSpec[i][j] = Math.log(melSpec[i][j] + 1e-6);
    }
  }

  // === Min-max normalize ===
  const flat = melSpec.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const normSpec = melSpec.map(row =>
    row.map(v => (v - min) / (max - min + 1e-6))
  );

  // === Tensor ===
  const input = tf.tensor4d(normSpec.flat(), [1, melBands, targetFrames, 1]);
  const logits = model.predict(input) as tf.Tensor;
  const probs = await tf.softmax(logits).data();
  const idx = probs.indexOf(Math.max(...probs));

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


  input.dispose();
  logits.dispose();

  return {
    class: CLASS_NAMES[idx],
    text: CONTEXT_MAP[idx],
    confidence: Math.round(probs[idx] * 100),
    probabilities: Array.from(probs),
    debugInfo
  };

    // Cleanup
  input.dispose();
  logits.dispose();
}
 


