"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FaGoogle, FaEye, FaEyeSlash, FaCheck, FaTimes } from "react-icons/fa";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[@$!%*?&]/, "Password must contain at least one special character"),
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

export default function SignupForm({ onSwitchToLogin, onSuccess }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const password = form.watch("password");

  // Password validation checks
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Store email in localStorage for resend verification (in case link expires)
        if (typeof window !== "undefined") {
          localStorage.setItem("pendingVerificationEmail", data.email);
        }
        
        // Show success message instead of auto-login
        // User needs to verify email first
        setSuccessMessage(data.email);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Signup failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    await signIn("google", { 
      callbackUrl: "/",
      redirect: true,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {successMessage ? (
        // Success Message - Professional
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-500 rounded-lg p-6 space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">Account Created Successfully!</h2>
          </div>
          
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <h3 className="font-semibold text-sm">Verification Email Sent</h3>
                <p className="text-xs text-muted-foreground">
                  We've sent a verification link to: <span className="font-medium text-foreground">{successMessage}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-semibold text-sm">What's Next?</h3>
                <p className="text-xs text-muted-foreground">
                  Check your inbox and click the verification link to activate your account.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="font-semibold text-sm">Important</h3>
                <p className="text-xs text-muted-foreground">
                  You must verify your email before logging in. Don't forget to check your spam folder!
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.open('https://mail.google.com', '_blank');
                }
              }}
            >
              Open Gmail
            </Button>
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSuccessMessage("");
                onSwitchToLogin(); // Always switch to login view
              }}
            >
              Close
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center">
            <h2 className="text-2xl font-bold">Create Account</h2>
            <p className="text-muted-foreground mt-2">
              Sign up to save your conversion history
            </p>
          </div>

          <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Enter your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Requirements */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {passwordChecks.uppercase ? (
                <FaCheck className="text-green-500 w-3 h-3" />
              ) : (
                <FaTimes className="text-red-500 w-3 h-3" />
              )}
              <span className={passwordChecks.uppercase ? "text-green-600" : "text-muted-foreground"}>
                Uppercase letter
              </span>
            </div>
            <div className="flex items-center gap-2">
              {passwordChecks.lowercase ? (
                <FaCheck className="text-green-500 w-3 h-3" />
              ) : (
                <FaTimes className="text-red-500 w-3 h-3" />
              )}
              <span className={passwordChecks.lowercase ? "text-green-600" : "text-muted-foreground"}>
                Lowercase letter
              </span>
            </div>
            <div className="flex items-center gap-2">
              {passwordChecks.number ? (
                <FaCheck className="text-green-500 w-3 h-3" />
              ) : (
                <FaTimes className="text-red-500 w-3 h-3" />
              )}
              <span className={passwordChecks.number ? "text-green-600" : "text-muted-foreground"}>
                Number
              </span>
            </div>
            <div className="flex items-center gap-2">
              {passwordChecks.special ? (
                <FaCheck className="text-green-500 w-3 h-3" />
              ) : (
                <FaTimes className="text-red-500 w-3 h-3" />
              )}
              <span className={passwordChecks.special ? "text-green-600" : "text-muted-foreground"}>
                Special character (e.g. !?&lt;&gt;@#$%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {passwordChecks.length ? (
                <FaCheck className="text-green-500 w-3 h-3" />
              ) : (
                <FaTimes className="text-red-500 w-3 h-3" />
              )}
              <span className={passwordChecks.length ? "text-green-600" : "text-muted-foreground"}>
                8 characters or more
              </span>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <FaGoogle className="mr-2 h-4 w-4" />
        Sign in with Google
      </Button>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <button
          onClick={onSwitchToLogin}
          className="text-primary hover:underline font-medium"
        >
          Sign in
        </button>
      </div>
        </>
      )}
    </div>
  );
}
