import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { User } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.sale) {
      const { email, subscription_id, product_permalink } = body;

      if (product_permalink !== "professional") {
        return NextResponse.json(
          { message: "Not our product" },
          { status: 200 }
        );
      }

      if (!supabaseAdmin) {
        console.error("Supabase admin client not initialized");
        return NextResponse.json(
          { error: "Database configuration error" },
          { status: 500 }
        );
      }

      const { data: user, error: findError } = (await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", email)
        .single()) as { data: User | null; error: any };

      if (findError || !user) {
        console.error("User not found:", email);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const { error: updateError } = (await supabaseAdmin
        .from("users")
        .update({
          subscription_plan: "paid",
          subscription_id: subscription_id,
          conversions: 50,
          expiry_date: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id)) as { error: any };

      if (updateError) {
        console.error("Failed to update user:", updateError);
        return NextResponse.json(
          { error: "Failed to update subscription" },
          { status: 500 }
        );
      }

      console.log(`✅ Subscription activated for ${email}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ message: "Event ignored" }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
