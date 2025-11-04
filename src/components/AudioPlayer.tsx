"use client";

import { useState, useRef, useEffect } from "react";
import { FaPlay, FaPause, FaDownload, FaMusic, FaRedo, FaSave } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import SaveConversationDialog from "./SaveConversationDialog";
import { useSession } from "next-auth/react";

interface AudioPlayerProps {
  audioUrl: string;
  fileName: string;
  pdfFile?: File | null;
  voiceSettings?: any;
  detectedLanguage?: string;
  textLength?: number;
}

export default function AudioPlayer({ 
  audioUrl, 
  fileName, 
  pdfFile,
  voiceSettings,
  detectedLanguage,
  textLength
}: AudioPlayerProps) {
  const { data: session } = useSession();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set volume to 1 (full volume)
    audio.volume = 1;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [audioUrl]);

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

  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseFloat(e.target.value);
    setPlaybackRate(newRate);
  };

  const handlePlaybackRateIncrement = (delta: number) => {
    setPlaybackRate(prev => {
      const newRate = Math.max(0.5, Math.min(2.0, parseFloat((prev + delta).toFixed(1))));
      return newRate;
    });
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatSpeed = (rate: number) => {
    // Format: 1.0 -> "1", 0.5 -> "0.5", 2.0 -> "2"
    const str = rate.toString();
    return str.endsWith('.0') ? str.slice(0, -2) : str;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      // If playback rate is 1.0, download original file
      if (playbackRate === 1.0) {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `${fileName.replace('.pdf', '')}_audio.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Process audio with new speed using Web Audio API
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Create offline audio context with modified sample rate for speed
        const offlineContext = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          Math.floor(audioBuffer.length / playbackRate),
          audioContext.sampleRate
        );
        
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackRate;
        source.connect(offlineContext.destination);
        
        source.start(0);
        
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert buffer to WAV format
        const wav = audioBufferToWav(renderedBuffer);
        const blob = new Blob([new Uint8Array(wav)], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        const suffix = playbackRate < 1 ? `_slow_${playbackRate}x` : playbackRate > 1 ? `_fast_${playbackRate}x` : '';
        link.download = `${fileName.replace('.pdf', '')}_audio${suffix}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading audio:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferLength = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert Float32Array samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };

  const restartAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
  };

  const handleSaveConversation = async (savePdf: boolean, saveAudio: boolean) => {
    if (!session?.user) {
      alert("Please log in to save conversations");
      return;
    }

    try {
      // Convert files to base64
      let pdfBase64: string | null = null;
      let audioBase64: string | null = null;

      if (savePdf && pdfFile) {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        // Convert bytes to base64 safely (chunked for large files)
        let binary = '';
        const chunkSize = 8192; // Process in 8KB chunks
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += Array.from(chunk, byte => String.fromCharCode(byte)).join('');
        }
        pdfBase64 = `data:application/pdf;base64,${btoa(binary)}`;
      }

      if (saveAudio) {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        // Convert bytes to base64 safely (chunked for large files)
        let binary = '';
        const chunkSize = 8192; // Process in 8KB chunks
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += Array.from(chunk, byte => String.fromCharCode(byte)).join('');
        }
        audioBase64 = `data:audio/mpeg;base64,${btoa(binary)}`;
      }

      const response = await fetch('/api/conversions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfFile: pdfBase64,
          audioBlob: audioBase64,
          pdfFilename: pdfFile?.name || fileName,
          voiceSettings: {
            ...voiceSettings,
            voice: voiceSettings?.voice || 'fable'
          },
          textLength
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      // Success handled in dialog
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card p-6 rounded-lg border shadow-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaMusic className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2">Audio Ready!</h2>
          <p className="text-muted-foreground">
            Your PDF has been converted to natural, human-like audio
          </p>
        </div>

        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        {/* File Info */}
        <div className="bg-muted/50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-1">{fileName.replace('.pdf', '')} - Audio Version</h3>
          <p className="text-sm text-muted-foreground">
            Duration: {formatTime(duration)} • High-quality AI voice with emotional expression
          </p>
        </div>

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
            className="w-full h-2 rounded-lg cursor-pointer appearance-none bg-gray-300 accent-black"
          />
        </div>


        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={restartAudio}
            className="w-12 h-12"
          >
            <FaRedo className="w-4 h-4" />
          </Button>

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

          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            className="w-12 h-12"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <span className="animate-spin">...</span>
            ) : (
              <FaDownload className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Playback Speed Control */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-medium block mb-1">
                Playback Speed: {playbackRate.toFixed(1)}x
              </label>
              <p className="text-xs text-muted-foreground">
                Adjust playback speed in real-time without recreating audio
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-muted-foreground">0.5x</span>
            <Button 
              type="button" 
              variant="secondary" 
              className="h-8 px-3 text-sm" 
              onClick={() => handlePlaybackRateIncrement(-0.1)}
            >
              -
            </Button>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={playbackRate}
              onChange={handlePlaybackRateChange}
              className="flex-1 h-2 rounded-lg cursor-pointer appearance-none bg-gray-300 accent-black"
            />
            <Button 
              type="button" 
              variant="secondary" 
              className="h-8 px-3 text-sm" 
              onClick={() => handlePlaybackRateIncrement(0.1)}
            >
              +
            </Button>
            <span className="text-xs text-muted-foreground">2.0x</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
              <Button
                key={rate}
                type="button"
                variant={Math.abs(playbackRate - rate) < 0.05 ? "default" : "outline"}
                className="h-7 px-3 text-xs"
                onClick={() => setPlaybackRate(rate)}
              >
                {formatSpeed(rate)}x
              </Button>
            ))}
          </div>
        </div>

        

        {/* Save Conversation Button */}
        {session?.user && (
          <div className="mt-6 pt-6 border-t">
            <Button
              onClick={() => setShowSaveDialog(true)}
              className="w-full"
              variant="outline"
            >
              <FaSave className="mr-2" />
              Save Conversation
            </Button>
          </div>
        )}
        {/* AI Voice Info */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
          <h4 className="font-medium mb-2">🎭 AI Voice Features</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Natural male voice with emotional expression</li>
            <li>• Human-like intonation and pacing</li>
            <li>• Advanced AI speech synthesis</li>
            <li>• Professional audiobook quality</li>
          </ul>
        </div>
      </div>

      {/* Save Conversation Dialog */}
      <SaveConversationDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveConversation}
        hasPdf={!!pdfFile}
        hasAudio={!!audioUrl}
      />
    </div>
  );
}
