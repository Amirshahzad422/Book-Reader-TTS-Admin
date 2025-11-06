"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { adminAuth } from "./../utils/adminAuth";
import {
  Users,
  Gift,
  Crown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  BarChart3,
  LineChart,
} from "lucide-react";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: string;
  name: string;
  email: string;
  password: string | null;
  subscription_plan: string;
  subscription_id?: string | null;
  expiry_date: string;
  conversions: number;
  created_at: string;
  updated_at: string;
}

type ExpiryStatus = "active" | "expiring_soon" | "expired";

interface Filters {
  search: string;
  subscriptionPlan: string;
  conversionsMin: string;
  conversionsMax: string;
  expiryStatus: string;
  subscriptionId: string;
}

const ITEMS_PER_PAGE = 20;

export const ManageUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all users for stats
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [filters, setFilters] = useState<Filters>({
    search: "",
    subscriptionPlan: "all",
    conversionsMin: "",
    conversionsMax: "",
    expiryStatus: "all",
    subscriptionId: "",
  });

  const adminUser = adminAuth.getSession();

  // Fetch users with filters and pagination
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch ALL users without pagination
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setAllUsers(data); // Store all users for stats calculation

        // Apply filters to get filtered users
        let filteredData = data;

        // Apply search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredData = filteredData.filter(
            (user) =>
              user.name?.toLowerCase().includes(searchLower) ||
              user.email?.toLowerCase().includes(searchLower) ||
              user.subscription_id?.toLowerCase().includes(searchLower)
          );
        }

        // Apply subscription ID filter
        if (filters.subscriptionId) {
          const subIdLower = filters.subscriptionId.toLowerCase();
          filteredData = filteredData.filter((user) =>
            user.subscription_id?.toLowerCase().includes(subIdLower)
          );
        }

        // Apply subscription plan filter
        if (filters.subscriptionPlan !== "all") {
          filteredData = filteredData.filter(
            (user) => user.subscription_plan === filters.subscriptionPlan
          );
        }

        // Apply conversions filter
        if (filters.conversionsMin) {
          filteredData = filteredData.filter(
            (user) => user.conversions >= parseInt(filters.conversionsMin)
          );
        }
        if (filters.conversionsMax) {
          filteredData = filteredData.filter(
            (user) => user.conversions <= parseInt(filters.conversionsMax)
          );
        }

        // Apply expiry status filter
        if (filters.expiryStatus !== "all") {
          filteredData = filteredData.filter((user) => {
            const status = getExpiryStatus(user.expiry_date);
            return status === filters.expiryStatus;
          });
        }

        setUsers(filteredData);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, []);

  // Re-filter when filters change
  useEffect(() => {
    if (allUsers.length > 0) {
      let filteredData = allUsers;

      // Apply search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(
          (user) =>
            user.name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.subscription_id?.toLowerCase().includes(searchLower)
        );
      }

      // Apply subscription ID filter
      if (filters.subscriptionId) {
        const subIdLower = filters.subscriptionId.toLowerCase();
        filteredData = filteredData.filter((user) =>
          user.subscription_id?.toLowerCase().includes(subIdLower)
        );
      }

      // Apply subscription plan filter
      if (filters.subscriptionPlan !== "all") {
        filteredData = filteredData.filter(
          (user) => user.subscription_plan === filters.subscriptionPlan
        );
      }

      // Apply conversions filter
      if (filters.conversionsMin) {
        filteredData = filteredData.filter(
          (user) => user.conversions >= parseInt(filters.conversionsMin)
        );
      }
      if (filters.conversionsMax) {
        filteredData = filteredData.filter(
          (user) => user.conversions <= parseInt(filters.conversionsMax)
        );
      }

      // Apply expiry status filter
      if (filters.expiryStatus !== "all") {
        filteredData = filteredData.filter((user) => {
          const status = getExpiryStatus(user.expiry_date);
          return status === filters.expiryStatus;
        });
      }

      setUsers(filteredData);
    }
  }, [filters, allUsers]);

  // Get expiry status
  const getExpiryStatus = (expiryDate: string): ExpiryStatus => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) return "expired";
    if (daysUntilExpiry <= 7) return "expiring_soon";
    return "active";
  };

  // Get expiry status badge
  const getExpiryBadge = (expiryDate: string) => {
    const status = getExpiryStatus(expiryDate);
    const badges = {
      active: "bg-green-100 text-green-800",
      expiring_soon: "bg-yellow-100 text-yellow-800",
      expired: "bg-red-100 text-red-800",
    };

    const labels = {
      active: "Active",
      expiring_soon: "Expiring Soon",
      expired: "Expired",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  // Calculate stats based on filtered users
  const calculateStats = () => {
    const total = users.length;
    const freeUsers = users.filter(
      (u) => u.subscription_plan === "free"
    ).length;
    const paidUsers = users.filter(
      (u) => u.subscription_plan === "paid"
    ).length;

    const active = users.filter(
      (u) => getExpiryStatus(u.expiry_date) === "active"
    ).length;
    const expiringSoon = users.filter(
      (u) => getExpiryStatus(u.expiry_date) === "expiring_soon"
    ).length;
    const expired = users.filter(
      (u) => getExpiryStatus(u.expiry_date) === "expired"
    ).length;

    // Time-based stats
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59
    );

    const newToday = users.filter(
      (u) => new Date(u.created_at) >= todayStart
    ).length;
    const newThisWeek = users.filter(
      (u) => new Date(u.created_at) >= weekStart
    ).length;
    const newThisMonth = users.filter(
      (u) => new Date(u.created_at) >= monthStart
    ).length;
    const newLastMonth = users.filter(
      (u) =>
        new Date(u.created_at) >= lastMonthStart &&
        new Date(u.created_at) <= lastMonthEnd
    ).length;

    // Calculate percentage change
    const monthlyGrowth =
      newLastMonth > 0
        ? (((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1)
        : newThisMonth > 0
        ? "100"
        : "0";

    return {
      total,
      freeUsers,
      paidUsers,
      active,
      expiringSoon,
      expired,
      newToday,
      newThisWeek,
      newThisMonth,
      monthlyGrowth: parseFloat(monthlyGrowth),
    };
  };

  const stats = calculateStats();

  // Handle edit
  const handleEdit = (user: User) => {
    setEditingUser(user.id);
    setEditForm(user);
  };

  // Handle save
  const handleSave = async (userId: string) => {
    try {
      const allowedFields = [
        "name",
        "email",
        "subscription_plan",
        "subscription_id",
        "expiry_date",
        "conversions",
        "password",
      ];
      const updateData = Object.keys(editForm)
        .filter((key) => allowedFields.includes(key))
        .reduce(
          (obj, key) => ({ ...obj, [key]: editForm[key as keyof User] }),
          {}
        );

      const { error } = await supabase
        .from("users")
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      setUsers(
        users.map((u) =>
          u.id === userId ? ({ ...u, ...updateData } as User) : u
        )
      );
      setEditingUser(null);
      setEditForm({});
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
    }
  };

  // Handle delete
  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const { error } = await supabase.from("users").delete().eq("id", userId);

      if (error) throw error;

      setUsers(users.filter((u) => u.id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Welcome, {adminUser?.name}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-0">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Users */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl border-2 border-blue-500/20 p-6 hover:border-blue-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Total Users
              </h3>
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {stats.total}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.newThisMonth} new users this month
            </p>
          </div>

          {/* Free Users */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-2xl border-2 border-green-500/20 p-6 hover:border-green-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Free Plan
              </h3>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Gift className="text-green-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {stats.freeUsers}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0
                ? ((stats.freeUsers / stats.total) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

          {/* Paid Users */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl border-2 border-purple-500/20 p-6 hover:border-purple-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Paid Plan
              </h3>
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Crown className="text-purple-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {stats.paidUsers}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0
                ? ((stats.paidUsers / stats.total) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

          {/* Monthly Growth */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-2xl border-2 border-orange-500/20 p-6 hover:border-orange-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Monthly Growth
              </h3>
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-orange-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {stats.monthlyGrowth > 0 ? "+" : ""}
              {stats.monthlyGrowth}%
            </p>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </div>
        </div>

        {/* Subscription Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Active Subscriptions */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-2xl border-2 border-emerald-500/20 p-6 hover:border-emerald-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Active
              </h3>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="text-emarald-600 w-4 h-4" />
                HEALTHY
              </span>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {stats.active}
            </p>
            <div className="h-2 bg-emerald-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                style={{
                  width:
                    stats.total > 0
                      ? `${(stats.active / stats.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.total > 0
                ? ((stats.active / stats.total) * 100).toFixed(1)
                : 0}
              % of users
            </p>
          </div>

          {/* Expiring Soon */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-2xl border-2 border-yellow-500/20 p-6 hover:border-yellow-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Expiring Soon
              </h3>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-600 rounded-full text-xs font-bold flex items-center gap-1">
                <AlertTriangle className="text-yellow-600 w-4 h-4" /> WARNING
              </span>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {stats.expiringSoon}
            </p>
            <div className="h-2 bg-yellow-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-500"
                style={{
                  width:
                    stats.total > 0
                      ? `${(stats.expiringSoon / stats.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Within 7 days</p>
          </div>

          {/* Expired */}
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-2xl border-2 border-red-500/20 p-6 hover:border-red-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Expired
              </h3>
              <span className="px-3 py-1 bg-red-500/20 text-red-600 rounded-full text-xs font-bold">
                ✗ INACTIVE
              </span>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {stats.expired}
            </p>
            <div className="h-2 bg-red-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                style={{
                  width:
                    stats.total > 0
                      ? `${(stats.expired / stats.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Needs attention
            </p>
          </div>
        </div>

        {/* Time-based Stats */}
        <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl border-2 border-indigo-500/20 p-6 mb-6 sm:mb-8 hover:border-indigo-500/40 transition-all">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></span>
            New Users Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="text-indigo-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.newToday}
                </p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="text-purple-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.newThisWeek}
                </p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <LineChart className="text-pink-600 w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.newThisMonth}
                </p>
                <p className="text-sm text-muted-foreground">This Month</p>
              </div>
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
                placeholder="Name, Email, or Subscription Id"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Subscription Plan */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Subscription Plan
              </label>
              <select
                value={filters.subscriptionPlan}
                onChange={(e) =>
                  setFilters({ ...filters, subscriptionPlan: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {/* Conversions Min */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Min Conversions
              </label>
              <input
                type="number"
                placeholder="0"
                value={filters.conversionsMin}
                onChange={(e) =>
                  setFilters({ ...filters, conversionsMin: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Conversions Max */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Max Conversions
              </label>
              <input
                type="number"
                placeholder="∞"
                value={filters.conversionsMax}
                onChange={(e) =>
                  setFilters({ ...filters, conversionsMax: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Expiry Status */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Expiry Status
              </label>
              <select
                value={filters.expiryStatus}
                onChange={(e) =>
                  setFilters({ ...filters, expiryStatus: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Subscription ID */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Subscription ID
              </label>
              <input
                type="text"
                placeholder="Search by ID"
                value={filters.subscriptionId}
                onChange={(e) =>
                  setFilters({ ...filters, subscriptionId: e.target.value })
                }
                className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card rounded-2xl border-2 border-border shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent/50 border-b-2 border-border">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Subscription ID
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Conversions
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-accent/30 transition-colors"
                  >
                    {editingUser === user.id ? (
                      // Edit Mode
                      <>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editForm.name || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            className="w-full px-3 py-2 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary outline-none text-foreground"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <input
                            type="email"
                            value={editForm.email || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary outline-none text-foreground"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <select
                            value={editForm.subscription_plan || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                subscription_plan: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary outline-none text-foreground"
                          >
                            <option value="free">Free</option>
                            <option value="paid">Paid</option>
                          </select>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editForm.subscription_id || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                subscription_id: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary outline-none text-foreground"
                            placeholder="Subscription ID"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={editForm.conversions || 0}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                conversions: parseInt(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary outline-none text-foreground"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <input
                            type="date"
                            value={editForm.expiry_date?.split("T")[0] || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                expiry_date: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary outline-none text-foreground"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          {getExpiryBadge(
                            editForm.expiry_date || user.expiry_date
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleSave(user.id)}
                              className="text-green-600 hover:text-green-700 font-semibold transition-colors text-left"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setEditForm({});
                              }}
                              className="text-muted-foreground hover:text-foreground font-semibold transition-colors text-left"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // View Mode
                      <>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-foreground">
                            {user.name}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 border border-blue-500/20">
                            {user.subscription_plan}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-muted-foreground font-medium">
                            {user.subscription_id || "N/A"}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {user.conversions}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {new Date(user.expiry_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          {getExpiryBadge(user.expiry_date)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-primary hover:text-primary/80 font-semibold transition-colors text-left"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-700 font-semibold transition-colors text-left"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground font-medium">
                Loading users...
              </p>
            </div>
          )}

          {/* No results */}
          {!loading && users.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg font-medium">
                No users found
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Try adjusting your filters
              </p>
            </div>
          )}

          {/* No results */}
          {!loading && users.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg font-medium">
                No users found
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
