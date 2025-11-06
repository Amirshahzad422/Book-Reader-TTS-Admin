"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { adminAuth } from "./../utils/adminAuth";
import {
  X,
  Send,
  MessageSquare,
  User,
  Calendar,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  AlertCircle,
  TrendingUp,
  BarChart3,
  LineChart,
  MessageCircle,
  Timer,
  Users,
} from "lucide-react";

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

interface User {
  id: string;
  name: string;
  email: string;
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

const SUPPORT_SUBJECTS = [
  "Account Issues",
  "Payment & Billing",
  "Technical Problems",
  "Feature Request",
  "Other",
];

export const ManageSupport: React.FC = () => {
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [allMessages, setAllMessages] = useState<SupportMessage[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    subject: "all",
    dateFrom: "",
    dateTo: "",
    sortBy: "updated_at",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const adminUser = adminAuth.getSession();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch all data independently
  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch all tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError);
        setAllTickets([]);
      } else {
        setAllTickets(ticketsData || []);
      }

      // Fetch all messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("support_messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        setAllMessages([]);
      } else {
        setAllMessages(messagesData || []);
      }

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, email");

      if (usersError) {
        console.error("Error fetching users:", usersError);
        setAllUsers([]);
      } else {
        setAllUsers(usersData || []);
      }
    } catch (error) {
      console.error("Error in fetchAllData:", error);
      setAllTickets([]);
      setAllMessages([]);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Process and filter tickets based on filters
  const processTickets = () => {
    if (!allTickets.length) {
      setFilteredTickets([]);
      return;
    }

    let processed = allTickets.map((ticket) => {
      // Find user
      const user = allUsers.find((u) => u.id === ticket.user_id);

      // Get messages for this ticket
      const messages = allMessages.filter((m) => m.ticket_id === ticket.id);

      // Calculate unread count (messages from user that are unread)
      const unreadCount = messages.filter(
        (m) => m.sender_type === "user" && !m.read
      ).length;

      // Get last message
      const lastMessage =
        messages.length > 0 ? messages[messages.length - 1] : undefined;

      return {
        ...ticket,
        user_name: user?.name || "Unknown",
        user_email: user?.email || "Unknown",
        unreadCount,
        lastMessage,
      };
    });

    // Apply status filter
    if (filters.status !== "all") {
      processed = processed.filter((t) => t.status === filters.status);
    }

    // Apply subject filter
    if (filters.subject !== "all") {
      processed = processed.filter((t) => t.subject === filters.subject);
    }

    // Apply date filters
    if (filters.dateFrom) {
      processed = processed.filter(
        (t) => new Date(t.created_at) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      processed = processed.filter((t) => new Date(t.created_at) <= endDate);
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      processed = processed.filter(
        (t) =>
          t.user_name.toLowerCase().includes(searchLower) ||
          t.user_email.toLowerCase().includes(searchLower) ||
          t.id.toLowerCase().includes(searchLower)
      );
    }

    // Sort tickets
    processed.sort((a, b) => {
      // First sort by status (open first)
      if (a.status !== b.status) {
        return a.status === "open" ? -1 : 1;
      }

      // Then by selected sort field
      const dateA = new Date(a[filters.sortBy]).getTime();
      const dateB = new Date(b[filters.sortBy]).getTime();
      return dateB - dateA;
    });

    setFilteredTickets(processed);
  };

  // Update ticket messages when selected ticket changes
  useEffect(() => {
    if (selectedTicket && allMessages.length > 0) {
      const messages = allMessages.filter(
        (m) => m.ticket_id === selectedTicket
      );
      setTicketMessages(messages);

      // Mark messages as read
      markMessagesAsRead(selectedTicket);

      setTimeout(scrollToBottom, 100);
    } else {
      setTicketMessages([]);
    }
  }, [selectedTicket, allMessages]);

  // Mark messages as read
  const markMessagesAsRead = async (ticketId: string) => {
    try {
      await supabase
        .from("support_messages")
        .update({ read: true })
        .eq("ticket_id", ticketId)
        .eq("sender_type", "user")
        .eq("read", false);

      // Update local state
      setAllMessages((prev) =>
        prev.map((m) =>
          m.ticket_id === ticketId && m.sender_type === "user"
            ? { ...m, read: true }
            : m
        )
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
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
      const { error: updateError } = await supabase
        .from("support_tickets")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedTicket);

      if (updateError) {
        console.error("Error updating ticket:", updateError);
      }

      // Update local messages state
      setAllMessages((prev) => [...prev, data]);

      // Update local tickets state
      setAllTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket
            ? { ...t, updated_at: new Date().toISOString() }
            : t
        )
      );

      setNewMessage("");
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Toggle ticket status
  const toggleTicketStatus = async (
    ticketId: string,
    currentStatus: string
  ) => {
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
      setAllTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ...updateData } : t))
      );
    } catch (error) {
      console.error("Error toggling ticket status:", error);
      alert("Failed to update ticket status");
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, []);

  // Process tickets whenever data or filters change
  useEffect(() => {
    processTickets();
  }, [allTickets, allMessages, allUsers, filters]);

  const selectedTicketData = filteredTickets.find(
    (t) => t.id === selectedTicket
  );

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

      {/* Stats Dashboard */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-0">
        {/* Row 1 - Overall Ticket Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          {/* Total Tickets */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl border-2 border-blue-500/20 p-6 hover:border-blue-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Total Tickets
              </h3>
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="text-blue-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {filteredTickets.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Based on current filters
            </p>
          </div>

          {/* Open Tickets */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-2xl border-2 border-green-500/20 p-6 hover:border-green-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Open Tickets
              </h3>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="text-green-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {filteredTickets.filter((t) => t.status === "open").length}
            </p>
            <p className="text-xs text-muted-foreground">
              {filteredTickets.length > 0
                ? (
                    (filteredTickets.filter((t) => t.status === "open").length /
                      filteredTickets.length) *
                    100
                  ).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

          {/* Closed Tickets */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl border-2 border-purple-500/20 p-6 hover:border-purple-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Closed Tickets
              </h3>
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="text-purple-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {filteredTickets.filter((t) => t.status === "closed").length}
            </p>
            <p className="text-xs text-muted-foreground">
              {filteredTickets.length > 0
                ? (
                    (filteredTickets.filter((t) => t.status === "closed")
                      .length /
                      filteredTickets.length) *
                    100
                  ).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

          {/* Average Resolution Time */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-2xl border-2 border-orange-500/20 p-6 hover:border-orange-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Avg Resolution
              </h3>
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Clock className="text-orange-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {(() => {
                const closedTickets = filteredTickets.filter(
                  (t) => t.status === "closed" && t.closed_at
                );
                if (closedTickets.length === 0) return "N/A";

                const totalTime = closedTickets.reduce((sum, t) => {
                  const created = new Date(t.created_at).getTime();
                  const closed = new Date(t.closed_at!).getTime();
                  return sum + (closed - created);
                }, 0);

                const avgMs = totalTime / closedTickets.length;
                const hours = avgMs / (1000 * 60 * 60);

                if (hours < 24) {
                  return `${hours.toFixed(1)}h`;
                } else {
                  const days = hours / 24;
                  return `${days.toFixed(1)}d`;
                }
              })()}
            </p>
            <p className="text-xs text-muted-foreground">Time to close</p>
          </div>
        </div>

        {/* Row 2 - Status & Activity Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {/* Unread Messages */}
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-2xl border-2 border-red-500/20 p-6 hover:border-red-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Unread Messages
              </h3>
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Mail className="text-red-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {filteredTickets.reduce((sum, t) => sum + t.unreadCount, 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              Across {filteredTickets.filter((t) => t.unreadCount > 0).length}{" "}
              tickets
            </p>
          </div>

          {/* Pending Response */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-2xl border-2 border-yellow-500/20 p-6 hover:border-yellow-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Pending Response
              </h3>
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="text-yellow-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {
                filteredTickets.filter(
                  (t) => t.lastMessage && t.lastMessage.sender_type === "user"
                ).length
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Last message from user
            </p>
          </div>

          {/* Most Active Ticket */}
          <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 rounded-2xl border-2 border-indigo-500/20 p-6 hover:border-indigo-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Most Active
              </h3>
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-indigo-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {(() => {
                const ticketMessageCounts = filteredTickets.map((t) => ({
                  count: allMessages.filter((m) => m.ticket_id === t.id).length,
                }));
                const maxCount = Math.max(
                  ...ticketMessageCounts.map((t) => t.count),
                  0
                );
                return maxCount;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">
              Messages in one ticket
            </p>
          </div>
        </div>

        {/* Row 3 - Time-based Ticket Stats */}
        <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-2xl border-2 border-emerald-500/20 p-6 mb-6 hover:border-emerald-500/40 transition-all">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full"></span>
            New Tickets Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="text-emerald-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {
                    filteredTickets.filter((t) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return new Date(t.created_at) >= today;
                    }).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="text-teal-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {
                    filteredTickets.filter((t) => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(t.created_at) >= weekAgo;
                    }).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <LineChart className="text-cyan-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {
                    filteredTickets.filter((t) => {
                      const monthAgo = new Date();
                      monthAgo.setMonth(monthAgo.getMonth() - 1);
                      return new Date(t.created_at) >= monthAgo;
                    }).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">This Month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 4 - Closed Tickets Stats */}
        <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl border-2 border-purple-500/20 p-6 mb-6 hover:border-purple-500/40 transition-all">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full"></span>
            Closed Tickets Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="text-purple-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {
                    filteredTickets.filter((t) => {
                      if (!t.closed_at) return false;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return new Date(t.closed_at) >= today;
                    }).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">Closed Today</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="text-pink-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {
                    filteredTickets.filter((t) => {
                      if (!t.closed_at) return false;
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(t.closed_at) >= weekAgo;
                    }).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Closed This Week
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-fuchsia-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="text-fuchsia-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {
                    filteredTickets.filter((t) => {
                      if (!t.closed_at) return false;
                      const monthAgo = new Date();
                      monthAgo.setMonth(monthAgo.getMonth() - 1);
                      return new Date(t.closed_at) >= monthAgo;
                    }).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Closed This Month
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 5 - Response & Performance Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Average Messages Per Ticket */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-600/10 rounded-2xl border-2 border-blue-500/20 p-6 hover:border-blue-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Avg Messages
              </h3>
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <MessageCircle className="text-blue-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {filteredTickets.length > 0
                ? (
                    allMessages.filter((m) =>
                      filteredTickets.some((t) => t.id === m.ticket_id)
                    ).length / filteredTickets.length
                  ).toFixed(1)
                : "0"}
            </p>
            <p className="text-xs text-muted-foreground">Per ticket</p>
          </div>

          {/* Average Response Time */}
          <div className="bg-gradient-to-br from-teal-500/10 to-emerald-600/10 rounded-2xl border-2 border-teal-500/20 p-6 hover:border-teal-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Avg Response Time
              </h3>
              <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <Timer className="text-teal-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {(() => {
                let totalResponseTime = 0;
                let responseCount = 0;

                filteredTickets.forEach((ticket) => {
                  const ticketMsgs = allMessages
                    .filter((m) => m.ticket_id === ticket.id)
                    .sort(
                      (a, b) =>
                        new Date(a.created_at).getTime() -
                        new Date(b.created_at).getTime()
                    );

                  for (let i = 0; i < ticketMsgs.length - 1; i++) {
                    if (
                      ticketMsgs[i].sender_type === "user" &&
                      ticketMsgs[i + 1].sender_type === "admin"
                    ) {
                      const userTime = new Date(
                        ticketMsgs[i].created_at
                      ).getTime();
                      const adminTime = new Date(
                        ticketMsgs[i + 1].created_at
                      ).getTime();
                      totalResponseTime += adminTime - userTime;
                      responseCount++;
                    }
                  }
                });

                if (responseCount === 0) return "N/A";

                const avgMs = totalResponseTime / responseCount;
                const hours = avgMs / (1000 * 60 * 60);

                if (hours < 24) {
                  return `${hours.toFixed(1)}h`;
                } else {
                  const days = hours / 24;
                  return `${days.toFixed(1)}d`;
                }
              })()}
            </p>
            <p className="text-xs text-muted-foreground">Admin response time</p>
          </div>
        </div>

        {/* Row 6 - Subject Distribution */}
        <div className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 rounded-2xl border-2 border-violet-500/20 p-6 mb-6 hover:border-violet-500/40 transition-all">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></span>
            Subject Distribution
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUPPORT_SUBJECTS.map((subject) => {
              const count = filteredTickets.filter(
                (t) => t.subject === subject
              ).length;
              const percentage =
                filteredTickets.length > 0
                  ? ((count / filteredTickets.length) * 100).toFixed(1)
                  : 0;
              return (
                <div key={subject} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Tag className="text-violet-600 w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground">
                        {subject}
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {count}
                      </p>
                    </div>
                    <div className="h-2 bg-violet-500/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {percentage}% of total
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 7 - User Engagement Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {/* Total Unique Users */}
          <div className="bg-gradient-to-br from-rose-500/10 to-pink-600/10 rounded-2xl border-2 border-rose-500/20 p-6 hover:border-rose-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Unique Users
              </h3>
              <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center">
                <Users className="text-rose-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {new Set(filteredTickets.map((t) => t.user_id)).size}
            </p>
            <p className="text-xs text-muted-foreground">
              With support tickets
            </p>
          </div>

          {/* Users with Multiple Tickets */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-2xl border-2 border-amber-500/20 p-6 hover:border-amber-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Multiple Tickets
              </h3>
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Users className="text-amber-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {(() => {
                const userTicketCounts = new Map();
                filteredTickets.forEach((t) => {
                  userTicketCounts.set(
                    t.user_id,
                    (userTicketCounts.get(t.user_id) || 0) + 1
                  );
                });
                return Array.from(userTicketCounts.values()).filter(
                  (count) => count > 1
                ).length;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">
              Users with 2+ tickets
            </p>
          </div>

          {/* Most Tickets by User */}
          <div className="bg-gradient-to-br from-lime-500/10 to-green-600/10 rounded-2xl border-2 border-lime-500/20 p-6 hover:border-lime-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Max per User
              </h3>
              <div className="w-10 h-10 bg-lime-500/20 rounded-lg flex items-center justify-center">
                <User className="text-lime-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {(() => {
                const userTicketCounts = new Map();
                filteredTickets.forEach((t) => {
                  userTicketCounts.set(
                    t.user_id,
                    (userTicketCounts.get(t.user_id) || 0) + 1
                  );
                });
                return Math.max(...Array.from(userTicketCounts.values()), 0);
              })()}
            </p>
            <p className="text-xs text-muted-foreground">Most active user</p>
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
                  Support Tickets ({filteredTickets.length})
                </h3>
              </div>

              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No tickets found</p>
                  </div>
                ) : (
                  filteredTickets.map((ticket) => (
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
                  ))
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
                  {ticketMessages.map((message) => (
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
