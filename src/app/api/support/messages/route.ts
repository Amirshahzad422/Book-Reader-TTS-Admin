import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// GET - Fetch messages for a specific ticket
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");

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

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST - Send a message to a ticket
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ticketId, message } = body;

    // Validation
    if (!ticketId || !message) {
      return NextResponse.json(
        { error: "Ticket ID and message are required" },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: "Message must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Verify ticket belongs to user and is open
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, status")
      .eq("id", ticketId)
      .eq("user_id", session.user.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found or unauthorized" },
        { status: 404 }
      );
    }

    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "Cannot send messages to closed tickets" },
        { status: 400 }
      );
    }

    // Create message
    const { data: newMessage, error: messageError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: session.user.id,
        sender_type: "user",
        message,
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Update ticket's updated_at timestamp
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
