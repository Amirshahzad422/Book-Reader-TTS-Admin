"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toaster";

interface VoiceSettingsProps {
  onSettingsChange: (settings: {
    instructions?: string;
    speed: number;
    // Individual settings for logging
    emotionalRange?: string;
    tone?: string;
    intonation?: string;
    customInstructions?: string;
  }) => void;
  initialSettings?: {
    speed?: number;
    emotionalRange?: string;
    tone?: string;
    intonation?: string;
    customInstructions?: string;
  };
}

const EMOTIONAL_RANGES = [
  "Natural",
  "Cheerful and upbeat",
  "Calm and soothing",
  "Excited and energetic",
  "Professional and formal",
  "Friendly and casual",
  "Dramatic and expressive"
];

const TONE_OPTIONS = [
  "Natural",
  "Warm and friendly",
  "Confident and authoritative",
  "Gentle and soft",
  "Energetic and vibrant",
  "Calm and composed"
];

const INTONATION_OPTIONS = [
  "Natural",
  "Monotone",
  "Expressive with variation",
  "Smooth and flowing",
  "Emphasized and dramatic"
];

// Emotional range preview filenames and sample lines
const EMOTIONAL_SAMPLE_LINES: Record<string, string> = {
  "Natural": "This is a simple test of my natural voice.",
  "Cheerful and upbeat": "What a wonderful day to start something new!",
  "Calm and soothing": "Take a deep breath and relax your mind.",
  "Excited and energetic": "Let’s get this project rolling — it’s going to be amazing!",
  "Professional and formal": "Please submit your report by the end of the day.",
  "Friendly and casual": "Hey there! How’s everything going today?",
  "Dramatic and expressive": "The storm raged on, but hope still burned bright!",
};

function toPreviewFilename(option: string): string {
  // Normalize to kebab-case filenames, e.g., "Cheerful and upbeat" -> "cheerful-and-upbeat.mp3"
  const slug = option
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `/emotional-range-previews/${slug}.mp3`;
}

function toTonePreviewFilename(option: string): string {
  const slug = option
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `/tone-previews/${slug}.mp3`;
}

function toIntonationPreviewFilename(option: string): string {
  const slug = option
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `/intonation-previews/${slug}.mp3`;
}

// Helper to generate accent preview file path
function toAccentPreviewFilename(option: string): string {
  const slug = option
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `/accent-previews/${slug}.mp3`;
}

function toAgePreviewFilename(option: string): string {
  const slug = option
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `/age-previews/${slug}.mp3`;
}

// Additional predefined options (extendable)
const ACCENT_OPTIONS = [
  "None",
  "American",
  "British",
  "Australian",
  "Irish",
  "Scottish",
  "Welsh",
  "Canadian",
  "South African",
  "New Zealand",
  "Indian",
  "Nigerian",
  "Singaporean",
  "Jamaican",
  "Caribbean",
  "Southern American",
  "New York",
  "Midwestern American",
  "Cockney",
  "Yorkshire",
  "Geordie",
  "Estuary English"
];

const AGE_OPTIONS = [
  "Default",
  "Child voice",
  "Young voice",
  "Mature voice",
  "Elderly voice",
];

const PACING_OPTIONS = [
  "Default",
  "Slow and deliberate",
  "Measured",
  "Fast-paced",
];

const EMPHASIS_OPTIONS = [
  "Default",
  "Dramatic pauses",
  "Emphasize important words",
  "Light emphasis",
];

const CONTEXT_OPTIONS = [
  "None",
  "Like a narrator",
  "Like a teacher",
  "Like a friend",
  "Like a storyteller",
];

const PRESET_INSTRUCTIONS: { label: string; text: string }[] = [
  { label: "Audiobook", text: "Narrate like an audiobook storyteller, warm and friendly, expressive intonation, smooth and flowing, slow and deliberate pacing, brief pauses for emphasis." },
  { label: "Documentary", text: "Documentary narrator style, calm and composed tone, smooth and flowing intonation, light emphasis, natural pacing, clear enunciation." },
  { label: "Motivational", text: "Confident and authoritative tone, energetic pacing, strong emphasis on key phrases, short dramatic pauses before important words." },
  { label: "Tech Explainer", text: "Professional and clear, measured pacing, neutral emotion, emphasize definitions and key terms, brief pause between sections, avoid jargon where possible." },
  { label: "Whisper Softly", text: "Whisper softly with intimate tone, short sentences, gentle pacing, add brief pauses between lines." },
  { label: "Storytime for Kids", text: "Friendly storyteller for children, cheerful and upbeat tone, expressive intonation, slower pacing, simple language, brief pauses for suspense." },
  // New presets
  { label: "Radio Host", text: "Upbeat radio host style, friendly and engaging tone, moderate pacing, clear enunciation, light humor and energy." },
  { label: "News Anchor", text: "Neutral and professional news anchor tone, steady pacing, precise articulation, minimal emotion, authoritative delivery." },
  { label: "Meditation Guide", text: "Calm and soothing voice, slow and deliberate pacing, long gentle pauses, soft emphasis, relaxing cadence." },
  { label: "Customer Support", text: "Empathetic and helpful tone, patient pacing, clear and simple language, reassure the listener, polite phrasing." },
  { label: "Podcast Conversational", text: "Casual conversational tone, natural pacing, light humor, minimal formality, varied intonation as in dialogue." },
  { label: "Dramatic Trailer", text: "Deep and dramatic tone like a movie trailer, strong emphasis, suspenseful pauses, heightened intensity in key phrases." },
  { label: "Classroom Teacher", text: "Clear instructional tone, steady pacing, define terms before use, recap key points, encourage understanding." },
  { label: "Accessibility Readout", text: "Very clear enunciation, neutral tone, steady pacing, avoid idioms, describe structure and headings when relevant." },
  { label: "Legal Readout", text: "Formal and precise tone, measured pacing, emphasize clauses and definitions, maintain neutrality and clarity." },
  { label: "Medical Explanation", text: "Professional clinical tone, gentle and reassuring, define medical terms in simple language, measured pacing." },
  { label: "Sports Commentator", text: "Energetic and vibrant tone, quick pacing, dynamic intonation, heightened excitement on key moments." },
  { label: "ASMR Soft", text: "Very soft and gentle voice, whisper-like delivery, slow pacing, extended pauses, careful articulation." },
  { label: "Corporate Presentation", text: "Professional business tone, confident and clear, structured delivery, summarize key takeaways, moderate pacing." },
  { label: "Interviewer", text: "Curious and polite tone, conversational pacing, open-ended phrasing, emphasize questions with slight upward intonation." },
  { label: "Standup Comedian", text: "Playful and witty tone, varied pacing, strategic pauses for punchlines, slightly exaggerated emphasis." },
  { label: "Poetry Reading", text: "Lyrical and expressive tone, slow pacing, elongated vowels, deliberate pauses at line breaks, rich intonation." },
  { label: "Academic Serious", text: "Formal academic tone, precise language, measured pacing, cite definitions, minimal emotion, clear structure." },
  { label: "Casual Buddy", text: "Friendly and casual tone, relaxed pacing, simple language, supportive and easygoing vibe." },
  { label: "Thriller Narration", text: "Low and tense tone, slow pacing with suspenseful pauses, dramatic emphasis on critical words, creeping intensity." },
];

export default function VoiceSettings({ onSettingsChange, initialSettings }: VoiceSettingsProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const isPaidUser = session?.user?.subscriptionPlan === "paid";
  const [isExpanded, setIsExpanded] = useState(false);
  const [speed, setSpeed] = useState(initialSettings?.speed ?? 1.0);
  const [emotionalRange, setEmotionalRange] = useState(initialSettings?.emotionalRange ?? "Natural");
  const [tone, setTone] = useState(initialSettings?.tone ?? "Natural");
  const [intonation, setIntonation] = useState(initialSettings?.intonation ?? "Natural");
  const [customInstructions, setCustomInstructions] = useState(initialSettings?.customInstructions ?? "");
  const hasInitialized = useRef(false);

  const clampSpeed = (s: number) => Math.max(0.5, Math.min(2.0, parseFloat(s.toFixed(1))));

  const updateSettings = () => {
    const instructions: string[] = [];

    if (emotionalRange !== "Natural") {
      instructions.push(emotionalRange.toLowerCase());
    }
    if (tone !== "Natural") {
      instructions.push(tone.toLowerCase());
    }
    if (intonation !== "Natural") {
      instructions.push(intonation.toLowerCase());
    }
    if (customInstructions && customInstructions.trim()) {
      instructions.push(customInstructions.trim());
    }

    const fullInstructions =
      instructions.length > 0 ? instructions.join(". ") + "." : undefined;

    onSettingsChange({
      instructions: fullInstructions,
      speed: speed,
      emotionalRange: emotionalRange,
      tone: tone,
      intonation: intonation,
      customInstructions: customInstructions.trim() || undefined,
    });
  };
  
  // Initialize from initialSettings ONLY on first mount (when component is created)
  // This prevents the infinite loop where settings changes trigger prop updates that trigger state updates
  useEffect(() => {
    if (!hasInitialized.current && initialSettings) {
      hasInitialized.current = true;
      if (initialSettings.speed !== undefined) {
        setSpeed(initialSettings.speed);
      }
      if (initialSettings.emotionalRange !== undefined) {
        setEmotionalRange(initialSettings.emotionalRange);
      }
      if (initialSettings.tone !== undefined) {
        setTone(initialSettings.tone);
      }
      if (initialSettings.intonation !== undefined) {
        setIntonation(initialSettings.intonation);
      }
      if (initialSettings.customInstructions !== undefined) {
        setCustomInstructions(initialSettings.customInstructions);
      }
      // Trigger updateSettings after initial state is set
      setTimeout(() => {
        updateSettings();
      }, 100);
    }
  }, []); // Only run once on mount

  // Emotional Range Preview Player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>(toPreviewFilename(initialSettings?.emotionalRange ?? "Natural"));
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Tone Preview Player
  const toneAudioRef = useRef<HTMLAudioElement | null>(null);
  const [tonePreviewSrc, setTonePreviewSrc] = useState<string>(toTonePreviewFilename(initialSettings?.tone ?? "Natural"));
  const [isTonePreviewLoading, setIsTonePreviewLoading] = useState(false);
  const [isTonePreviewPlaying, setIsTonePreviewPlaying] = useState(false);

  // Intonation Preview Player
  const intonationAudioRef = useRef<HTMLAudioElement | null>(null);
  const [intonationPreviewSrc, setIntonationPreviewSrc] = useState<string>(toIntonationPreviewFilename(initialSettings?.intonation ?? "Natural"));
  const [isIntonationPreviewLoading, setIsIntonationPreviewLoading] = useState(false);
  const [isIntonationPreviewPlaying, setIsIntonationPreviewPlaying] = useState(false);

  // Accent Preview Player
  const accentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [accentPreviewSrc, setAccentPreviewSrc] = useState<string>("");
  const [isAccentPreviewPlaying, setIsAccentPreviewPlaying] = useState(false);
  const [isAccentPreviewLoading, setIsAccentPreviewLoading] = useState(false);

  // Age Preview Player
  const ageAudioRef = useRef<HTMLAudioElement | null>(null);
  const [agePreviewSrc, setAgePreviewSrc] = useState<string>("");
  const [isAgePreviewPlaying, setIsAgePreviewPlaying] = useState(false);
  const [isAgePreviewLoading, setIsAgePreviewLoading] = useState(false);
  
  // Speed preview player state
  const speedAudioRef = useRef<HTMLAudioElement | null>(null);
  const [speedPreviewSrc, setSpeedPreviewSrc] = useState<string>("");
  const [isSpeedPreviewLoading, setIsSpeedPreviewLoading] = useState(false);
  const [isSpeedPreviewPlaying, setIsSpeedPreviewPlaying] = useState(false);

  // Keep playbackRate in sync with selected speed
  useEffect(() => {
    if (speedAudioRef.current) {
      try { speedAudioRef.current.playbackRate = Math.max(0.5, Math.min(2.0, speed)); } catch {}
    }
  }, [speed]);

  const SAMPLE_SPEED_TEXT = "Experience the next generation of audiobook creation.\nOur system transforms written content into expressive, lifelike narration using advanced AI technology.";

  async function ensureSpeedPreviewLoaded() {
    if (speedPreviewSrc) return;
    setIsSpeedPreviewLoading(true);
    try {
      // Use only pre-generated static file
      const staticPath = '/speed-preview/preview.mp3';
      setSpeedPreviewSrc(staticPath);
    } finally {
      setIsSpeedPreviewLoading(false);
    }
  }

  const toggleSpeedPreview = async () => {
    await ensureSpeedPreviewLoaded();
    const srcReady = speedPreviewSrc;
    if (!srcReady) return;

    // If speed preview is already playing, just pause it (don't stop other previews)
    if (speedAudioRef.current && !speedAudioRef.current.paused) {
      speedAudioRef.current.pause();
      setIsSpeedPreviewPlaying(false);
      return;
    }

    // Otherwise, stop all other previews and play speed preview
    stopAllPreviews();

    if (!speedAudioRef.current) {
      const audio = new Audio(srcReady);
      speedAudioRef.current = audio;
      audio.preload = 'auto';
      audio.playbackRate = Math.max(0.5, Math.min(2.0, speed));
      audio.onplay = () => setIsSpeedPreviewPlaying(true);
      audio.onpause = () => setIsSpeedPreviewPlaying(false);
      audio.onended = () => setIsSpeedPreviewPlaying(false);
      try {
        await audio.play();
      } catch (e) {
        setIsSpeedPreviewPlaying(false);
      }
      return;
    }

    const audio = speedAudioRef.current;
    audio.playbackRate = Math.max(0.5, Math.min(2.0, speed));
    if (audio.paused) {
      try { await audio.play(); setIsSpeedPreviewPlaying(true); } catch { setIsSpeedPreviewPlaying(false); }
    } else {
      audio.pause();
      setIsSpeedPreviewPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      if (speedAudioRef.current) {
        try { speedAudioRef.current.pause(); } catch {}
        speedAudioRef.current = null;
      }
      if (speedPreviewSrc && speedPreviewSrc.startsWith('blob:')) {
        URL.revokeObjectURL(speedPreviewSrc);
      }
    };
  }, [speedPreviewSrc]);

  // Prepare preview source without auto-playing on mount
  useEffect(() => {
    setPreviewSrc(toPreviewFilename(emotionalRange));
  }, [emotionalRange]);

  // Stop all previews before playing a new one
  const stopAllPreviews = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPreviewPlaying(false);
    }
    if (toneAudioRef.current) {
      toneAudioRef.current.pause();
      toneAudioRef.current.currentTime = 0;
      setIsTonePreviewPlaying(false);
    }
    if (intonationAudioRef.current) {
      intonationAudioRef.current.pause();
      intonationAudioRef.current.currentTime = 0;
      setIsIntonationPreviewPlaying(false);
    }
    if (accentAudioRef.current) {
      accentAudioRef.current.pause();
      accentAudioRef.current.currentTime = 0;
      setIsAccentPreviewPlaying(false);
    }
    if (ageAudioRef.current) {
      ageAudioRef.current.pause();
      ageAudioRef.current.currentTime = 0;
      setIsAgePreviewPlaying(false);
    }
    if (speedAudioRef.current) {
      speedAudioRef.current.pause();
      speedAudioRef.current.currentTime = 0;
      setIsSpeedPreviewPlaying(false);
    }
  };

  const playPreviewFor = (range: string) => {
    stopAllPreviews(); // Stop all other previews first
    const src = toPreviewFilename(range);
    setPreviewSrc(src);
    setIsPreviewLoading(true);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.onended = () => setIsPreviewPlaying(false);
      audio.oncanplay = () => setIsPreviewLoading(false);
      audio.onerror = () => {
        setIsPreviewLoading(false);
        setIsPreviewPlaying(false);
      };
      audio.play().then(() => setIsPreviewPlaying(true)).catch(() => setIsPreviewPlaying(false));
    } catch {
      setIsPreviewPlaying(false);
      setIsPreviewLoading(false);
    }
  };

  const togglePreview = () => {
    const audio = audioRef.current;
    if (!audio) {
      stopAllPreviews(); // Stop all other previews first
      const a = new Audio(previewSrc);
      audioRef.current = a;
      a.onended = () => setIsPreviewPlaying(false);
      a.play().then(() => setIsPreviewPlaying(true)).catch(() => setIsPreviewPlaying(false));
      return;
    }
    if (audio.paused) {
      stopAllPreviews(); // Stop all other previews before playing
      audio.play().then(() => setIsPreviewPlaying(true)).catch(() => setIsPreviewPlaying(false));
    } else {
      audio.pause();
      setIsPreviewPlaying(false);
    }
  };

  const playAccentPreview = (accentOption: string) => {
    // No preview for None/default
    if (!accentOption || accentOption.toLowerCase() === "none") {
      setIsAccentPreviewPlaying(false);
      setAccentPreviewSrc("");
      return;
    }
    stopAllPreviews(); // Stop all other previews first
    const src = toAccentPreviewFilename(accentOption);
    setAccentPreviewSrc(src);
    setIsAccentPreviewLoading(true);
    try {
      if (accentAudioRef.current) {
        accentAudioRef.current.pause();
        accentAudioRef.current.currentTime = 0;
      }
      const audio = new window.Audio(src);
      accentAudioRef.current = audio;
      audio.onended = () => setIsAccentPreviewPlaying(false);
      audio.oncanplay = () => setIsAccentPreviewLoading(false);
      audio.onerror = () => {
        setIsAccentPreviewLoading(false);
        setIsAccentPreviewPlaying(false);
      };
      audio.play()
        .then(() => setIsAccentPreviewPlaying(true))
        .catch(() => setIsAccentPreviewPlaying(false));
    } catch {
      setIsAccentPreviewPlaying(false);
      setIsAccentPreviewLoading(false);
    }
  };

  const playAgePreview = (ageOption: string) => {
    if (!ageOption || ageOption.toLowerCase() === "default") {
      setIsAgePreviewPlaying(false);
      setAgePreviewSrc("");
      return;
    }
    stopAllPreviews(); // Stop all other previews first
    const src = toAgePreviewFilename(ageOption);
    setAgePreviewSrc(src);
    setIsAgePreviewLoading(true);
    try {
      if (ageAudioRef.current) {
        ageAudioRef.current.pause();
        ageAudioRef.current.currentTime = 0;
      }
      const audio = new window.Audio(src);
      ageAudioRef.current = audio;
      audio.onended = () => setIsAgePreviewPlaying(false);
      audio.oncanplay = () => setIsAgePreviewLoading(false);
      audio.onerror = () => {
        setIsAgePreviewLoading(false);
        setIsAgePreviewPlaying(false);
      };
      audio.play()
        .then(() => setIsAgePreviewPlaying(true))
        .catch(() => setIsAgePreviewPlaying(false));
    } catch {
      setIsAgePreviewPlaying(false);
      setIsAgePreviewLoading(false);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(clampSpeed(newSpeed));
    setTimeout(updateSettings, 100);
  };

  const incrementSpeed = (delta: number) => {
    handleSpeedChange(clampSpeed(speed + delta));
  };

  const handleEmotionalRangeChange = (value: string) => {
    setEmotionalRange(value);
    setTimeout(() => {
      updateSettings();
      // Only play on explicit user change
      playPreviewFor(value);
    }, 100);
  };

  const handleToneChange = (value: string) => {
    setTone(value);
    setTimeout(() => {
      updateSettings();
      // Tone preview play on user change
      stopAllPreviews(); // Stop all other previews first
      const src = toTonePreviewFilename(value);
      setTonePreviewSrc(src);
      setIsTonePreviewLoading(true);
      try {
        if (toneAudioRef.current) {
          toneAudioRef.current.pause();
          toneAudioRef.current.currentTime = 0;
        }
        const audio = new Audio(src);
        toneAudioRef.current = audio;
        audio.onended = () => setIsTonePreviewPlaying(false);
        audio.oncanplay = () => setIsTonePreviewLoading(false);
        audio.onerror = () => {
          setIsTonePreviewLoading(false);
          setIsTonePreviewPlaying(false);
        };
        audio.play().then(() => setIsTonePreviewPlaying(true)).catch(() => setIsTonePreviewPlaying(false));
      } catch {
        setIsTonePreviewPlaying(false);
        setIsTonePreviewLoading(false);
      }
    }, 100);
  };

  const handleIntonationChange = (value: string) => {
    setIntonation(value);
    setTimeout(() => {
      updateSettings();
      // Intonation preview play on user change
      stopAllPreviews(); // Stop all other previews first
      const src = toIntonationPreviewFilename(value);
      setIntonationPreviewSrc(src);
      setIsIntonationPreviewLoading(true);
      try {
        if (intonationAudioRef.current) {
          intonationAudioRef.current.pause();
          intonationAudioRef.current.currentTime = 0;
        }
        const audio = new Audio(src);
        intonationAudioRef.current = audio;
        audio.onended = () => setIsIntonationPreviewPlaying(false);
        audio.oncanplay = () => setIsIntonationPreviewLoading(false);
        audio.onerror = () => {
          setIsIntonationPreviewLoading(false);
          setIsIntonationPreviewPlaying(false);
        };
        audio.play().then(() => setIsIntonationPreviewPlaying(true)).catch(() => setIsIntonationPreviewPlaying(false));
      } catch {
        setIsIntonationPreviewPlaying(false);
        setIsIntonationPreviewLoading(false);
      }
    }, 100);
  };

  const handleCustomInstructionsChange = (value: string) => {
    setCustomInstructions(value);
    setTimeout(updateSettings, 100);
  };

  const applyPresetInstruction = (text: string) => {
    setCustomInstructions(text);
    setTimeout(updateSettings, 100);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-card rounded-lg border shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex flex-col items-start">
          <h3 className="text-lg font-semibold">Advanced Voice Settings</h3>
          <p className="text-sm text-muted-foreground">
            Customize accent, emotions, tone, speed, and more
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div
          className={`p-6 pt-0 space-y-6 relative ${
            !isPaidUser ? "pointer-events-none" : ""
          }`}
          onClick={(e) => {
            if (!isPaidUser) {
              e.stopPropagation();
              toast.warning(
                "Premium Feature",
                "Advanced voice settings are only available for paid users. Upgrade your plan to unlock!",
                5000
              );
            }
          }}
        >
          {!isPaidUser && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-4xl">🔒</div>
                <p className="font-semibold text-lg">Premium Feature</p>
                <p className="text-sm text-muted-foreground">
                  Upgrade to customize voice settings
                </p>
              </div>
            </div>
          )}

          {/* Speed Control */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-3">
              <span>Speech Speed: {speed.toFixed(1)}x</span>
              <Button
                type="button"
                variant="secondary"
                className="h-7 px-2 text-xs"
                onClick={toggleSpeedPreview}
                disabled={isSpeedPreviewLoading}
                title={isSpeedPreviewPlaying ? "Pause preview" : "Play preview"}
              >
                {isSpeedPreviewPlaying ? "Pause" : "Play"}
              </Button>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Slow</span>
              <Button
                type="button"
                variant="secondary"
                className="h-6 px-2 text-md"
                onClick={() => incrementSpeed(-0.1)}
              >
                -
              </Button>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="flex-1 accent-blue-950"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-6 px-2 text-md"
                onClick={() => incrementSpeed(0.1)}
              >
                +
              </Button>
              <span className="text-xs text-muted-foreground">Fast</span>
            </div>
            <div className="flex flex-wrap justify-center gap-[11px] mt-3">
              {Array.from({ length: 16 }, (_, i) => 0.5 + i * 0.1).map(
                (val) => (
                  <Button
                    key={val.toFixed(1)}
                    type="button"
                    variant={
                      Math.abs(speed - val) < 0.05 ? "default" : "outline"
                    }
                    className="h-7 px-2 text-xs"
                    onClick={() => handleSpeedChange(val)}
                  >
                    {val.toFixed(1)}
                  </Button>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex justify-center">
              0.5x = Half speed (more dramatic) • 1.0x = Normal • 2.0x = Double
              speed (energetic)
            </p>
          </div>

          {/* Emotional Range */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Emotional Range
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOTIONAL_RANGES.map((range) => (
                <Button
                  key={range}
                  type="button"
                  variant={emotionalRange === range ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => handleEmotionalRangeChange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Controls the level of emotional expression in speech
            </p>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium mb-2">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={tone === t ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => handleToneChange(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Adjusts the overall tone and character of the voice
            </p>
          </div>

          {/* Intonation */}
          <div>
            <label className="block text-sm font-medium mb-2">Intonation</label>
            <div className="flex flex-wrap gap-2">
              {INTONATION_OPTIONS.map((int) => (
                <Button
                  key={int}
                  type="button"
                  variant={intonation === int ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => handleIntonationChange(int)}
                >
                  {int}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Controls pitch variation and emphasis patterns
            </p>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Custom Instructions (Optional)
            </label>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_INSTRUCTIONS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => applyPresetInstruction(p.text)}
                  title={p.text}
                >
                  {p.label}
                </Button>
              ))}
              {customInstructions && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={() => applyPresetInstruction("")}
                >
                  Clear
                </Button>
              )}
            </div>

            <textarea
              value={customInstructions}
              onChange={(e) => handleCustomInstructionsChange(e.target.value)}
              placeholder="Describe style, tone, pacing, emphasis, audience, and pauses. Example: 'Documentary narrator, calm and composed, smooth intonation, light emphasis, natural pacing.'"
              className="w-full p-3 border rounded-md bg-background min-h-[100px] text-sm"
              maxLength={500}
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Be specific and concise. Combine 3–5 attributes for best
                results.
              </p>
              <span className="text-xs text-muted-foreground">
                {customInstructions.length}/500
              </span>
            </div>
          </div>

          {/* Example Combinations */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm font-medium mb-3">💡 Popular Combinations:</p>
            <div className="space-y-2">
              {[
                {
                  label: "Audiobook",
                  settings: {
                    EmotionalRange: "Dramatic and expressive",
                    Tone: "Warm and friendly",
                    Intonation: "Expressive with variation",
                    Speed: 0.9,
                  },
                },
                {
                  label: "Professional",
                  settings: {
                    EmotionalRange: "Natural",
                    Tone: "Confident and authoritative",
                    Intonation: "Natural",
                    Speed: 1.0,
                  },
                },
                {
                  label: "Storytelling",
                  settings: {
                    EmotionalRange: "Dramatic and expressive",
                    Tone: "Warm and friendly",
                    Intonation: "Smooth and flowing",
                    Speed: 1.1,
                  },
                },
              ].map(({ label, settings }) => (
                <div key={label} className="flex items-start gap-2 text-xs">
                  <Button
                    type="button"
                    className="h-6 px-2 rounded bg-foreground text-background"
                    onClick={() => {
                      setEmotionalRange(settings.EmotionalRange);
                      setTone(settings.Tone);
                      setIntonation(settings.Intonation);
                      setSpeed(settings.Speed);
                      setTimeout(updateSettings, 0);
                    }}
                  >
                    Apply
                  </Button>
                  <div className="text-muted-foreground">
                    <strong className="text-foreground underline">
                      {label}:
                    </strong>{" "}
                    Emotional Range: {settings.EmotionalRange} • Tone:{" "}
                    {settings.Tone} • Intonation: {settings.Intonation} • Speed:{" "}
                    {settings.Speed.toFixed(1)}x
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

