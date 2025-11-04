"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { adminAuth } from "./../utils/adminAuth";

// Initialize Supabase client (adjust with your actual credentials)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    if (adminAuth.isAuthenticated()) {
      onLoginSuccess();
    }
  }, [onLoginSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Query admin table
      const { data, error: queryError } = await supabase
        .from("admin")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .single();

      if (queryError || !data) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      // Store admin session
      adminAuth.setSession({
        id: data.id,
        name: data.name,
        email: data.email,
        created_at: data.created_at,
      });

      // Call success callback
      onLoginSuccess();
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* App Name */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            AI PDF-to-Audio Platform
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-card p-8 rounded-2xl shadow-xl border-2 border-border">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Admin Panel
            </h2>
            <p className="text-muted-foreground">Sign in to manage</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border-2 border-red-500/20 text-red-600 px-4 py-3 rounded-lg font-medium">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-foreground mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-white font-semibold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
