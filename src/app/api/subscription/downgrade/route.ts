import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      );
    }

    const { data: user, error: findError } = (await supabaseAdmin
      .from("users")
      .select("subscription_id")
      .eq("email", session.user.email)
      .single()) as {
      data: { subscription_id: string | null } | null;
      error: any;
    };

    if (findError) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: updateError } = (await supabaseAdmin
      .from("users")
      .update({
        subscription_plan: "free",
        updated_at: new Date().toISOString(),
      } as any)
      .eq("email", session.user.email)) as { error: any };

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to downgrade" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriptionId: user?.subscription_id,
    });
  } catch (error) {
    console.error("Downgrade error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
