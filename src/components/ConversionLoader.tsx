"use client";

import { useEffect, useState } from "react";
import { FaRobot, FaFileAlt, FaVolumeUp, FaCheckCircle } from "react-icons/fa";

interface ConversionLoaderProps {
  progress: number;
}

export default function ConversionLoader({ progress }: ConversionLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 0,
      icon: <FaFileAlt className="w-6 h-6" />,
      title: "Extracting Text",
      description: "Reading and processing your PDF document..."
    },
    {
      id: 1,
      icon: <FaRobot className="w-6 h-6" />,
      title: "AI Processing",
      description: "Analyzing text for natural speech patterns..."
    },
    {
      id: 2,
      icon: <FaVolumeUp className="w-6 h-6" />,
      title: "Generating Audio",
      description: "Creating human-like voice with emotional expression..."
    },
    {
      id: 3,
      icon: <FaCheckCircle className="w-6 h-6" />,
      title: "Complete",
      description: "Your audiobook is ready!"
    }
  ];

  useEffect(() => {
    if (progress < 25) setCurrentStep(0);
    else if (progress < 50) setCurrentStep(1);
    else if (progress < 90) setCurrentStep(2);
    else setCurrentStep(3);
  }, [progress]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card p-8 rounded-lg border shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Converting Your PDF</h2>
          <p className="text-muted-foreground">
            Please wait while we transform your document into natural audio
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center space-x-4 p-4 rounded-lg transition-all duration-300 ${
                currentStep === index
                  ? 'bg-primary/10 border border-primary/20'
                  : currentStep > index
                  ? 'bg-muted/50'
                  : 'opacity-50'
              }`}
            >
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  currentStep === index
                    ? 'bg-primary text-primary-foreground animate-pulse'
                    : currentStep > index
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              {currentStep > index && (
                <FaCheckCircle className="w-5 h-5 text-green-500" />
              )}
            </div>
          ))}
        </div>

        {/* AI Voice Info */}
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <FaRobot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-medium">Advanced AI Voice Engine</h4>
              <p className="text-sm text-muted-foreground">
                Using emotional male voice with natural intonation and pacing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
