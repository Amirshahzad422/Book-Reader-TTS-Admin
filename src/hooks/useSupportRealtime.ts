import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useSupportRealtime(
  userId: string,
  onNewMessage: (message: any) => void,
  onTicketUpdate: (ticket: any) => void
) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) return;

    // Create a channel for real-time updates
    const channel = supabase.channel("support_realtime");

    // Subscribe to new messages
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        (payload) => {
          onNewMessage(payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
        },
        (payload) => {
          onTicketUpdate(payload.new);
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, onNewMessage, onTicketUpdate]);
}
