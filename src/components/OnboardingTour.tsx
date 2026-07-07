
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, X, Gift, Search, User } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  image?: string;
  icon: JSX.Element;
}

export default function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  // Define the tour steps
  const steps: OnboardingStep[] = [
    {
      title: 'Welcome to VouchIt!',
      description: 'Join our community where unused vouchers find a new home. Let\'s get you started with a quick tour!',
      icon: <Gift className="h-12 w-12 text-primary" />
    },
    {
      title: 'Browse the Dashboard',
      description: 'Your dashboard gives you an overview of your voucher activity, statistics, and saved vouchers.',
      icon: <User className="h-12 w-12 text-accent" />
    },
    {
      title: 'Find and Save Vouchers',
      description: 'Search for vouchers by category, platform, or value. Save your favorites for later redemption.',
      icon: <Search className="h-12 w-12 text-voucher-cyan" />
    }
  ];

  useEffect(() => {
    // Check if the user has seen the tour before
    const tourSeen = localStorage.getItem('onboardingComplete');
    setHasSeenTour(!!tourSeen);
    
    // Only show for new users
    if (!tourSeen) {
      setOpen(true);
      // Wait a moment before showing the tour to let the app load
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete the tour
      completeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem('onboardingComplete', 'true');
    setHasSeenTour(true);
    setOpen(false);
  };

  const skipTour = () => {
    localStorage.setItem('onboardingComplete', 'true');
    setHasSeenTour(true);
    setOpen(false);
  };

  // Don't render anything if they've already seen the tour
  if (hasSeenTour) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {steps[currentStep].title}
          </DialogTitle>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="py-6"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-primary/10 p-5 rounded-full">
                {steps[currentStep].icon}
              </div>
              
              <DialogDescription className="text-center">
                {steps[currentStep].description}
              </DialogDescription>
            </div>
          </motion.div>
        </AnimatePresence>
        
        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrevious}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={skipTour}
            >
              Skip tour
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1 mr-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${
                    index === currentStep ? 'bg-primary' : 'bg-primary/30'
                  }`}
                />
              ))}
            </div>
            
            <Button 
              onClick={handleNext}
              className="flex items-center gap-1"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep < steps.length - 1 && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
