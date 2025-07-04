import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';

export interface StepperStep {
  title: string;
  component: React.ReactNode;
}

interface StepperModalProps {
  steps: StepperStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const StepperModal: React.FC<StepperModalProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  if (!isOpen) return null;
  
  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border p-6">
          <h2 className="text-xl font-bold">Create Learning Path</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Stepper */}
        <div className="px-6 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center">
            {steps.map((step, index) => (
              <React.Fragment key={index}>
                {/* Step indicator */}
                <div className="flex items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index < currentStep ? 'bg-primary text-primary-foreground' : index === currentStep ? 'bg-primary/20 border border-primary text-primary' : 'bg-muted text-muted-foreground'}`}
                  >
                    {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className="ml-3 font-medium hidden sm:block">{step.title}</span>
                </div>
                
                {/* Connector */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-4 h-0.5 bg-muted">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${index < currentStep ? '100%' : '0%'}` }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {steps[currentStep].component}
        </div>
        
        {/* Footer */}
        <div className="border-t border-border p-6 flex justify-between">
          <button
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={goToNextStep}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'} {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepperModal;
