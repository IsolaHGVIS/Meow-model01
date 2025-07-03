
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import LoadingScreen from '@/components/LoadingScreen';
import CatProfile from '@/components/CatProfile';
import MeowDetector from '@/components/MeowDetector';

const Index: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [catProfile, setCatProfile] = useState<any>(null);
  
  useEffect(() => {
    // Check if we have a saved profile
    const savedProfile = localStorage.getItem('catProfile');
    if (savedProfile) {
      setCatProfile(JSON.parse(savedProfile));
    }
  }, []);
  
  const handleLoadingComplete = () => {
    setIsLoading(false);
  };
  
  const handleProfileSet = (profile: any) => {
    setCatProfile(profile);
    localStorage.setItem('catProfile', JSON.stringify(profile));
  };
  
  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }
  
  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Meow Translator</h1>
        
        {!catProfile ? (
          <CatProfile onProfileSet={handleProfileSet} />
        ) : (
          <MeowDetector catProfile={catProfile} />
        )}
      </div>
    </Layout>
  );
};

export default Index;
