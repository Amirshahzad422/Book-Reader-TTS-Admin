// types/support.ts

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: "user" | "admin";
  message: string;
  created_at: string;
  read: boolean;
}

export interface TicketWithMessages extends SupportTicket {
  messages?: SupportMessage[];
  unreadCount?: number;
}

export const SUPPORT_SUBJECTS = [
  "Account Issues",
  "Payment & Billing",
  "Technical Problems",
  "Feature Request",
  "Other",
] as const;

export type SupportSubject = (typeof SUPPORT_SUBJECTS)[number];
