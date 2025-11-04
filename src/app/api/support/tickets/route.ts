import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// GET - Fetch all tickets for the logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

// POST - Create a new ticket
export async function POST(req: NextRequest) {
  console.log("🔵 POST /api/support/tickets - START");

  try {
    console.log("🔵 Getting session...");
    const session = await getServerSession(authOptions);
    console.log("🔵 Session result:", {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    });

    if (!session?.user?.id) {
      console.log("❌ No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔵 Parsing request body...");
    const body = await req.json();
    console.log("🔵 Request body:", body);

    const { subject, message } = body;

    console.log("🔵 Validating input...");
    if (!subject || !message) {
      console.log("❌ Missing subject or message");
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    console.log("🔵 Checking rate limit...");
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTickets, error: checkError } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("user_id", session.user.id)
      .gte("created_at", fiveMinutesAgo);

    console.log("🔵 Rate limit check:", {
      recentCount: recentTickets?.length,
      checkError,
    });

    if (checkError) {
      console.error("❌ Rate limit check error:", checkError);
      throw checkError;
    }

    if (recentTickets && recentTickets.length > 0) {
      console.log("❌ Rate limited");
      return NextResponse.json(
        { error: "Please wait 5 minutes before creating another ticket" },
        { status: 429 }
      );
    }

    console.log("🔵 Creating ticket...");
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: session.user.id,
        subject,
        status: "open",
      })
      .select()
      .single();

    console.log("🔵 Ticket created:", { ticketId: ticket?.id, ticketError });

    if (ticketError) {
      console.error("❌ Ticket creation error:", ticketError);
      throw ticketError;
    }

    console.log("🔵 Creating first message...");
    const { error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: session.user.id,
        sender_type: "user",
        message,
      });

    console.log("🔵 Message created:", { messageError });

    if (messageError) {
      console.error("❌ Message creation error:", messageError);
      throw messageError;
    }

    console.log("✅ POST /api/support/tickets - SUCCESS");
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error: any) {
    console.error("❌ POST /api/support/tickets - ERROR:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to create ticket" },
      { status: 500 }
    );
  }
}