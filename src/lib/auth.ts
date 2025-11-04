import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabase, supabaseAdmin } from "./supabase";
import type { User } from "@/types/database";

// Validate that NEXTAUTH_SECRET is set
if (!process.env.NEXTAUTH_SECRET) {
  console.warn(
    "⚠️ WARNING: NEXTAUTH_SECRET is not set in environment variables.\n" +
    "   This will cause JWT session errors.\n" +
    "   To fix: Add NEXTAUTH_SECRET to your .env.local file.\n" +
    "   Generate one with: openssl rand -base64 32"
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        access_token: { label: "Access Token (from email)", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // If Supabase is not configured, return null (user needs to configure it)
        if (!supabase) {
          console.error(
            "Supabase not configured. Please set up Supabase credentials in .env.local"
          );
          return null;
        }

        // Check user in Supabase
        const { data: user, error } = (await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email)
          .single()) as {
          data: (User & { email_verified?: boolean }) | null;
          error: any;
        };

        if (error || !user) {
          throw new Error("User not found");
        }

        // Check if user has a password (not OAuth-only user)
        if (!user.password) {
          throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Password is not correct");
        }

        // Check Supabase Auth status (source of truth) and enforce verification
        if (!supabaseAdmin) {
          console.error("Supabase admin client not configured.");
          return null;
        }

        // Supabase Admin API does not provide getUserByEmail; list and match locally
        const { data: usersList, error: listError } =
          await supabaseAdmin.auth.admin.listUsers();
        if (listError || !usersList?.users) {
          console.error("Failed to list auth users:", listError);
          return null;
        }

        const authUser = usersList.users.find(
          (u) =>
            (u.email || "").toLowerCase() === credentials.email.toLowerCase()
        );
        if (!authUser) {
          console.error("Auth user not found for email");
          throw new Error("User not found");
        }

        // Enforce email confirmation
        if (!authUser.email_confirmed_at) {
          throw new Error(
            "Please verify your email address before logging in. Check your inbox for the verification link."
          );
        }

        // Require access_token only for first-time login (before first successful sign-in)
        const isFirstLogin = !authUser.last_sign_in_at;
        const providedToken = (credentials as any).access_token as
          | string
          | undefined;

        if (isFirstLogin) {
          if (!providedToken || providedToken.length < 20) {
            throw new Error(
              "First-time login must be completed via the email link we sent (includes access_token). Please open your inbox and use that link to verify your account."
            );
          }
        }

        console.log("✅ Auth checks passed - allowing login");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 signIn callback triggered:", {
        provider: account?.provider,
        email: user.email,
      });

      // If user signed in with Google OAuth, save them to Supabase
      if (account?.provider === "google" && supabase && user.email) {
        try {
          console.log(
            "🔐 Google OAuth sign in detected, checking/saving to Supabase..."
          );

          // Check if user already exists
          const { data: existingUser, error: checkError } = (await supabase
            .from("users")
            .select("id")
            .eq("email", user.email)
            .maybeSingle()) as { data: { id: string } | null; error: any };

          console.log("Existing user check:", {
            hasUser: !!existingUser,
            checkError,
          });

          const oneMonthFromNow = new Date();
          oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

          if (!existingUser && !checkError) {
            // User doesn't exist, create them in Supabase
            console.log("✅ Creating new Google OAuth user in Supabase...");
            const { data: newUser, error: insertError } = (await supabase
              .from("users")
              .insert({
                name: user.name || "Google User",
                email: user.email,
                password: null,
                subscription_plan: "free",
                expiry_date: oneMonthFromNow.toISOString(),
                conversions: 5,
              } as any)
              .select()
              .single()) as { data: User | null; error: any };

            if (insertError) {
              console.error("❌ Failed to save Google user:", insertError);
            } else {
              console.log("✅ Google OAuth user saved to Supabase:", {
                id: newUser?.id,
                email: newUser?.email,
              });
            }
          } else if (existingUser) {
            console.log("✅ Google OAuth user already exists in Supabase");
          }
        } catch (error) {
          console.error("❌ Error in signIn callback:", error);
          // Don't block sign-in if database save fails - always return true
        }
      }

      // Always allow sign-in
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For Google OAuth, user.id might be the provider ID, not our database UUID
        // So we need to look up the user in our database by email to get the correct UUID
        if (account?.provider === "google" && user.email && supabase) {
          try {
            const { data: dbUser } = (await supabase
              .from("users")
              .select("id")
              .eq("email", user.email)
              .maybeSingle()) as { data: { id: string } | null; error: any };

            if (dbUser?.id) {
              token.id = dbUser.id; // Use UUID from database
            } else {
              token.id = user.id; // Fallback to NextAuth user ID
            }
          } catch (error) {
            console.error("Error looking up user in JWT callback:", error);
            token.id = user.id; // Fallback
          }
        } else {
          // For credentials login, user.id is already the database UUID
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && supabase) {
        session.user.id = token.id as string;

        // Fetch fresh subscription data from Supabase
        try {
          const { data: userData } = (await supabase
            .from("users")
            .select("subscription_plan, conversions, expiry_date")
            .eq("id", token.id)
            .single()) as {
            data: {
              subscription_plan: string;
              conversions: number;
              expiry_date: string;
            } | null;
          };

          if (userData) {
            session.user.subscriptionPlan = userData.subscription_plan;
            session.user.conversions = userData.conversions;
            session.user.expiryDate = userData.expiry_date;
          }
        } catch (error) {
          console.error("Error fetching user subscription data:", error);
        }
      }
      return session;
    },
  },
};

// Helper function to create a new user in Supabase
export async function createUser(name: string, email: string, password: string) {
  console.log("🔧 createUser called with:", { email, hasName: !!name });

  if (!supabase) {
    console.error("❌ Supabase not configured!");
    throw new Error("Supabase not configured. Please set up Supabase credentials in .env.local");
  }

  console.log("✅ Supabase client available");

  // 1) AUTH FIRST — triggers email and creates the auth identity
  console.log("📧 Creating user in Supabase Auth (auth-first)...");
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`
    }
  });

  if (authError) {
    console.error("❌ Auth signup error:", authError);
    // If already registered, guide user to login/verify
    throw new Error(authError.message || "Signup failed. If you already signed up, please use the email link to verify and then login.");
  }

  console.log("✅ Auth user created:", { id: authData?.user?.id, email: authData?.user?.email });
  if (!authData?.user) {
    throw new Error("Signup failed. Please try again.");
  }

  // 2) APP DB RECORD — upsert to keep our users table in sync
  const hashedPassword = await bcrypt.hash(password, 12);
  console.log("📝 Upserting user into app users table...");
  
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  const { data: upserted, error: upsertError } = (await supabase
    .from("users")
    .upsert(
      {
        name,
        email,
        password: hashedPassword,
        subscription_plan: "free",
        expiry_date: oneMonthFromNow.toISOString(), 
        conversions: 5,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "email" }
    )
    .select()
    .maybeSingle()) as { data: User | null; error: any };

  if (upsertError) {
    console.error("❌ Users table upsert error:", upsertError);
    throw new Error("Account created in Auth but failed to save profile. Please try signing in.");
  }

  console.log("✅ Users table in sync");
  return { id: upserted?.id || authData.user.id, name: name, email };
}