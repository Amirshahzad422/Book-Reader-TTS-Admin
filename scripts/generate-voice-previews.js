const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// All available voices
const voices = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and versatile voice, great for any content', gender: 'Neutral', accent: 'American', personality: 'Professional, Clear', color: 'bg-blue-500' },
  { id: 'echo', name: 'Echo', description: 'Clear male voice, perfect for professional content', gender: 'Male', accent: 'American', personality: 'Authoritative, Confident', color: 'bg-green-500' },
  { id: 'fable', name: 'Fable', description: 'British narrator voice, excellent for storytelling', gender: 'Male', accent: 'British', personality: 'Sophisticated, Engaging', color: 'bg-purple-500' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, warm male voice, ideal for audiobooks', gender: 'Male', accent: 'American', personality: 'Deep, Warm, Emotional', color: 'bg-gray-800' },
  { id: 'nova', name: 'Nova', description: 'Young adult female voice, friendly and approachable', gender: 'Female', accent: 'American', personality: 'Friendly, Energetic', color: 'bg-pink-500' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft, whispery female voice, calming and gentle', gender: 'Female', accent: 'American', personality: 'Soft, Gentle, Calming', color: 'bg-indigo-500' },
  { id: 'ash', name: 'Ash', description: 'Male voice with calm, thoughtful tone', gender: 'Male', accent: 'American', personality: 'Calm, Thoughtful', color: 'bg-slate-500' },
  { id: 'ballad', name: 'Ballad', description: 'Male voice with expressive, narrative quality', gender: 'Male', accent: 'American', personality: 'Expressive, Narrative', color: 'bg-orange-500' },
  { id: 'coral', name: 'Coral', description: 'Female voice with bright, energetic tone', gender: 'Female', accent: 'American', personality: 'Bright, Energetic', color: 'bg-rose-500' },
  { id: 'sage', name: 'Sage', description: 'Male voice with wise, trustworthy presence', gender: 'Male', accent: 'American', personality: 'Wise, Trustworthy', color: 'bg-emerald-500' },
];

async function generateVoicePreviews() {
  const previewText = (name) => `My name is ${name}. I'm here to give your text a voice so you can listen.`;
  
  const outputDir = path.join(__dirname, '../public/voice-previews');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎙️ Generating voice previews...\n');

  for (const voice of voices) {
    try {
      console.log(`Generating preview for ${voice.name} (${voice.id})...`);
      
      const speech = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice.id,
        input: previewText(voice.name),
        speed: 1.0,
        response_format: 'mp3',
      });

      const audioBuffer = Buffer.from(await speech.arrayBuffer());
      const filePath = path.join(outputDir, `${voice.id}.mp3`);
      
      fs.writeFileSync(filePath, audioBuffer);
      
      console.log(`✅ Saved ${voice.name} preview (${audioBuffer.length} bytes)\n`);
    } catch (error) {
      console.error(`❌ Failed to generate preview for ${voice.name}:`, error.message);
    }
  }

  console.log('✨ Voice preview generation complete!');
}

// Run the script
generateVoicePreviews().catch(console.error);

