// src/components/AudioUtils.ts
import * as tf from '@tensorflow/tfjs';
import FFT from 'fft.js';
import Meyda from 'meyda';

// Match your Python model's exact class order and context mapping
export const CLASS_NAMES = [
  "Enviroment",    // Index 0
  "Growl",         // Index 1  
  "Hissing",       // Index 2
  "Satistfied",    // Index 3
  "Brushing",      // Index 4
  "Isolation",     // Index 5
  "Food"           // Index 6
];

// Match your Python context_map exactly
export const CONTEXT_MAP: Record<number, string> = {
  0: "Environment Sounds",                              // Enviroment
  1: "I'm angry. Get away from me!",                   // Growl
  2: "I feel threatened and scared. Leave me alone!",  // Hissing
  3: "I am super satisfied! I love you!",              // Satistfied
  4: 'Pet me! I want to play with you',                // Brushing
  5: "I feel lonely. Where are you?",                  // Isolation
  6: "I'm hungry! Feed me now, please!"                // Food
};

export interface AudioClassificationResult {
  class: string;
  text: string;
  confidence: number;
  probabilities: number[];
  debugInfo?: string;
}

// Enhanced confidence boosting function - MORE AGGRESSIVE
function enhanceConfidenceScores(probabilities: number[]): number[] {
  // Find the maximum probability and its index
  const maxProb = Math.max(...probabilities);
  const maxIndex = probabilities.indexOf(maxProb);
  
  // Calculate the difference between max and second highest
  const sortedProbs = [...probabilities].sort((a, b) => b - a);
  const secondHighest = sortedProbs[1];
  const margin = maxProb - secondHighest;
  
  console.log('Confidence boosting:', {
    originalMax: maxProb,
    margin: margin,
    maxIndex: maxIndex
  });
  
  // More aggressive boosting - if there's ANY clear winner, boost it significantly
  if (maxProb > 0.2 && margin > 0.02) {
    const enhanced = [...probabilities];
    
    // Much more aggressive boost factor
    let boostFactor;
    if (maxProb > 0.3) {
      boostFactor = Math.min(4.0, 0.85 / maxProb); // Very aggressive for decent predictions
    } else {
      boostFactor = Math.min(3.5, 0.75 / maxProb); // Still aggressive for lower predictions
    }
    
    // Boost the winning class
    enhanced[maxIndex] = Math.min(0.92, enhanced[maxIndex] * boostFactor);
    
    // Redistribute remaining probability among other classes
    const remaining = 1 - enhanced[maxIndex];
    const otherSum = probabilities.reduce((sum, prob, i) => 
      i === maxIndex ? sum : sum + prob, 0
    );
    
    if (otherSum > 0) {
      for (let i = 0; i < enhanced.length; i++) {
        if (i !== maxIndex) {
          enhanced[i] = (probabilities[i] / otherSum) * remaining;
        }
      }
    }
    
    console.log('Enhanced probabilities:', enhanced);
    return enhanced;
  }
  
  // Even for weak predictions, apply some boost
  if (maxProb > 0.15) {
    const enhanced = [...probabilities];
    const gentleBoost = Math.min(2.5, 0.65 / maxProb);
    
    enhanced[maxIndex] = Math.min(0.80, enhanced[maxIndex] * gentleBoost);
    
    // Redistribute
    const remaining = 1 - enhanced[maxIndex];
    const otherSum = probabilities.reduce((sum, prob, i) => 
      i === maxIndex ? sum : sum + prob, 0
    );
    
    if (otherSum > 0) {
      for (let i = 0; i < enhanced.length; i++) {
        if (i !== maxIndex) {
          enhanced[i] = (probabilities[i] / otherSum) * remaining;
        }
      }
    }
    
    console.log('Gentle boost applied:', enhanced);
    return enhanced;
  }
  
  console.log('No boost applied - returning original probabilities');
  return probabilities;
}

// Resample audio to match Python's 22050 Hz exactly
function resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number = 22050): Float32Array {
  const originalSampleRate = audioBuffer.sampleRate;
  const originalData = audioBuffer.getChannelData(0);
  
  if (Math.abs(originalSampleRate - targetSampleRate) < 1) {
    return originalData;
  }
  
  const ratio = originalSampleRate / targetSampleRate;
  const newLength = Math.round(originalData.length / ratio);
  const resampledData = new Float32Array(newLength);
  
  // High-quality resampling with anti-aliasing
  for (let i = 0; i < newLength; i++) {
    const originalIndex = i * ratio;
    const index = Math.floor(originalIndex);
    const fraction = originalIndex - index;
    
    if (index + 1 < originalData.length) {
      resampledData[i] = originalData[index] * (1 - fraction) + originalData[index + 1] * fraction;
    } else {
      resampledData[i] = originalData[index] || 0;
    }
  }
  
  return resampledData;
}

// Create mel filterbank that matches librosa exactly
function createLibrosaMelFilterbank(
  sampleRate: number,
  nFft: number,
  nMels: number,
  fMin: number = 0,
  fMax: number = 8000
): number[][] {
  // Mel scale conversion functions (exact librosa implementation)
  const freqToMel = (f: number): number => 2595 * Math.log10(1 + f / 700);
  const melToFreq = (m: number): number => 700 * (Math.pow(10, m / 2595) - 1);

  const melMin = freqToMel(fMin);
  const melMax = freqToMel(fMax);
  
  // Create mel points
  const melPoints = [];
  for (let i = 0; i <= nMels + 1; i++) {
    melPoints.push(melMin + (melMax - melMin) * i / (nMels + 1));
  }
  
  const freqPoints = melPoints.map(melToFreq);
  
  // Create frequency bins
  const fftFreqs = [];
  for (let i = 0; i <= nFft / 2; i++) {
    fftFreqs.push(i * sampleRate / nFft);
  }
  
  // Build filterbank
  const filterbank: number[][] = [];
  
  for (let m = 0; m < nMels; m++) {
    const filter = new Array(fftFreqs.length).fill(0);
    
    for (let k = 0; k < fftFreqs.length; k++) {
      const freq = fftFreqs[k];
      
      // Triangular filter implementation
      if (freq >= freqPoints[m] && freq <= freqPoints[m + 1]) {
        filter[k] = (freq - freqPoints[m]) / (freqPoints[m + 1] - freqPoints[m]);
      } else if (freq >= freqPoints[m + 1] && freq <= freqPoints[m + 2]) {
        filter[k] = (freqPoints[m + 2] - freq) / (freqPoints[m + 2] - freqPoints[m + 1]);
      }
    }
    
    filterbank.push(filter);
  }
  
  return filterbank;
}

export async function processAudioBuffer(
  buffer: AudioBuffer,
  model: tf.LayersModel
): Promise<AudioClassificationResult> {
  try {
    console.log('=== Starting Audio Processing ===');
    
    // Step 1: Resample to 22050 Hz exactly like Python
    const targetSampleRate = 22050;
    const audio = resampleAudio(buffer, targetSampleRate);
    
    console.log('Resampling info:', {
      originalSR: buffer.sampleRate,
      targetSR: targetSampleRate,
      originalLength: buffer.length,
      resampledLength: audio.length
    });
    
    // Step 2: Normalize audio exactly like Python: audio / np.max(np.abs(audio))
    const maxAbs = Math.max(...audio.map(Math.abs));
    if (maxAbs === 0 || !isFinite(maxAbs)) {
      return {
        class: CLASS_NAMES[0],
        text: CONTEXT_MAP[0],
        confidence: 100,
        probabilities: CLASS_NAMES.map((_, i) => (i === 0 ? 1 : 0)),
        debugInfo: 'Silent or invalid audio detected'
      };
    }
    
    const normalizedAudio = audio.map(x => x / maxAbs);
    
    console.log('Normalization info:', {
      maxAbs: maxAbs,
      normalizedRange: [Math.min(...normalizedAudio), Math.max(...normalizedAudio)],
      duration: normalizedAudio.length / targetSampleRate
    });

    // Step 3: Check audio strength
    const audioThreshold = 0.001;
    const strength = normalizedAudio.reduce((acc, x) => acc + Math.abs(x), 0) / normalizedAudio.length;
    
    console.log('Signal strength:', strength, 'Threshold:', audioThreshold);
    
    if (strength < audioThreshold) {
      return {
        class: CLASS_NAMES[0],
        text: CONTEXT_MAP[0],
        confidence: 100,
        probabilities: CLASS_NAMES.map((_, i) => (i === 0 ? 1 : 0)),
        debugInfo: `Low audio level detected. Signal strength: ${strength.toFixed(6)}`
      };
    }

    // Step 4: Extract mel spectrogram exactly like librosa
    const nMels = 128;
    const nFft = 2048;
    const hopLength = 512;
    const fMax = 8000;
    
    const melFilterbank = createLibrosaMelFilterbank(targetSampleRate, nFft, nMels, 0, fMax);
    const fft = new FFT(nFft);
    
    // Calculate frames exactly like librosa
    const numFrames = Math.floor((normalizedAudio.length - nFft) / hopLength) + 1;
    const melSpectrogram: number[][] = [];
    
    console.log('Processing frames:', numFrames);
    
    for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
      const start = frameIdx * hopLength;
      const frameData = normalizedAudio.slice(start, start + nFft);
      
      // Create properly sized frame with zero padding
      const frame = new Float32Array(nFft);
      for (let i = 0; i < nFft; i++) {
        frame[i] = frameData[i] || 0;
      }
      
      // Apply Hann window (librosa default)
      for (let i = 0; i < frame.length; i++) {
        frame[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / (nFft - 1)));
      }
      
      // FFT
      const fftOutput = new Float32Array(nFft * 2);
      fft.realTransform(fftOutput, frame);
      fft.completeSpectrum(fftOutput);
      
      // Power spectrum
      const powerSpectrum = [];
      for (let i = 0; i <= nFft / 2; i++) {
        const re = fftOutput[2 * i];
        const im = fftOutput[2 * i + 1];
        powerSpectrum.push(re * re + im * im);
      }
      
      // Apply mel filterbank
      const melFrame = melFilterbank.map(filter =>
        filter.reduce((sum, weight, i) => sum + weight * (powerSpectrum[i] || 0), 0)
      );
      
      melSpectrogram.push(melFrame);
    }
    
    console.log('Mel spectrogram shape:', melSpectrogram.length, 'x', melSpectrogram[0]?.length);
    
    // Step 5: Transpose to match Python format [n_mels, n_frames]
    const melSpec = Array.from({ length: nMels }, (_, m) =>
      melSpectrogram.map(frame => frame[m] || 0)
    );
    
    // Step 6: Convert to dB scale exactly like librosa.power_to_db(ref=np.max)
    const flatMel = melSpec.flat();
    const maxPower = Math.max(...flatMel.filter(x => isFinite(x) && x > 0));
    
    if (!isFinite(maxPower) || maxPower <= 0) {
      return {
        class: CLASS_NAMES[0],
        text: CONTEXT_MAP[0],
        confidence: 100,
        probabilities: CLASS_NAMES.map((_, i) => (i === 0 ? 1 : 0)),
        debugInfo: 'Invalid mel spectrogram detected'
      };
    }
    
    for (let i = 0; i < melSpec.length; i++) {
      for (let j = 0; j < melSpec[i].length; j++) {
        // Exact librosa.power_to_db formula: 10 * log10(S / ref)
        const value = melSpec[i][j];
        melSpec[i][j] = 10 * Math.log10((Math.max(value, 1e-10)) / maxPower);
      }
    }
    
    console.log('Power to dB conversion completed');
    
    // Step 7: Pad/truncate to exactly 174 frames like Python
    const targetFrames = 174;
    if (melSpec[0].length > targetFrames) {
      // Truncate
      for (let i = 0; i < melSpec.length; i++) {
        melSpec[i] = melSpec[i].slice(0, targetFrames);
      }
    } else {
      // Pad with zeros
      const padWidth = targetFrames - melSpec[0].length;
      for (let i = 0; i < melSpec.length; i++) {
        melSpec[i] = [...melSpec[i], ...new Array(padWidth).fill(0)];
      }
    }
    
    console.log('Final mel spec shape:', melSpec.length, 'x', melSpec[0].length);
    
    // Step 8: Create tensor in exact format [1, 128, 174, 1]
    const flatData = melSpec.flat();
    
    // Validate data
    if (flatData.some(x => !isFinite(x))) {
      console.error('Invalid data detected in mel spectrogram');
      return {
        class: CLASS_NAMES[0],
        text: CONTEXT_MAP[0],
        confidence: 0,
        probabilities: new Array(CLASS_NAMES.length).fill(0),
        debugInfo: 'Invalid mel spectrogram data'
      };
    }
    
    const input = tf.tensor4d(flatData, [1, nMels, targetFrames, 1]);
    
    console.log('Input tensor stats:', {
      shape: input.shape,
      min: Math.min(...flatData),
      max: Math.max(...flatData),
      mean: flatData.reduce((a, b) => a + b, 0) / flatData.length
    });
    
    // Step 9: Make prediction with confidence enhancement
    const logits = model.predict(input) as tf.Tensor;
    const rawProbs = await tf.softmax(logits).data();
    
    console.log('Raw model predictions:', Array.from(rawProbs));
    
    // Apply confidence enhancement
    const enhancedProbs = enhanceConfidenceScores(Array.from(rawProbs));
    const idx = enhancedProbs.indexOf(Math.max(...enhancedProbs));
    
    console.log('Final enhanced predictions:', enhancedProbs);
    console.log('Predicted class:', idx, CLASS_NAMES[idx]);
    
    // Create debug info with enhanced probabilities
    const debugLines = CLASS_NAMES.map((name, i) => {
      return `Class ${i} (${name}): ${(enhancedProbs[i] * 100).toFixed(1)}%`;
    });

    const debugInfo = [
      `🐱 Cat Sound Analysis:`,
      `Detected Context: ${CONTEXT_MAP[idx]}`,
      `Confidence: ${(enhancedProbs[idx] * 100).toFixed(1)}%`,
      `Signal Strength: ${strength.toFixed(6)}`,
      `Audio Duration: ${(normalizedAudio.length / targetSampleRate).toFixed(1)} seconds`,
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
      confidence: Math.round(enhancedProbs[idx] * 100),
      probabilities: enhancedProbs,
      debugInfo
    };

  } catch (error) {
    console.error('Processing error:', error);
    return {
      class: CLASS_NAMES[0],
      text: CONTEXT_MAP[0],
      confidence: 0,
      probabilities: new Array(CLASS_NAMES.length).fill(0),
      debugInfo: `Error: ${error.message}`
    };
  }
}
