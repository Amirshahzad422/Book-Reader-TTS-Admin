import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// POST - Mark all messages in a ticket as read
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ticketId } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    // Verify ticket belongs to user
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("id", ticketId)
      .eq("user_id", session.user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found or unauthorized" },
        { status: 404 }
      );
    }

    // Mark all admin messages as read
    const { error: updateError } = await supabase
      .from("support_messages")
      .update({ read: true })
      .eq("ticket_id", ticketId)
      .eq("sender_type", "admin")
      .eq("read", false);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}
