export interface Voice {
  id: string;
  name: string;
  description: string;
  gender: string;
  accent: string;
  personality: string;
  color: string;
}

export const AVAILABLE_VOICES: Voice[] = [
  {
    id: "alloy",
    name: "Alloy",
    description: "Neutral and versatile voice, great for any content",
    gender: "Neutral",
    accent: "American",
    personality: "Professional, Clear",
    color: "bg-blue-500"
  },
  {
    id: "echo",
    name: "Echo",
    description: "Clear male voice, perfect for professional content",
    gender: "Male",
    accent: "American", 
    personality: "Authoritative, Confident",
    color: "bg-green-500"
  },
  {
    id: "fable",
    name: "Fable",
    description: "British narrator voice, excellent for storytelling",
    gender: "Male",
    accent: "British",
    personality: "Sophisticated, Engaging",
    color: "bg-purple-500"
  },
  {
    id: "onyx",
    name: "Onyx",
    description: "Deep, warm male voice, ideal for audiobooks",
    gender: "Male",
    accent: "American",
    personality: "Deep, Warm, Emotional",
    color: "bg-gray-800"
  },
  {
    id: "nova",
    name: "Nova",
    description: "Young adult female voice, friendly and approachable",
    gender: "Female",
    accent: "American",
    personality: "Friendly, Energetic",
    color: "bg-pink-500"
  },
  {
    id: "shimmer",
    name: "Shimmer",
    description: "Soft, whispery female voice, calming and gentle",
    gender: "Female",
    accent: "American",
    personality: "Soft, Gentle, Calming",
    color: "bg-indigo-500"
  },
  {
    id: "ash",
    name: "Ash",
    description: "Calm and thoughtful male voice",
    gender: "Male",
    accent: "American",
    personality: "Calm, Thoughtful",
    color: "bg-slate-500"
  },
  {
    id: "coral",
    name: "Coral",
    description: "Bright and energetic female voice",
    gender: "Female",
    accent: "American",
    personality: "Bright, Energetic",
    color: "bg-rose-500"
  },
  {
    id: "sage",
    name: "Sage",
    description: "Wise and trustworthy male voice",
    gender: "Male",
    accent: "American",
    personality: "Wise, Trustworthy",
    color: "bg-emerald-500"
  }
];

export const VOICE_IDS = AVAILABLE_VOICES.map(v => v.id);

