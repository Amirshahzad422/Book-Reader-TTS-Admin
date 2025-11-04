#!/usr/bin/env node
/*
  Generate Emotional Range audio previews and save to public/emotional-range-previews

  Usage:
    OPENAI_API_KEY=sk-... node scripts/generate-emotional-range-previews.js [voiceId]

  - voiceId is one of: alloy, ash, coral, echo, fable, nova, onyx, sage, shimmer
  - default voice is 'fable'
*/

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const VALID_VOICES = ['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];

const EMOTIONAL_RANGES = [
  'Natural',
  'Cheerful and upbeat',
  'Calm and soothing',
  'Excited and energetic',
  'Professional and formal',
  'Friendly and casual',
  'Dramatic and expressive',
];

const SAMPLE_LINES = {
  'Natural': 'This is a simple test of my natural voice.',
  'Cheerful and upbeat': 'What a wonderful day to start something new!',
  'Calm and soothing': 'Take a deep breath and relax your mind.',
  'Excited and energetic': "Let's get this project rolling — it's going to be amazing!",
  'Professional and formal': 'Please submit your report by the end of the day.',
  'Friendly and casual': "Hey there! How's everything going today?",
  'Dramatic and expressive': 'The storm raged on, but hope still burned bright!',
};

function toKebab(input) {
  return input
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY is not set. Please provide it in the environment.');
    process.exit(1);
  }

  const voiceArg = process.argv[2];
  const voice = VALID_VOICES.includes((voiceArg || '').toLowerCase()) ? voiceArg.toLowerCase() : 'fable';

  const openai = new OpenAI({ apiKey });

  const outDir = path.join(__dirname, '..', 'public', 'emotional-range-previews');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('🎙️ Generating Emotional Range previews using voice:', voice);
  console.log('📁 Output directory:', outDir);

  for (const range of EMOTIONAL_RANGES) {
    const fileName = `${toKebab(range)}.mp3`;
    const filePath = path.join(outDir, fileName);
    const input = SAMPLE_LINES[range];

    // Build instruction string to steer TTS style
    const instructions = range.toLowerCase();

    try {
      console.log(`→ Creating preview for: ${range} → ${fileName}`);
      const resp = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice,
        input,
        speed: 1.0,
        instructions,
        response_format: 'mp3',
      });

      const audioBuffer = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(filePath, audioBuffer);
      console.log(`✅ Saved: ${fileName} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`❌ Failed for ${range}:`, err?.message || err);
    }
  }

  console.log('✨ Emotional Range preview generation complete.');
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});


