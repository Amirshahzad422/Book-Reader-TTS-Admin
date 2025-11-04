"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground z-10"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="p-6">
          {mode === "login" ? (
            <LoginForm onSwitchToSignup={() => setMode("signup")} onSuccess={onClose} />
          ) : (
            <SignupForm onSwitchToLogin={() => setMode("login")} onSuccess={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
