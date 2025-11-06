"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { adminAuth } from "./../utils/adminAuth";
import {
  FileText,
  CheckCircle2,
  Loader2,
  XCircle,
  File,
  Music,
  Database,
  Clock,
  Timer,
  Mic,
} from "lucide-react";

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

      {/* Stats Dashboard */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-0">
        {/* Row 1 - Overall Conversion Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          {/* Total Conversions */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl border-2 border-blue-500/20 p-6 hover:border-blue-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Total Conversions
              </h3>
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FileText className="text-blue-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {conversions.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Based on current filters
            </p>
          </div>

          {/* Completed */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-2xl border-2 border-green-500/20 p-6 hover:border-green-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Completed
              </h3>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-between">
                <CheckCircle2 className="text-green-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {conversions.filter((c) => c.status === "completed").length}
            </p>
            <p className="text-xs text-muted-foreground">
              {conversions.length > 0
                ? (
                    (conversions.filter((c) => c.status === "completed")
                      .length /
                      conversions.length) *
                    100
                  ).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

          {/* Processing */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-2xl border-2 border-orange-500/20 p-6 hover:border-orange-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Processing
              </h3>
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Loader2 className="text-orange-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {conversions.filter((c) => c.status === "processing").length}
            </p>
            <p className="text-xs text-muted-foreground">
              {conversions.length > 0
                ? (
                    (conversions.filter((c) => c.status === "processing")
                      .length /
                      conversions.length) *
                    100
                  ).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

          {/* Failed */}
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-2xl border-2 border-red-500/20 p-6 hover:border-red-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Failed
              </h3>
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="text-red-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {conversions.filter((c) => c.status === "failed").length}
            </p>
            <p className="text-xs text-muted-foreground">
              {conversions.length > 0
                ? (
                    (conversions.filter((c) => c.status === "failed").length /
                      conversions.length) *
                    100
                  ).toFixed(1)
                : 0}
              % of total
            </p>
          </div>
        </div>

        {/* Row 2 - Storage Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {/* Total PDF Storage */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl border-2 border-purple-500/20 p-6 hover:border-purple-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                PDF Storage
              </h3>
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <File className="text-purple-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {(() => {
                const totalBytes = conversions.reduce(
                  (sum, c) => sum + (c.pdf_size || 0),
                  0
                );
                const gb = totalBytes / (1024 * 1024 * 1024);
                const mb = totalBytes / (1024 * 1024);
                return gb >= 1 ? `${gb.toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">
              Across {conversions.filter((c) => c.pdf_path).length} PDFs
            </p>
          </div>

          {/* Total Audio Storage */}
          <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 rounded-2xl border-2 border-indigo-500/20 p-6 hover:border-indigo-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Audio Storage
              </h3>
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <Music className="text-indigo-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {(() => {
                const totalBytes = conversions.reduce(
                  (sum, c) => sum + (c.audio_size || 0),
                  0
                );
                const gb = totalBytes / (1024 * 1024 * 1024);
                const mb = totalBytes / (1024 * 1024);
                return gb >= 1 ? `${gb.toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">
              Across {conversions.filter((c) => c.audio_path).length} audio
              files
            </p>
          </div>

          {/* Combined Storage */}
          <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 rounded-2xl border-2 border-pink-500/20 p-6 hover:border-pink-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Total Storage
              </h3>
              <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                <Database className="text-pink-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {(() => {
                const totalBytes = conversions.reduce(
                  (sum, c) => sum + (c.pdf_size || 0) + (c.audio_size || 0),
                  0
                );
                const gb = totalBytes / (1024 * 1024 * 1024);
                const mb = totalBytes / (1024 * 1024);
                return gb >= 1 ? `${gb.toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">
              Combined PDF + Audio
            </p>
          </div>
        </div>

        {/* Row 3 - Audio & Usage Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {/* Total Audio Duration */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-2xl border-2 border-emerald-500/20 p-6 hover:border-emerald-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Total Duration
              </h3>
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Clock className="text-emerald-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {(() => {
                const totalSeconds = conversions.reduce(
                  (sum, c) => sum + (c.audio_duration || 0),
                  0
                );
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">Total audio length</p>
          </div>

          {/* Average Audio Duration */}
          <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/10 rounded-2xl border-2 border-teal-500/20 p-6 hover:border-teal-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Avg Duration
              </h3>
              <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <Timer className="text-teal-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {(() => {
                const withAudio = conversions.filter((c) => c.audio_duration);
                if (withAudio.length === 0) return "0m";
                const avgSeconds =
                  withAudio.reduce(
                    (sum, c) => sum + (c.audio_duration || 0),
                    0
                  ) / withAudio.length;
                const hours = Math.floor(avgSeconds / 3600);
                const minutes = Math.floor((avgSeconds % 3600) / 60);
                return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">Per conversion</p>
          </div>

          {/* Average PDF Size */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 rounded-2xl border-2 border-cyan-500/20 p-6 hover:border-cyan-500/40 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Avg PDF Size
              </h3>
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <FileText className="text-cyan-600 w-5 h-5" />
              </div>
            </div>
            <p className="text-4xl font-bold text-foreground mb-2">
              {(() => {
                const withPdf = conversions.filter((c) => c.pdf_size);
                if (withPdf.length === 0) return "0 MB";
                const avgBytes =
                  withPdf.reduce((sum, c) => sum + (c.pdf_size || 0), 0) /
                  withPdf.length;
                const mb = avgBytes / (1024 * 1024);
                return `${mb.toFixed(2)} MB`;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">Per document</p>
          </div>
        </div>

        {/* Row 4 - Voice Distribution */}
        <div className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 rounded-2xl border-2 border-violet-500/20 p-6 mb-6 hover:border-violet-500/40 transition-all">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></span>
            Voice Distribution
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {["fable", "onyx", "nova", "shimmer", "alloy", "echo"].map(
              (voice) => {
                const count = conversions.filter(
                  (c) => c.voice === voice
                ).length;
                const percentage =
                  conversions.length > 0
                    ? ((count / conversions.length) * 100).toFixed(1)
                    : 0;
                return (
                  <div key={voice} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mic className="text-violet-600 w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {voice}
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
              }
            )}
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
                  <tr
                    key={conversion.id}
                    className="hover:bg-accent/30 transition-colors"
                  >
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
              <p className="mt-4 text-muted-foreground font-medium">
                Loading conversions...
              </p>
            </div>
          )}

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} className="h-10" />

          {/* No more results */}
          {!loading && !hasMore && conversions.length > 0 && (
            <div className="text-center py-8 border-t border-border">
              <p className="text-muted-foreground font-medium">
                No more conversions to load
              </p>
            </div>
          )}

          {/* No results */}
          {!loading && conversions.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg font-medium">
                No conversions found
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
