
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { BusinessInfoStep } from './steps/BusinessInfoStep';
import { BusinessDocumentsStep } from './steps/BusinessDocumentsStep';
// import { OwnershipStructureStep } from './steps/OwnershipStructureStep';
// import { AuthorizedRepresentativesStep } from './steps/AuthorizedRepresentativesStep';
import { KYBReviewStep } from './steps/KYBReviewStep';
import { VerificationStep } from '../../types/kyc';
import { CheckCircle, Circle, Clock, Building } from 'lucide-react';
import { cn } from '../../lib/utils';

const STEPS: VerificationStep[] = [
  {
    id: 'business-info',
    title: 'Business Information',
    description: 'Basic business details and registration information',
    isCompleted: false,
    isActive: true,
  },
  {
    id: 'business-documents',
    title: 'Business Documents',
    description: 'Upload required business documentation',
    isCompleted: false,
    isActive: false,
  },
  // {
  //   id: 'ownership-structure',
  //   title: 'Ownership Structure',
  //   description: 'Ultimate beneficial owners and shareholding structure',
  //   isCompleted: false,
  //   isActive: false,
  // },
  // {
  //   id: 'authorized-representatives',
  //   title: 'Authorized Representatives',
  //   description: 'Individuals authorized to act on behalf of the business',
  //   isCompleted: false,
  //   isActive: false,
  // },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review all information and submit for approval',
    isCompleted: false,
    isActive: false,
    requiresReview: true,
  },
];

interface KYBWizardProps {
  onComplete: () => void;
}

export function KYBWizard({ onComplete }: KYBWizardProps) {
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
      case 'business-info':
        return <BusinessInfoStep onNext={handleStepComplete} initialData={formData} />;
      case 'business-documents':
        return <BusinessDocumentsStep onNext={handleStepComplete} onPrevious={handlePrevious} />;
      // case 'ownership-structure':
      //   return <OwnershipStructureStep onNext={handleStepComplete} onPrevious={handlePrevious} />;
      // case 'authorized-representatives':
      //   return <AuthorizedRepresentativesStep onNext={handleStepComplete} onPrevious={handlePrevious} />;
      case 'review':
        return <KYBReviewStep formData={formData} onSubmit={handleStepComplete} onPrevious={handlePrevious} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Building className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-gray-900">Business Verification</h1>
        </div>
        <p className="text-lg text-gray-600">
          Complete your KYB verification to enable business account features
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
          <div className="flex justify-between items-center overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center space-y-2 min-w-32">
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all",
                  step.isCompleted 
                    ? "bg-success border-success text-white" 
                    : step.isActive 
                    ? "bg-primary border-primary text-white" 
                    : "bg-gray-100 border-gray-300 text-gray-400"
                )}>
                  {step.isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-yellow-500" />
                  ) : step.requiresReview ? (
                    <Clock className="w-6 h-6 text-yellow-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-yellow-400" />
                  )}
                </div>
                <div className="text-center">
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
