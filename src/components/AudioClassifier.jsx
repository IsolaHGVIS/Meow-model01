import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

function AudioClassifier() {
  const [model, setModel]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    tf.loadLayersModel('/model/model.json')
      .then(loaded => {
        console.log('Model loaded:', loaded);
        setModel(loaded);
      })
      .catch(err => {
        console.error('Failed to load model:', err);
        setLoadError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>🔄 Loading model…</div>;
  }
  if (loadError) {
    return <div>❗️ Error loading model: {loadError.message}</div>;
  }
  // At this point model is non-null
  return <div>✅ Model loaded! Ready to classify audio.</div>;
}

export default AudioClassifier;
