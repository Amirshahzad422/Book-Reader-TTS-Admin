"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FaFilePdf, FaMusic, FaTrash, FaDownload, FaPlay, FaTimes, FaCog } from "react-icons/fa";
import ConversationDetail from "./ConversationDetail";

interface VoiceSettings {
  speed?: number;
  emotionalRange?: string;
  tone?: string;
  intonation?: string;
  accent?: string;
  age?: string;
  pacing?: string;
  emphasis?: string;
  context?: string;
  customInstructions?: string;
  voice?: string;
}

interface Conversion {
  id: string;
  pdf_filename: string;
  pdf_url: string | null;
  audio_url: string | null;
  voice: string;
  voice_settings: VoiceSettings | null;
  created_at: string;
  audio_duration: number | null;
  pdf_size: number;
  audio_size: number | null;
  text_length: number | null;
}

interface ConversationsHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConversationsHistory({ isOpen, onClose }: ConversationsHistoryProps) {
  const [conversions, setConversations] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewingSettingsId, setViewingSettingsId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/conversions');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversions || []);
      } else {
        console.error('Failed to fetch conversions');
      }
    } catch (error) {
      console.error('Error fetching conversions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/conversions/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setConversations(conversions.filter(c => c.id !== id));
        setDeleteConfirmId(null);
      } else {
        alert('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  const handlePlayAudio = (id: string, audioUrl: string) => {
    // Get or create audio element
    let audio = audioRefs.current[id];

    if (audio) {
      // Audio already exists
      if (playingAudioId === id && !audio.paused) {
        // Stop (pause without resetting)
        audio.pause();
        setPlayingAudioId(null);
      } else {
        // Stop any other playing audio first
        Object.entries(audioRefs.current).forEach(([otherId, otherAudio]) => {
          if (otherId !== id && otherAudio && !otherAudio.paused) {
            otherAudio.pause();
          }
        });
        // Play this audio
        audio.play();
        setPlayingAudioId(id);
      }
    } else {
      // Stop any currently playing audio
      Object.values(audioRefs.current).forEach(otherAudio => {
        if (otherAudio && !otherAudio.paused) {
          otherAudio.pause();
        }
      });

      // Create new audio element
      audio = new Audio(audioUrl);
      audioRefs.current[id] = audio;

      audio.onended = () => setPlayingAudioId(null);
      audio.onpause = () => {
        // Only clear playing state if we're not seeking
        if (audio.duration && audio.currentTime === 0 && !audio.seeking) {
          setPlayingAudioId(null);
        }
      };

      audio.play();
      setPlayingAudioId(id);
    }
  };

  // Cleanup audio elements when component unmounts or modal closes
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
      audioRefs.current = {};
      setPlayingAudioId(null);
    };
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">My Conversations</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <FaTimes />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading conversations...</p>
            </div>
          ) : conversions.length === 0 ? (
            <div className="text-center py-12">
              <FaFilePdf className="text-6xl text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No conversations yet</p>
              <p className="text-muted-foreground">Your saved conversions will appear here</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {conversions.map((conv) => (
                <div
                  key={conv.id}
                  className="border rounded-lg p-4 hover:shadow-lg transition-shadow relative flex flex-col cursor-pointer"
                  onClick={(e) => {
                    // Don't trigger if clicking on buttons or interactive elements
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('a')) return;
                    setSelectedConversationId(conv.id);
                  }}
                >
                  {/* Delete icon in top right */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(conv.id);
                    }}
                  >
                    <FaTrash className="text-xs" />
                  </Button>

                  {/* File Info */}
                  <div className="flex items-start gap-3 mb-3 pr-8">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FaFilePdf className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{conv.pdf_filename}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(conv.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium">Voice:</span>
                      <span className="capitalize">{conv.voice}</span>
                    </div>
                    {conv.audio_duration && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-medium">Duration:</span>
                        <span>{formatDuration(conv.audio_duration)}</span>
                      </div>
                    )}
                  </div>

                  {/* Files */}
                  <div className="space-y-2 mb-4">
                    {conv.pdf_url && (
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <FaFilePdf className="text-red-500" />
                          <span className="text-sm">PDF</span>
                          <span className="text-xs text-muted-foreground">
                            ({formatFileSize(conv.pdf_size)})
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = conv.pdf_url!;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            link.click();
                          }}
                        >
                          Open
                        </Button>

                      </div>
                    )}
                    {conv.audio_url && (
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <FaMusic className="text-blue-500" />
                          <span className="text-sm">Audio</span>
                          {conv.audio_size && (
                            <span className="text-xs text-muted-foreground">
                              ({formatFileSize(conv.audio_size)})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayAudio(conv.id, conv.audio_url!);
                            }}
                          >
                            {playingAudioId === conv.id ? (
                              <FaTimes className="text-xs" />
                            ) : (
                              <FaPlay className="text-xs" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = conv.audio_url!;
                              link.download = `${conv.pdf_filename.replace('.pdf', '')}_audio.mp3`;
                              link.click();
                            }}
                          >
                            <FaDownload className="text-xs" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions - Fixed at bottom */}
                  <div className="mt-auto pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingSettingsId(conv.id);
                      }}
                    >
                      <FaCog className="mr-2" />
                      View Settings
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Delete Conversation</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Settings Modal */}
      {viewingSettingsId && (() => {
        const conv = conversions.find(c => c.id === viewingSettingsId);
        if (!conv || !conv.voice_settings) return null;
        
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-bold">Voice Settings</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingSettingsId(null)}
                >
                  <FaTimes />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                  {conv.voice_settings.voice && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Voice:</span>
                      <span className="capitalize font-medium">{conv.voice_settings.voice}</span>
                    </div>
                  )}
                  {conv.voice_settings.speed && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Speed:</span>
                      <span className="font-medium">{conv.voice_settings.speed}x</span>
                    </div>
                  )}
                  {conv.voice_settings.emotionalRange && conv.voice_settings.emotionalRange !== 'Natural' && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Emotional Range:</span>
                      <span className="font-medium capitalize">{conv.voice_settings.emotionalRange}</span>
                    </div>
                  )}
                  {conv.voice_settings.tone && conv.voice_settings.tone !== 'Natural' && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Tone:</span>
                      <span className="font-medium capitalize">{conv.voice_settings.tone}</span>
                    </div>
                  )}
                  {conv.voice_settings.intonation && conv.voice_settings.intonation !== 'Natural' && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Intonation:</span>
                      <span className="font-medium capitalize">{conv.voice_settings.intonation}</span>
                    </div>
                  )}
                  {conv.voice_settings.accent && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Accent:</span>
                      <span className="font-medium capitalize">{conv.voice_settings.accent}</span>
                    </div>
                  )}
                  {conv.voice_settings.age && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Age:</span>
                      <span className="font-medium capitalize">{conv.voice_settings.age}</span>
                    </div>
                  )}
                  {conv.voice_settings.pacing && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Pacing:</span>
                      <span className="font-medium capitalize">{conv.voice_settings.pacing}</span>
                    </div>
                  )}
                  {conv.voice_settings.emphasis && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Emphasis:</span>
                      <span className="font-medium capitalize">{conv.voice_settings.emphasis}</span>
                    </div>
                  )}
                  {conv.voice_settings.context && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Context:</span>
                      <span className="font-medium capitalize">{conv.voice_settings.context}</span>
                    </div>
                  )}
                  {conv.voice_settings.customInstructions && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-muted-foreground text-sm mb-2">Custom Instructions:</div>
                      <div className="bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-wrap">{conv.voice_settings.customInstructions}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t">
                <Button
                  variant="outline"
                  className=""
                  onClick={() => setViewingSettingsId(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Conversation Detail View */}
      {selectedConversationId && (() => {
        const conv = conversions.find(c => c.id === selectedConversationId);
        if (!conv) return null;
        return (
          <ConversationDetail
            conversion={conv}
            onClose={() => setSelectedConversationId(null)}
          />
        );
      })()}
    </div>
  );
}

