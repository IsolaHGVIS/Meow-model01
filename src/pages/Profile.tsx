
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PawPrint, Cat, Edit2 } from 'lucide-react';

const Profile: React.FC = () => {
  const [catProfile, setCatProfile] = useState<any>(null);
  
  useEffect(() => {
    // Load saved cat profile
    const savedProfile = localStorage.getItem('catProfile');
    if (savedProfile) {
      setCatProfile(JSON.parse(savedProfile));
    }
  }, []);
  
  const getBreedDisplayName = (breedId: string) => {
    const breeds: {[key: string]: string} = {
      "domestic": "Domestic Shorthair",
      "siamese": "Siamese",
      "persian": "Persian",
      "maine": "Maine Coon",
      "bengal": "Bengal",
    };
    return breeds[breedId] || breedId;
  };
  
  const getAgeDisplayName = (ageId: string) => {
    const ages: {[key: string]: string} = {
      "kitten": "Kitten (0-12 months)",
      "adult": "Adult (1-7 years)",
      "senior": "Senior (8+ years)",
    };
    return ages[ageId] || ageId;
  };
  
  // Placeholder data for demonstration
  const translationStats = [
    { label: "Meows Translated", value: 24 },
    { label: "Hungry Meows", value: 8 },
    { label: "Playful Meows", value: 10 },
    { label: "Attention Meows", value: 6 },
  ];
  
  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Cat Profile</h1>
      
      {catProfile ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-meow-peach">
                      <Cat size={32} className="text-meow-navy" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 bg-meow-pink text-white p-1 rounded-full">
                    <Edit2 size={14} />
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-4">
                  Edit Profile
                </Button>
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-semibold">
                  {catProfile.name || "My Cat"}
                  {catProfile.sex === "female" ? (
                    <span className="ml-2 text-meow-pink">♀</span>
                  ) : (
                    <span className="ml-2 text-meow-mint">♂</span>
                  )}
                </h2>
                <div className="grid gap-2 mt-3">
                  <div className="flex items-center gap-2">
                    <PawPrint size={16} className="text-meow-pink" />
                    <span className="text-muted-foreground">Breed:</span>
                    <span className="font-medium">{getBreedDisplayName(catProfile.breed)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PawPrint size={16} className="text-meow-pink" />
                    <span className="text-muted-foreground">Age:</span>
                    <span className="font-medium">{getAgeDisplayName(catProfile.age)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Translation Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {translationStats.map((stat, index) => (
                  <div key={index} className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Translations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <PawPrint size={16} className="text-meow-navy mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {["Hungry Meow", "Playful Meow", "Attention Meow"][i]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {["2h ago", "Yesterday", "3 days ago"][i]}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5">
                        {[
                          "I'm hungry! Feed me now, please!",
                          "Let's play! I'm feeling energetic!",
                          "Pet me! I need attention!"
                        ][i]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="py-8 flex flex-col items-center">
              <Cat size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Cat Profile Found</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                You need to set up a cat profile to use this feature
              </p>
              <Button 
                onClick={() => window.location.href = "/"} 
                className="bg-meow-pink hover:bg-meow-pink/90 text-white"
              >
                Create Cat Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default Profile;
