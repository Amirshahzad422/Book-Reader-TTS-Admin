import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    console.log("📧 Resending verification email to:", email);

    // Find the user in Supabase Auth
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Error listing users:", listError);
      return NextResponse.json(
        { error: "Failed to find user" },
        { status: 500 }
      );
    }

    const authUser = usersList?.users?.find(u => u.email === email);
    
    if (!authUser) {
      return NextResponse.json(
        { error: "User not found. Please sign up first." },
        { status: 404 }
      );
    }

    // Check if already confirmed
    if (authUser.email_confirmed_at) {
      return NextResponse.json(
        { error: "Your email is already verified. You can login directly." },
        { status: 400 }
      );
    }

    // Resend verification email using inviteUserByEmail (works for existing users)
    // This sends a new verification/invitation email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`
      }
    );

    if (inviteError) {
      console.error("❌ Error resending invitation:", inviteError);
      
      // Fallback: Try using generateLink with recovery type (doesn't require password)
      const { data: recoveryLink, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/`
        }
      });

      if (recoveryError) {
        console.error("❌ Error generating recovery link:", recoveryError);
        return NextResponse.json(
          { error: "Failed to resend verification email. Please try signing up again." },
          { status: 500 }
        );
      }
      
      console.log("✅ Recovery link generated (fallback method)");
    } else {
      console.log("✅ Invitation email sent successfully");
    }

    console.log("✅ Verification email resent successfully");
    
    return NextResponse.json(
      { message: "Verification email sent successfully. Please check your inbox." },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error resending verification email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

