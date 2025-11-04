"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaPlay, FaPause, FaDownload, FaTimes, FaFilePdf, FaMusic, FaArrowLeft } from "react-icons/fa";

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

interface ConversationDetailProps {
  conversion: Conversion;
  onClose: () => void;
}

export default function ConversationDetail({ conversion, onClose }: ConversationDetailProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !conversion.audio_url) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [conversion.audio_url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <FaArrowLeft />
            Back to Conversations
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <FaTimes />
          </Button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{conversion.pdf_filename}</h1>
            <p className="text-muted-foreground">Created on {formatDate(conversion.created_at)}</p>
          </div>

          {/* Files Section */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* PDF Card */}
            {conversion.pdf_url && (
              <div className="border rounded-lg p-6 bg-card grid grid-cols-2 items-center justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg flex items-center justify-center">
                  <FaFilePdf className="text-red-500 text-xl" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">PDF Document</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(conversion.pdf_size)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="py-2 w-max px-3"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = conversion.pdf_url!;
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  link.click();
                }}
              >
                <FaFilePdf className="mr-2" />
                Open PDF
              </Button>
            </div>
            
            )}

            {/* Audio Info Card */}
            {conversion.audio_url && (
             <div className="border rounded-lg p-6 bg-card flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="rounded-lg flex items-center justify-center">
                 <FaMusic className="text-blue-500 text-xl" />
               </div>
               <div className="flex-1">
                 <h3 className="font-semibold">Audio File</h3>
                 <p className="text-sm text-muted-foreground">
                   {conversion.audio_size ? formatFileSize(conversion.audio_size) : 'N/A'} • {formatDuration(conversion.audio_duration)}
                 </p>
               </div>
             </div>
             <Button
               variant="outline"
               className="w-auto px-3"
               onClick={() => {
                 const link = document.createElement('a');
                 link.href = conversion.audio_url!;
                 link.download = `${conversion.pdf_filename.replace('.pdf', '')}_audio.mp3`;
                 link.click();
               }}
             >
               <FaDownload className="mr-2" />
               Download Audio
             </Button>
           </div>
           
            )}
          </div>

          {/* Audio Player */}
          {conversion.audio_url && (
            <div className="border rounded-lg p-6 bg-card">
              <h3 className="text-xl font-semibold mb-6">Audio Player</h3>
              
              <audio ref={audioRef} src={conversion.audio_url} preload="metadata" />

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 rounded-lg cursor-pointer appearance-none bg-gray-300 accent-primary"
                />
              </div>

              {/* Play/Pause Controls */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <Button
                  onClick={togglePlayPause}
                  className="w-16 h-16 rounded-full"
                  size="lg"
                >
                  {isPlaying ? (
                    <FaPause className="w-6 h-6" />
                  ) : (
                    <FaPlay className="w-6 h-6 ml-1" />
                  )}
                </Button>
              </div>

              {/* Speed Control */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Playback Speed: {playbackRate.toFixed(1)}x
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Adjust playback speed in real-time
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-muted-foreground w-8">0.5x</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    className="flex-1 h-2 rounded-lg cursor-pointer appearance-none bg-gray-300 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground w-8">2.0x</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
                    <Button
                      key={rate}
                      type="button"
                      variant={Math.abs(playbackRate - rate) < 0.05 ? "default" : "outline"}
                      className="h-8 px-3 text-xs"
                      onClick={() => setPlaybackRate(rate)}
                    >
                      {rate === 1.0 ? '1x' : `${rate}x`}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Details Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Conversion Info */}
            <div className="border rounded-lg p-6 bg-card">
              <h3 className="text-lg font-semibold mb-4">Conversion Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voice:</span>
                  <span className="font-medium capitalize">{conversion.voice}</span>
                </div>
                {conversion.audio_duration && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{formatDuration(conversion.audio_duration)}</span>
                  </div>
                )}
                {conversion.text_length && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Text Length:</span>
                    <span className="font-medium">{conversion.text_length.toLocaleString()} characters</span>
                  </div>
                )}
              </div>
            </div>

            {/* Voice Settings */}
            {conversion.voice_settings && (
              <div className="border rounded-lg p-6 bg-card">
                <h3 className="text-lg font-semibold mb-4">Voice Settings</h3>
                <div className="space-y-3 text-sm">
                  {conversion.voice_settings.speed && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Speed:</span>
                      <span className="font-medium">{conversion.voice_settings.speed}x</span>
                    </div>
                  )}
                  {conversion.voice_settings.emotionalRange && conversion.voice_settings.emotionalRange !== 'Natural' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Emotional Range:</span>
                      <span className="font-medium capitalize">{conversion.voice_settings.emotionalRange}</span>
                    </div>
                  )}
                  {conversion.voice_settings.tone && conversion.voice_settings.tone !== 'Natural' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tone:</span>
                      <span className="font-medium capitalize">{conversion.voice_settings.tone}</span>
                    </div>
                  )}
                  {conversion.voice_settings.intonation && conversion.voice_settings.intonation !== 'Natural' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Intonation:</span>
                      <span className="font-medium capitalize">{conversion.voice_settings.intonation}</span>
                    </div>
                  )}
                  {conversion.voice_settings.accent && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accent:</span>
                      <span className="font-medium capitalize">{conversion.voice_settings.accent}</span>
                    </div>
                  )}
                  {conversion.voice_settings.age && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Age:</span>
                      <span className="font-medium capitalize">{conversion.voice_settings.age}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Custom Instructions */}
          {conversion.voice_settings?.customInstructions && (
            <div className="border rounded-lg p-6 bg-card">
              <h3 className="text-lg font-semibold mb-4">Custom Instructions</h3>
              <div className="bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                {conversion.voice_settings.customInstructions}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

