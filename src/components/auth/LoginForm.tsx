"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FaGoogle, FaEye, FaEyeSlash } from "react-icons/fa";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onSuccess?: () => void;
}

export default function LoginForm({ onSwitchToSignup, onSuccess }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Parse access_token from URL hash (supabase magic link) and store it temporarily
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    if (!hash) return;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const token = params.get("access_token");
    if (token) {
      setAccessToken(token);
      // Clean the URL hash to avoid leaking token
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
  }, []);
  const router = useRouter();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        access_token: accessToken || undefined,
        redirect: false,
      });

      if (result?.ok) {
        // Clear pending verification email from localStorage since user is now verified and logged in
        if (typeof window !== "undefined") {
          localStorage.removeItem("pendingVerificationEmail");
        }
        
        // Close modal and refresh to show logged-in state
        if (onSuccess) {
          onSuccess();
        }
        router.refresh();
      } else {
        // Check for specific error messages
        const errorMessage = result?.error || "Invalid email or password";
        
        // Handle specific error messages from backend
        if (errorMessage === "User not found") {
          setError("User not found");
        } else if (errorMessage === "Password is not correct") {
          setError("Password is not correct");
        } else if (errorMessage.includes("verify your email")) {
          setError("Please verify your email address before logging in. Check your inbox for the verification link.");
        } else if (errorMessage.toLowerCase().includes("first-time login") || errorMessage.toLowerCase().includes("email link")) {
          setError("First-time login requires using the email link. Please open the email we sent and click the button to complete activation.");
        } else if (errorMessage === "CredentialsSignin") {
          // Fallback for generic NextAuth error
          setError("Invalid email or password");
        } else {
          setError(errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Network error. Please try again.";
      
      // Handle specific errors from thrown exceptions
      if (errorMessage === "User not found") {
        setError("User not found");
      } else if (errorMessage === "Password is not correct") {
        setError("Password is not correct");
      } else if (errorMessage.includes("verify your email")) {
        setError(errorMessage);
      } else if (errorMessage.includes("first-time login") || errorMessage.includes("email link")) {
        setError(errorMessage);
      } else {
        setError("Network error. Please try again.");
      }
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
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome Back</h2>
        <p className="text-muted-foreground mt-2">
          Sign in to access your conversion history
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      placeholder="Enter your password"
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

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing In..." : "Sign In"}
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
        <span className="text-muted-foreground">Don't have an account? </span>
        <button
          onClick={onSwitchToSignup}
          className="text-primary hover:underline font-medium"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
