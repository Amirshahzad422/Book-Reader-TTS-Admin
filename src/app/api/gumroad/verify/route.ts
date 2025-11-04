import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { User } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");
    const sale_id = searchParams.get("sale_id");
    const product_permalink = searchParams.get("product_permalink");

    if (!email || !sale_id) {
      return NextResponse.redirect(new URL("/?payment=failed", request.url));
    }

    // Only handle our professional membership
    if (product_permalink !== "professional") {
      return NextResponse.redirect(new URL("/?payment=invalid", request.url));
    }

    if (!supabaseAdmin) {
      console.error("Supabase admin client not initialized");
      return NextResponse.redirect(new URL("/?payment=error", request.url));
    }

    // Find user by email
    const { data: user, error: findError } = (await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single()) as { data: User | null; error: any };

    if (findError || !user) {
      console.error("User not found:", email);
      return NextResponse.redirect(
        new URL("/?payment=user_not_found", request.url)
      );
    }

    // Calculate expiry date (30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    // Update user subscription
    const { error: updateError } = (await supabaseAdmin
      .from("users")
      .update({
        subscription_plan: "paid",
        subscription_id: sale_id,
        expiry_date: expiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", user.id)) as { error: any };

    if (updateError) {
      console.error("Failed to update user:", updateError);
      return NextResponse.redirect(
        new URL("/?payment=update_failed", request.url)
      );
    }

    console.log(`✅ Subscription activated for ${email}`);
    return NextResponse.redirect(new URL("/?payment=success", request.url));
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.redirect(new URL("/?payment=error", request.url));
  }
}
