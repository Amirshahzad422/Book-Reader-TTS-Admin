"use client";

import React, { useState } from "react";
import { AdminLogin } from "./components/adminLogin";
import { ManageUsers } from "./components/ManageUsers";
import { ManageConversions } from "./components/ManageConversions";
import { ManageSupport } from "./components/ManageSupport";
import { adminAuth } from "./utils/adminAuth";
import { Users, FileAudio, MessageSquare, LogOut } from "lucide-react";

export const AdminApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    adminAuth.isAuthenticated()
  );
  const [activeTab, setActiveTab] = useState<
    "users" | "conversions" | "support"
  >("users");

  const handleLogout = () => {
    adminAuth.logout();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* App Name */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                AI PDF-to-Audio Platform
              </h1>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "users"
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </button>
              <button
                onClick={() => setActiveTab("conversions")}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "conversions"
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FileAudio className="w-4 h-4 mr-2" />
                Manage Conversions
              </button>
              <button
                onClick={() => setActiveTab("support")}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "support"
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Support
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 ml-4 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "users" && <ManageUsers />}
        {activeTab === "conversions" && <ManageConversions />}
        {activeTab === "support" && <ManageSupport />}
      </div>
    </div>
  );
};
