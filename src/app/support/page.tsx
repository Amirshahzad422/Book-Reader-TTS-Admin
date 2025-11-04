"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { FaArrowLeft, FaPaperPlane, FaCheck } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useSupportRealtime } from "@/hooks/useSupportRealtime";
import {
  SupportTicket,
  SupportMessage,
  SUPPORT_SUBJECTS,
  TicketWithMessages,
} from "@/types/support";

export default function SupportPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [subject, setSubject] = useState(SUPPORT_SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tickets, setTickets] = useState<TicketWithMessages[]>([]);
  const [openTickets, setOpenTickets] = useState<TicketWithMessages[]>([]);
  const [closedTickets, setClosedTickets] = useState<TicketWithMessages[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<{
    [key: string]: SupportMessage[];
  }>({});
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch tickets
  const fetchTickets = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch("/api/support/tickets");
      const data = await response.json();

      if (response.ok) {
        setTickets(data.tickets);
        setOpenTickets(
          data.tickets.filter((t: SupportTicket) => t.status === "open")
        );
        setClosedTickets(
          data.tickets.filter((t: SupportTicket) => t.status === "closed")
        );
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a ticket
  const fetchMessages = async (ticketId: string) => {
    try {
      const response = await fetch(
        `/api/support/messages?ticketId=${ticketId}`
      );
      const data = await response.json();

      if (response.ok) {
        setTicketMessages((prev) => ({ ...prev, [ticketId]: data.messages }));

        // Mark messages as read
        await fetch("/api/support/messages/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId }),
        });
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Handle new message from realtime
  const handleNewMessage = (newMsg: SupportMessage) => {
    setTicketMessages((prev) => {
      const messages = prev[newMsg.ticket_id] || [];
      if (messages.some((m) => m.id === newMsg.id)) return prev;
      return { ...prev, [newMsg.ticket_id]: [...messages, newMsg] };
    });

    if (selectedTicket === newMsg.ticket_id) {
      setTimeout(scrollToBottom, 100);
    }
  };

  // Handle ticket update from realtime
  const handleTicketUpdate = (updatedTicket: SupportTicket) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
    );
    setOpenTickets((prev) =>
      prev
        .map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
        .filter((t) => t.status === "open")
    );
    setClosedTickets((prev) => {
      const filtered = prev.filter((t) => t.id !== updatedTicket.id);
      return updatedTicket.status === "closed"
        ? [...filtered, updatedTicket]
        : filtered;
    });
  };

  // Setup realtime
  useSupportRealtime(
    session?.user?.id || "",
    handleNewMessage,
    handleTicketUpdate
  );

  useEffect(() => {
    if (session?.user?.id) {
      fetchTickets();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (selectedTicket) {
      if (!ticketMessages[selectedTicket]) {
        fetchMessages(selectedTicket);
      }
      setTimeout(scrollToBottom, 100);
    }
  }, [selectedTicket]);

  // Submit new ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      router.push("/?auth=login");
      return;
    }

    if (!message.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("");
        await fetchTickets();
        setSelectedTicket(data.ticket.id);
      } else {
        alert(data.error || "Failed to create ticket");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Error creating ticket: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send message to ticket
  const handleSendMessage = async (ticketId: string) => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);

    try {
      const response = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message: newMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewMessage("");
        setTicketMessages((prev) => ({
          ...prev,
          [ticketId]: [...(prev[ticketId] || []), data.message],
        }));
        setTimeout(scrollToBottom, 100);
      } else {
        alert(data.error || "Failed to send message");
      }
    } catch (error) {
      alert("Error sending message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  const faqs = [
    {
      category: "Account Management",
      questions: [
        {
          q: "How do I reset my password?",
          a: "You can reset your password by clicking the 'Forgot Password' link on the login page. We'll send you a reset link to your email.",
        },
        {
          q: "Can I change my email address?",
          a: "Yes, you can change your email address in your account settings. Please note that you'll need to verify the new email address.",
        },
      ],
    },
    {
      category: "File Conversion",
      questions: [
        {
          q: "What file formats are supported?",
          a: "We currently support PDF files. The maximum file size depends on your plan: 5 MB for Starter and 30 MB for Professional.",
        },
        {
          q: "How long does conversion take?",
          a: "Most conversions complete within 1-3 minutes depending on file size. Professional users get priority processing for faster results.",
        },
      ],
    },
    {
      category: "Troubleshooting",
      questions: [
        {
          q: "My conversion failed. What should I do?",
          a: "First, check that your file size is within your plan limits and the PDF isn't password-protected. If issues persist, contact our support team.",
        },
        {
          q: "The audio quality is poor. How can I improve it?",
          a: "Professional users have access to premium audio quality settings. You can also try adjusting voice speed and pitch in the advanced settings.",
        },
      ],
    },
    {
      category: "Billing",
      questions: [
        {
          q: "How do I upgrade my plan?",
          a: "Visit the Pricing page and click 'Upgrade Now' on the Professional plan. You'll be redirected to complete payment via Gumroad.",
        },
        {
          q: "Can I get a refund?",
          a: "We offer refunds within 14 days of purchase if you haven't used more than 10 conversions. Contact support for refund requests.",
        },
      ],
    },
  ];

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            Please log in to access support
          </h2>
          <Button onClick={() => router.push("/?auth=login")}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-8 hover:bg-accent"
        >
          <FaArrowLeft className="mr-2" />
          Back to Home
        </Button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Support Center
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We&apos;re here to help! Submit a ticket or browse our FAQ
          </p>
        </div>

        {/* Contact Form */}
        <div className="mb-12">
          <div className="rounded-2xl border-2 border-border p-8 bg-card">
            <h2 className="text-2xl font-bold mb-6">Contact Support</h2>

            <form onSubmit={handleSubmitTicket} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {SUPPORT_SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  placeholder="Describe your issue..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <div className="text-right text-sm text-muted-foreground mt-1">
                  {message.length}/500
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
              >
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </Button>
            </form>
          </div>
        </div>

        {/* Open Chats */}
        {openTickets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Open Tickets</h2>
            <div className="space-y-4">
              {openTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border-2 border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setSelectedTicket(
                        selectedTicket === ticket.id ? null : ticket.id
                      )
                    }
                    className="w-full p-6 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {ticket.subject}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Created {new Date(ticket.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500">
                          Open
                        </span>
                      </div>
                    </div>
                  </button>

                  {selectedTicket === ticket.id && (
                    <div className="border-t border-border p-6">
                      <div className="mb-4 max-h-96 overflow-y-auto space-y-4">
                        {ticketMessages[ticket.id]?.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender_type === "user"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-4 ${
                                msg.sender_type === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-accent"
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              <p className="text-xs opacity-70 mt-2">
                                {new Date(msg.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      <div className="flex gap-2">
                        <textarea
                          value={newMessage}
                          onChange={(e) =>
                            setNewMessage(e.target.value.slice(0, 500))
                          }
                          placeholder="Type your message..."
                          rows={2}
                          className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                        <Button
                          onClick={() => handleSendMessage(ticket.id)}
                          disabled={sendingMessage || !newMessage.trim()}
                          className="px-6"
                        >
                          <FaPaperPlane />
                        </Button>
                      </div>
                      <div className="text-right text-xs text-muted-foreground mt-1">
                        {newMessage.length}/500
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Closed Chats */}
        {closedTickets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Closed Tickets</h2>
            <div className="space-y-4">
              {closedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border-2 border-border bg-card overflow-hidden opacity-75"
                >
                  <button
                    onClick={() =>
                      setSelectedTicket(
                        selectedTicket === ticket.id ? null : ticket.id
                      )
                    }
                    className="w-full p-6 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {ticket.subject}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Closed {new Date(ticket.closed_at!).toLocaleString()}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                        Closed
                      </span>
                    </div>
                  </button>

                  {selectedTicket === ticket.id && (
                    <div className="border-t border-border p-6">
                      <div className="max-h-96 overflow-y-auto space-y-4">
                        {ticketMessages[ticket.id]?.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender_type === "user"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-4 ${
                                msg.sender_type === "user"
                                  ? "bg-primary/50 text-foreground"
                                  : "bg-accent"
                              }`}
                            >
                              <p className="text-sm">{msg.message}</p>
                              <p className="text-xs opacity-70 mt-2">
                                {new Date(msg.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        This ticket is closed. Please create a new ticket if you
                        need further assistance.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((category, catIdx) => (
              <div key={catIdx}>
                <h3 className="text-xl font-semibold mb-4 text-primary">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.questions.map((faq, idx) => {
                    const faqId = catIdx * 100 + idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-border bg-card overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setExpandedFAQ(expandedFAQ === faqId ? null : faqId)
                          }
                          className="w-full p-4 text-left hover:bg-accent/50 transition-colors flex justify-between items-center"
                        >
                          <span className="font-medium">{faq.q}</span>
                          <FaCheck
                            className={`transform transition-transform ${
                              expandedFAQ === faqId ? "rotate-90" : ""
                            }`}
                          />
                        </button>
                        {expandedFAQ === faqId && (
                          <div className="px-4 pb-4 text-muted-foreground">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
