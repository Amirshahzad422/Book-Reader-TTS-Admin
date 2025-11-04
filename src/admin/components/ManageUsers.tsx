"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { adminAuth } from "./../utils/adminAuth";

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
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
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

  const observerTarget = useRef<HTMLDivElement>(null);
  const adminUser = adminAuth.getSession();

  // Fetch users with filters and pagination
  const fetchUsers = useCallback(
    async (pageNum: number, isNewSearch: boolean = false) => {
      try {
        setLoading(true);

        let query = supabase
          .from("users")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

        // Apply search filter
        if (filters.search) {
          query = query.or(
            `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,subscription_id.ilike.%${filters.search}%`
          );
        }

        // Apply subscription ID filter
        if (filters.subscriptionId) {
          query = query.ilike("subscription_id", `%${filters.subscriptionId}%`);
        }

        // Apply subscription plan filter
        if (filters.subscriptionPlan !== "all") {
          query = query.eq("subscription_plan", filters.subscriptionPlan);
        }

        // Apply conversions filter
        if (filters.conversionsMin) {
          query = query.gte("conversions", parseInt(filters.conversionsMin));
        }
        if (filters.conversionsMax) {
          query = query.lte("conversions", parseInt(filters.conversionsMax));
        }

        const { data, error, count } = await query;

        if (error) throw error;

        if (data) {
          // Apply expiry status filter (client-side since it's computed)
          let filteredData = data;
          if (filters.expiryStatus !== "all") {
            filteredData = data.filter((user) => {
              const status = getExpiryStatus(user.expiry_date);
              return status === filters.expiryStatus;
            });
          }

          if (isNewSearch) {
            setUsers(filteredData);
          } else {
            setUsers((prev) => [...prev, ...filteredData]);
          }

          setHasMore(data.length === ITEMS_PER_PAGE);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Initial load and filter changes
  useEffect(() => {
    setPage(0);
    setUsers([]);
    setHasMore(true);
    fetchUsers(0, true);
  }, [filters]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchUsers(nextPage);
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
  }, [hasMore, loading, page, fetchUsers]);

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

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} className="h-10" />

          {/* No more results */}
          {!loading && !hasMore && users.length > 0 && (
            <div className="text-center py-8 border-t border-border">
              <p className="text-muted-foreground font-medium">
                No more users to load
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
