import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // First fetch current conversions
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("conversions")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

    // Decrement conversions by 1
    const { error } = await supabase
      .from("users")
      .update({
        conversions: Math.max(0, (user?.conversions || 0) - 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error decrementing conversions:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
