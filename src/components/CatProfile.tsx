
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { PawPrint, Cat } from 'lucide-react';

interface CatProfileProps {
  onProfileSet: (profile: any) => void;
}

const CatProfile: React.FC<CatProfileProps> = ({ onProfileSet }) => {
  const [breed, setBreed] = useState("domestic");
  const [age, setAge] = useState("adult");
  const [sex, setSex] = useState("female");
  
  const breedOptions = [
    { id: "domestic", label: "Domestic Shorthair" },
    { id: "siamese", label: "Siamese" },
    { id: "persian", label: "Persian" },
    { id: "maine", label: "Maine Coon" },
    { id: "bengal", label: "Bengal" },
  ];
  
  const ageOptions = [
    { id: "kitten", label: "Kitten (0-12 months)" },
    { id: "adult", label: "Adult (1-7 years)" },
    { id: "senior", label: "Senior (8+ years)" },
  ];
  
  const handleSubmit = () => {
    onProfileSet({ breed, age, sex });
  };

  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardContent className="pt-6">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-meow-peach/50 flex items-center justify-center">
              <Cat size={40} className="text-meow-navy" />
            </div>
            <PawPrint size={16} className="absolute -bottom-1 -right-1 text-meow-pink" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-6">Create Cat Profile</h2>
        
        <Tabs defaultValue="breed" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="breed">Breed</TabsTrigger>
            <TabsTrigger value="age">Age</TabsTrigger>
            <TabsTrigger value="sex">Sex</TabsTrigger>
          </TabsList>
          
          <TabsContent value="breed" className="space-y-4">
            <RadioGroup value={breed} onValueChange={setBreed}>
              <div className="grid grid-cols-1 gap-3">
                {breedOptions.map(option => (
                  <div key={option.id} className="flex items-center">
                    <RadioGroupItem value={option.id} id={`breed-${option.id}`} className="peer sr-only" />
                    <Label 
                      htmlFor={`breed-${option.id}`}
                      className="flex flex-1 items-center space-x-3 rounded-lg border p-3 peer-data-[state=checked]:bg-meow-peach/20 peer-data-[state=checked]:border-meow-pink [&:has([data-state=checked])]:bg-meow-peach/20 [&:has([data-state=checked])]:border-meow-pink hover:bg-muted/50 cursor-pointer"
                    >
                      <PawPrint size={16} className="text-meow-navy" />
                      <span>{option.label}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </TabsContent>
          
          <TabsContent value="age" className="space-y-4">
            <RadioGroup value={age} onValueChange={setAge}>
              <div className="grid grid-cols-1 gap-3">
                {ageOptions.map(option => (
                  <div key={option.id} className="flex items-center">
                    <RadioGroupItem value={option.id} id={`age-${option.id}`} className="peer sr-only" />
                    <Label 
                      htmlFor={`age-${option.id}`}
                      className="flex flex-1 items-center space-x-3 rounded-lg border p-3 peer-data-[state=checked]:bg-meow-peach/20 peer-data-[state=checked]:border-meow-pink [&:has([data-state=checked])]:bg-meow-peach/20 [&:has([data-state=checked])]:border-meow-pink hover:bg-muted/50 cursor-pointer"
                    >
                      <PawPrint size={16} className="text-meow-navy" />
                      <span>{option.label}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </TabsContent>
          
          <TabsContent value="sex" className="space-y-4">
            <RadioGroup value={sex} onValueChange={setSex}>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center">
                  <RadioGroupItem value="female" id="sex-female" className="peer sr-only" />
                  <Label 
                    htmlFor="sex-female"
                    className="flex flex-1 items-center space-x-3 rounded-lg border p-3 peer-data-[state=checked]:bg-meow-peach/20 peer-data-[state=checked]:border-meow-pink [&:has([data-state=checked])]:bg-meow-peach/20 [&:has([data-state=checked])]:border-meow-pink hover:bg-muted/50 cursor-pointer"
                  >
                    <PawPrint size={16} className="text-meow-pink" />
                    <span>Female</span>
                  </Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="male" id="sex-male" className="peer sr-only" />
                  <Label 
                    htmlFor="sex-male"
                    className="flex flex-1 items-center space-x-3 rounded-lg border p-3 peer-data-[state=checked]:bg-meow-peach/20 peer-data-[state=checked]:border-meow-pink [&:has([data-state=checked])]:bg-meow-peach/20 [&:has([data-state=checked])]:border-meow-pink hover:bg-muted/50 cursor-pointer"
                  >
                    <PawPrint size={16} className="text-meow-mint" />
                    <span>Male</span>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8">
          <Button 
            onClick={handleSubmit} 
            className="w-full bg-meow-pink hover:bg-meow-pink/90 text-white"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CatProfile;
