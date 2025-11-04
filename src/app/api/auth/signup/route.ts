import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();
    console.log("📝 Signup attempt:", { email, hasName: !!name, hasPassword: !!password });

    if (!name || !email || !password) {
      console.log("❌ Missing fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format server-side
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format:", email);
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    if (!passwordRegex.test(password)) {
      console.log("❌ Password validation failed");
      return NextResponse.json(
        { error: "Password must be at least 8 characters with uppercase, lowercase, number, and special character" },
        { status: 400 }
      );
    }

    console.log("✅ Password valid, creating user...");
    const user = await createUser(name, email, password);
    console.log("✅ User created successfully:", user);

    return NextResponse.json(
      { message: "User created successfully", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Signup error:", error);
    
    if (error instanceof Error && error.message === "User already exists") {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    if (error instanceof Error) {
      console.error("Error details:", error.message);
      return NextResponse.json(
        { error: error.message || "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
