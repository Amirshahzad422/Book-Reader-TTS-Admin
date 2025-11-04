"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification token has expired or has already been used.",
    Default: "An error occurred during authentication.",
    google: "Failed to sign in with Google. Please try again.",
  };

  const errorMessage = errorMessages[error || "Default"] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold">Authentication Error</h1>
        
        <div className="bg-card border rounded-lg p-6">
          <p className="text-muted-foreground mb-4">{errorMessage}</p>
          
          <div className="space-y-2">
            <Button onClick={() => window.location.href = "/"} variant="default">
              Go to Home Page
            </Button>
            <Button onClick={() => window.location.href = "/api/auth/signin/google"} variant="outline" className="w-full">
              Try Google Sign-In Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}

