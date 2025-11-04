"use client";

import { useState, useRef } from "react";
import { FaPlay, FaPause, FaVolumeUp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { AVAILABLE_VOICES, type Voice } from "@/lib/voiceDefinitions";

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
}

export default function VoiceSelector({ selectedVoice, onVoiceChange }: VoiceSelectorProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playVoicePreview = async (voiceId: string) => {
    // If clicking on the same voice, stop it
    if (playingVoice === voiceId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setPlayingVoice(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setPlayingVoice(voiceId);
    
    try {
      // Use pre-generated voice preview from /public/voice-previews
      const audio = new Audio(`/voice-previews/${voiceId}.mp3`);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingVoice(null);
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        console.error('Failed to play voice preview');
        setPlayingVoice(null);
        audioRef.current = null;
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing voice preview:', error);
      setPlayingVoice(null);
      audioRef.current = null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-card p-6 rounded-lg border shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <FaVolumeUp className="text-primary" />
            Choose Your AI Voice
          </h3>
          <p className="text-muted-foreground">
            Select the perfect voice for your audiobook. Click the play button to hear a preview.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_VOICES.map((voice) => (
            <div
              key={voice.id}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                ${selectedVoice === voice.id 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-muted hover:border-primary/50'
                }
              `}
              onClick={() => onVoiceChange(voice.id)}
            >
              {/* Voice Color Indicator */}
              <div className={`w-3 h-3 rounded-full ${voice.color} absolute top-3 right-3`}></div>
              
              {/* Voice Info */}
              <div className="mb-3">
                <h4 className="font-semibold text-lg">{voice.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">{voice.description}</p>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="font-medium">{voice.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accent:</span>
                    <span className="font-medium">{voice.accent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Style:</span>
                    <span className="font-medium">{voice.personality}</span>
                  </div>
                </div>
              </div>

              {/* Preview Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  playVoicePreview(voice.id);
                }}
              >
                {playingVoice === voice.id ? (
                  <>
                    <FaPause className="mr-2 w-3 h-3" />
                    Stop
                  </>
                ) : (
                  <>
                    <FaPlay className="mr-2 w-3 h-3" />
                    Preview
                  </>
                )}
              </Button>

              {/* Selected Indicator */}
              {selectedVoice === voice.id && (
                <div className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none">
                  <div className="absolute top-2 left-1/3 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Selected
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Current Selection Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                🎤 Selected Voice: {AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.name}
                <span className={`px-2 py-1 text-xs rounded ${AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.gender === 'Male' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200'}`}>
                  {AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.gender}
                </span>
              </h4>
              <p className="text-sm text-muted-foreground">
                {AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                🌍 Accent: {AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.accent} • 
                💭 Style: {AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.personality}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full ${AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.color}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
