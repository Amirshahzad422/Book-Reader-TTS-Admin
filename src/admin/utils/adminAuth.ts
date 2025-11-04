"use client";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const ADMIN_SESSION_KEY = "admin_session";
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

interface AdminSession {
  admin: AdminUser;
  timestamp: number;
}

export const adminAuth = {
  // Store admin session
  setSession(admin: AdminUser): void {
    const session: AdminSession = {
      admin,
      timestamp: Date.now(),
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  },

  // Get current admin session
  getSession(): AdminUser | null {
    try {
      const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionData) return null;

      const session: AdminSession = JSON.parse(sessionData);

      // Check if session has expired
      if (Date.now() - session.timestamp > SESSION_TIMEOUT) {
        this.clearSession();
        return null;
      }

      return session.admin;
    } catch (error) {
      console.error("Error reading admin session:", error);
      return null;
    }
  },

  // Clear admin session (logout)
  clearSession(): void {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  },

  // Check if admin is authenticated
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};
