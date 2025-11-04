"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { adminAuth } from "./../utils/adminAuth";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Conversion {
  id: string;
  user_id: string;
  pdf_path: string | null;
  audio_path: string | null;
  pdf_filename: string;
  pdf_size: number;
  audio_size: number | null;
  voice: string;
  voice_settings: any;
  text_length: number | null;
  audio_duration: number | null;
  status: string;
  completed_at: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface Filters {
  search: string;
  voice: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const ITEMS_PER_PAGE = 20;

export const ManageConversions: React.FC = () => {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    voice: "all",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [deletingItem, setDeletingItem] = useState<string | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);
  const adminUser = adminAuth.getSession();

  // Format file size
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  // Format duration
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Fetch conversions with filters and pagination
  const fetchConversions = useCallback(
    async (pageNum: number, isNewSearch: boolean = false) => {
      try {
        setLoading(true);

        // First, get conversions
        let query = supabase
          .from("conversions")
          .select("*")
          .order("created_at", { ascending: false })
          .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1);

        // Apply voice filter
        if (filters.voice !== "all") {
          query = query.eq("voice", filters.voice);
        }

        // Apply status filter
        if (filters.status !== "all") {
          query = query.eq("status", filters.status);
        }

        // Apply date range filter
        if (filters.dateFrom) {
          query = query.gte("created_at", filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte("created_at", filters.dateTo);
        }

        const { data: conversionsData, error } = await query;

        if (error) throw error;

        if (conversionsData && conversionsData.length > 0) {
          // Get unique user IDs
          const userIds = [...new Set(conversionsData.map((c) => c.user_id))];

          // Fetch user details
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", userIds);

          if (usersError) throw usersError;

          // Create a map of user details
          const usersMap = new Map(
            usersData?.map((u) => [u.id, { name: u.name, email: u.email }])
          );

          // Merge user details with conversions
          let enrichedConversions = conversionsData.map((conv) => ({
            ...conv,
            user_name: usersMap.get(conv.user_id)?.name || "Unknown",
            user_email: usersMap.get(conv.user_id)?.email || "Unknown",
          }));

          // Apply search filter (client-side for user data)
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            enrichedConversions = enrichedConversions.filter(
              (conv) =>
                conv.user_email?.toLowerCase().includes(searchLower) ||
                conv.user_name?.toLowerCase().includes(searchLower) ||
                conv.pdf_filename?.toLowerCase().includes(searchLower) ||
                conv.id?.toLowerCase().includes(searchLower)
            );
          }

          if (isNewSearch) {
            setConversions(enrichedConversions);
          } else {
            setConversions((prev) => [...prev, ...enrichedConversions]);
          }

          setHasMore(conversionsData.length === ITEMS_PER_PAGE);
        } else {
          if (isNewSearch) {
            setConversions([]);
          }
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching conversions:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Initial load and filter changes
  useEffect(() => {
    setPage(0);
    setConversions([]);
    setHasMore(true);
    fetchConversions(0, true);
  }, [filters]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchConversions(nextPage);
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
  }, [hasMore, loading, page, fetchConversions]);

  // Delete PDF only
  const handleDeletePdf = async (conversion: Conversion) => {
    if (!conversion.pdf_path) {
      alert("No PDF file to delete");
      return;
    }

    if (!confirm("Are you sure you want to delete the PDF file?")) return;

    try {
      setDeletingItem(conversion.id);

      // Call API to delete from storage
      const response = await fetch("/api/admin/delete-file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "pdfs",
          path: conversion.pdf_path,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error?.message || "Failed to delete file");
      }

      // Update database record
      const { error: dbError } = await supabase
        .from("conversions")
        .update({ pdf_path: "", pdf_size: 0 })
        .eq("id", conversion.id);

      if (dbError) throw dbError;

      // Update local state
      setConversions(
        conversions.map((c) =>
          c.id === conversion.id ? { ...c, pdf_path: "", pdf_size: 0 } : c
        )
      );

      alert("PDF deleted successfully");
    } catch (error: any) {
      console.error("Error deleting PDF:", error);
      alert(`Failed to delete PDF: ${error.message}`);
    } finally {
      setDeletingItem(null);
    }
  };

  // Delete Audio only
  const handleDeleteAudio = async (conversion: Conversion) => {
    if (!conversion.audio_path) {
      alert("No audio file to delete");
      return;
    }

    if (!confirm("Are you sure you want to delete the audio file?")) return;

    try {
      setDeletingItem(conversion.id);

      // Call API to delete from storage
      const response = await fetch("/api/admin/delete-file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "audio",
          path: conversion.audio_path,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error?.message || "Failed to delete file");
      }

      // Update database record
      const { error: dbError } = await supabase
        .from("conversions")
        .update({ audio_path: "", audio_size: null, audio_duration: null })
        .eq("id", conversion.id);

      if (dbError) throw dbError;

      // Update local state
      setConversions(
        conversions.map((c) =>
          c.id === conversion.id
            ? { ...c, audio_path: "", audio_size: null, audio_duration: null }
            : c
        )
      );

      alert("Audio deleted successfully");
    } catch (error: any) {
      console.error("Error deleting audio:", error);
      alert(`Failed to delete audio: ${error.message}`);
    } finally {
      setDeletingItem(null);
    }
  };

  // Delete entire conversion
  const handleDeleteConversion = async (conversion: Conversion) => {
    if (
      !confirm(
        "Are you sure you want to delete this entire conversion? This will remove all files and the database record."
      )
    )
      return;

    try {
      setDeletingItem(conversion.id);

      // Delete PDF from storage if exists
      if (conversion.pdf_path) {
        const pdfResponse = await fetch("/api/admin/delete-file", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket: "pdfs",
            path: conversion.pdf_path,
          }),
        });

        const pdfResult = await pdfResponse.json();
        if (!pdfResponse.ok || pdfResult.error) {
          throw new Error(`Failed to delete PDF: ${pdfResult.error?.message}`);
        }
      }

      // Delete audio from storage if exists
      if (conversion.audio_path) {
        const audioResponse = await fetch("/api/admin/delete-file", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bucket: "audio",
            path: conversion.audio_path,
          }),
        });

        const audioResult = await audioResponse.json();
        if (!audioResponse.ok || audioResult.error) {
          throw new Error(
            `Failed to delete audio: ${audioResult.error?.message}`
          );
        }
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from("conversions")
        .delete()
        .eq("id", conversion.id);

      if (dbError) throw dbError;

      // Update local state
      setConversions(conversions.filter((c) => c.id !== conversion.id));

      alert("Conversion deleted successfully");
    } catch (error: any) {
      console.error("Error deleting conversion:", error);
      alert(`Failed to delete conversion: ${error.message}`);
    } finally {
      setDeletingItem(null);
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
              Conversions Management
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Search */}
          <div className="lg:col-span-2 xl:col-span-1">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Email, Name, Filename, ID"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Voice Type */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Voice Type
            </label>
            <select
              value={filters.voice}
              onChange={(e) =>
                setFilters({ ...filters, voice: e.target.value })
              }
              className="w-full px-4 py-2.5 border-2 border-border bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
            >
              <option value="all">All Voices</option>
              <option value="fable">Fable</option>
              <option value="onyx">Onyx</option>
              <option value="nova">Nova</option>
              <option value="shimmer">Shimmer</option>
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
            </select>
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
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Date From
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
              Date To
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
        </div>
      </div>

      {/* Conversions Table */}
      <div className="bg-card rounded-2xl border-2 border-border shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent/50 border-b-2 border-border">
              <tr>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  PDF Filename
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  Voice
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  PDF Size
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  Audio Size
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-foreground uppercase tracking-wider">
                  Created At
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
              {conversions.map((conversion) => (
                <tr key={conversion.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-foreground">
                      {conversion.user_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {conversion.user_email}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="text-sm text-foreground max-w-xs truncate font-medium">
                      {conversion.pdf_filename}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-gradient-to-r from-purple-500/10 to-primary/10 text-primary border border-primary/20">
                      {conversion.voice}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {formatFileSize(conversion.pdf_size)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {formatFileSize(conversion.audio_size)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {formatDuration(conversion.audio_duration)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {new Date(conversion.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                        conversion.status === "completed"
                          ? "bg-green-500/10 text-green-600 border border-green-500/20"
                          : conversion.status === "processing"
                          ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                          : "bg-red-500/10 text-red-600 border border-red-500/20"
                      }`}
                    >
                      {conversion.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleDeletePdf(conversion)}
                        disabled={
                          !conversion.pdf_path ||
                          deletingItem === conversion.id
                        }
                        className="text-orange-600 hover:text-orange-700 disabled:text-muted-foreground disabled:cursor-not-allowed text-left font-semibold transition-colors"
                      >
                        Delete PDF
                      </button>
                      <button
                        onClick={() => handleDeleteAudio(conversion)}
                        disabled={
                          !conversion.audio_path ||
                          deletingItem === conversion.id
                        }
                        className="text-blue-600 hover:text-blue-700 disabled:text-muted-foreground disabled:cursor-not-allowed text-left font-semibold transition-colors"
                      >
                        Delete Audio
                      </button>
                      <button
                        onClick={() => handleDeleteConversion(conversion)}
                        disabled={deletingItem === conversion.id}
                        className="text-red-600 hover:text-red-700 disabled:text-muted-foreground disabled:cursor-not-allowed text-left font-semibold transition-colors"
                      >
                        Delete All
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground font-medium">Loading conversions...</p>
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="h-10" />

        {/* No more results */}
        {!loading && !hasMore && conversions.length > 0 && (
          <div className="text-center py-8 border-t border-border">
            <p className="text-muted-foreground font-medium">No more conversions to load</p>
          </div>
        )}

        {/* No results */}
        {!loading && conversions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg font-medium">No conversions found</p>
            <p className="text-muted-foreground text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
};
