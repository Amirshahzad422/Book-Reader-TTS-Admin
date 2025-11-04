"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { adminAuth } from "./../utils/adminAuth";
import { X, Send, MessageSquare, User, Calendar, Tag } from "lucide-react";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: "user" | "admin";
  message: string;
  created_at: string;
  read: boolean;
}

interface TicketWithUser extends SupportTicket {
  user_name: string;
  user_email: string;
  unreadCount: number;
  lastMessage?: SupportMessage;
}

interface Filters {
  search: string;
  status: string;
  subject: string;
  dateFrom: string;
  dateTo: string;
  sortBy: "created_at" | "updated_at";
}

const ITEMS_PER_PAGE = 20;
const SUPPORT_SUBJECTS = [
  "Account Issues",
  "Payment & Billing",
  "Technical Problems",
  "Feature Request",
  "Other",
];

export const ManageSupport: React.FC = () => {
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    subject: "all",
    dateFrom: "",
    dateTo: "",
    sortBy: "updated_at",
  });

  const observerTarget = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const adminUser = adminAuth.getSession();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch tickets with filters and pagination
  const fetchTickets = useCallback(
    async (pageNum: number, isNewSearch: boolean = false) => {
      try {
        setLoading(true);

        // Build query
        let query = supabase
        .from("support_tickets")
        .select(
            `
            *,
            users (
            name,
            email
            )
        `,
            { count: "exact" }
        )
          .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

        // Apply status filter
        if (filters.status !== "all") {
          query = query.eq("status", filters.status);
        }

        // Apply subject filter
        if (filters.subject !== "all") {
          query = query.eq("subject", filters.subject);
        }

        // Apply date filters
        if (filters.dateFrom) {
          query = query.gte("created_at", filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte("created_at", filters.dateTo);
        }

        // Sort: open tickets first, then by selected sort field
        query = query.order("status", { ascending: true });
        query = query.order(filters.sortBy, { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          // Process tickets and get unread counts
          const processedTickets = await Promise.all(
            data.map(async (ticket: any) => {
              // Apply search filter (client-side for user name/email)
              if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                  ticket.users?.name?.toLowerCase().includes(searchLower) ||
                  ticket.users?.email?.toLowerCase().includes(searchLower) ||
                  ticket.id.toLowerCase().includes(searchLower);
                if (!matchesSearch) return null;
              }

              // Get unread count for this ticket
              const { count: unreadCount } = await supabase
                .from("support_messages")
                .select("*", { count: "exact", head: true })
                .eq("ticket_id", ticket.id)
                .eq("read", false)
                .neq("sender_type", "admin");

              // Get last message
              const { data: lastMessageData } = await supabase
                .from("support_messages")
                .select("*")
                .eq("ticket_id", ticket.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

              return {
                ...ticket,
                user_name: ticket.users?.name || "Unknown",
                user_email: ticket.users?.email || "Unknown",
                unreadCount: unreadCount || 0,
                lastMessage: lastMessageData,
              };
            })
          );

          // Filter out null values (from search filter)
          const filteredTickets = processedTickets.filter(
            (t) => t !== null
          ) as TicketWithUser[];

          if (isNewSearch) {
            setTickets(filteredTickets);
          } else {
            setTickets((prev) => [...prev, ...filteredTickets]);
          }

          setHasMore(data.length === ITEMS_PER_PAGE);
        }
      } catch (error) {
        console.error(
          "Error fetching tickets:",
          error,
          error.message,
          error.details
        );
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Fetch messages for selected ticket
  const fetchMessages = async (ticketId: string) => {
    try {
      setLoadingMessages(true);

      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark admin messages as read
      await supabase
        .from("support_messages")
        .update({ read: true })
        .eq("ticket_id", ticketId)
        .eq("sender_type", "user");

      // Update unread count in tickets list
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, unreadCount: 0 } : t))
      );

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !adminUser) return;

    try {
      setSendingMessage(true);

      const { data, error } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: selectedTicket,
          sender_id: adminUser.id,
          sender_type: "admin",
          message: newMessage.trim(),
          read: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket updated_at
      await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedTicket);

      setMessages((prev) => [...prev, data]);
      setNewMessage("");
      setTimeout(scrollToBottom, 100);

      // Refresh ticket in list
      const updatedTicket = tickets.find((t) => t.id === selectedTicket);
      if (updatedTicket) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicket
              ? { ...t, updated_at: new Date().toISOString(), lastMessage: data }
              : t
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Toggle ticket status
  const toggleTicketStatus = async (ticketId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "open" ? "closed" : "open";
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "closed") {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = adminUser?.id;
      } else {
        updateData.closed_at = null;
        updateData.closed_by = null;
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;

      // Update local state
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ...updateData } : t))
      );
    } catch (error) {
      console.error("Error toggling ticket status:", error);
      alert("Failed to update ticket status");
    }
  };

  // Initial load and filter changes
    useEffect(() => {
    setPage(0);
    setTickets([]);
    setHasMore(true);
    fetchTickets(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchTickets(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, page, fetchTickets]);

  // Load messages when ticket is selected
  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket);
    }
  }, [selectedTicket]);

  const selectedTicketData = tickets.find((t) => t.id === selectedTicket);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
          <div className="border-b bg-card shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Support Management
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Welcome, {adminUser?.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
      
      {/* Filters */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 hover:border-primary/50 transition-all">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-primary to-purple-600 rounded-full"></span>
            Filters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
            {/* Search */}
            <div className="lg:col-span-2 xl:col-span-1">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Name, Email, or Ticket ID"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Subject
              </label>
              <select
                value={filters.subject}
                onChange={(e) =>
                  setFilters({ ...filters, subject: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              >
                <option value="all">All Subjects</option>
                {SUPPORT_SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sortBy: e.target.value as "created_at" | "updated_at",
                  })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              >
                <option value="updated_at">Last Updated</option>
                <option value="created_at">Creation Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets List & Chat View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border-2 border-border shadow-xl overflow-hidden">
              <div className="bg-accent/50 border-b-2 border-border px-6 py-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Support Tickets ({tickets.length})
                </h3>
              </div>

              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket.id)}
                    className={`p-4 border-b border-border cursor-pointer transition-all hover:bg-accent/30 ${
                      selectedTicket === ticket.id ? "bg-accent/50" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {ticket.user_name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {ticket.user_email}
                        </p>
                      </div>
                      {ticket.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {ticket.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        {ticket.subject}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          ticket.status === "open"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {ticket.status}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {ticket.lastMessage && (
                      <p className="text-xs text-muted-foreground mt-2 truncate">
                        {ticket.lastMessage.sender_type === "admin"
                          ? "You: "
                          : ""}
                        {ticket.lastMessage.message}
                      </p>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="text-center py-8">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                  </div>
                )}

                {/* Infinite scroll trigger */}
                <div ref={observerTarget} className="h-4" />

                {/* No more results */}
                {!loading && !hasMore && tickets.length > 0 && (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    No more tickets
                  </div>
                )}

                {/* No results */}
                {!loading && tickets.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No tickets found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat View */}
          <div className="lg:col-span-2">
            {selectedTicket && selectedTicketData ? (
              <div className="bg-card rounded-2xl border-2 border-border shadow-xl overflow-hidden flex flex-col h-[calc(100vh-300px)]">
                {/* Chat Header */}
                <div className="bg-accent/50 border-b-2 border-border px-6 py-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {selectedTicketData.user_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedTicketData.subject}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        toggleTicketStatus(
                          selectedTicket,
                          selectedTicketData.status
                        )
                      }
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        selectedTicketData.status === "open"
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      }`}
                    >
                      {selectedTicketData.status === "open"
                        ? "Close Ticket"
                        : "Reopen Ticket"}
                    </button>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {loadingMessages ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_type === "admin"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                              message.sender_type === "admin"
                                ? "bg-primary text-white"
                                : "bg-accent text-foreground"
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.sender_type === "admin"
                                  ? "text-white/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t-2 border-border p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      disabled={sendingMessage}
                      className="flex-1 px-4 py-3 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border-2 border-border shadow-xl h-[calc(100vh-300px)] flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-semibold text-foreground">
                    Select a ticket to view conversation
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Choose a ticket from the list to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};