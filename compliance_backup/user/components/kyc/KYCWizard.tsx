
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { PersonalInfoStep } from './steps/PersonalInfoStep';
import { IdentityVerificationStep } from './steps/IdentityVerificationStep';
// import { FinancialInfoStep } from './steps/FinancialInfoStep';
import { ReviewStep } from './steps/ReviewStep';
import { VerificationStep } from '../../types/kyc';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

const STEPS: VerificationStep[] = [
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Basic personal details and contact information',
    isCompleted: false,
    isActive: true,
  },
  {
    id: 'identity-verification',
    title: 'Identity Verification',
    description: 'Upload government ID and take a selfie',
    isCompleted: false,
    isActive: false,
  },
  // {
  //   id: 'financial-info',
  //   title: 'Financial Information',
  //   description: 'Source of funds and transaction details',
  //   isCompleted: false,
  //   isActive: false,
  // },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review your information and submit for approval',
    isCompleted: false,
    isActive: false,
    requiresReview: true,
  },
];

interface KYCWizardProps {
  onComplete: () => void;
}

export function KYCWizard({ onComplete }: KYCWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(STEPS);
  const [formData, setFormData] = useState({});

  const progress = ((currentStep + 1) / steps.length) * 100;

  const updateStepStatus = (stepIndex: number, isCompleted: boolean) => {
    setSteps(prev => prev.map((step, index) => {
      if (index === stepIndex) {
        return { ...step, isCompleted };
      }
      if (index === stepIndex + 1 && isCompleted) {
        return { ...step, isActive: true };
      }
      return step;
    }));
  };

  const handleStepComplete = (data: any) => {
    setFormData(prev => ({ ...prev, ...data }));
    updateStepStatus(currentStep, true);
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStep = () => {
    switch (steps[currentStep].id) {
      case 'personal-info':
        return <PersonalInfoStep onNext={handleStepComplete} initialData={formData} />;
      case 'identity-verification':
        return <IdentityVerificationStep onNext={handleStepComplete} onPrevious={handlePrevious} />;
      // case 'financial-info':
      //   return <FinancialInfoStep onNext={handleStepComplete} onPrevious={handlePrevious} />;
      case 'review':
        return <ReviewStep formData={formData} onSubmit={handleStepComplete} onPrevious={handlePrevious} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Identity Verification</h1>
        <p className="text-lg text-gray-600">
          Complete your KYC verification to access our services
        </p>
        <div className="max-w-md mx-auto">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-sm text-gray-500">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
        </div>
      </div>

      {/* Steps Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center space-y-2">
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all",
                  step.isCompleted 
                    ? "!bg-success !border-success text-white" 
                    : step.isActive 
                    ? "!bg-primary !border-primary text-white" 
                    : "!bg-gray-100 !border-gray-300 text-gray-400"
                )}>
                  {step.isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-black" />
                  ) : step.requiresReview ? (
                    <Clock className="w-6 h-6 text-black" />
                  ) : (
                    <Circle className="w-6 h-6 text-black" />
                  )}
                </div>
                <div className="text-center max-w-24">
                  <div className={cn(
                    "text-sm font-medium",
                    step.isActive || step.isCompleted ? "text-gray-900" : "text-gray-400"
                  )}>
                    {step.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
              <p className="text-gray-600 mt-1">{steps[currentStep].description}</p>
            </div>
            <Badge variant={steps[currentStep].isActive ? "default" : "secondary"}>
              {steps[currentStep].isCompleted ? "Completed" : "In Progress"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
}
