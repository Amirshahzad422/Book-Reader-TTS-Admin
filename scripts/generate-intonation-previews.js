#!/usr/bin/env node
/*
  Generate Intonation audio previews and save to public/intonation-previews using onyx voice

  Usage:
    OPENAI_API_KEY=sk-... node scripts/generate-intonation-previews.js

  Notes:
    - Uses model 'gpt-4o-mini-tts'
    - Uses voice 'onyx'
*/

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const INTONATION_OPTIONS = [
  'Natural',
  'Monotone',
  'Expressive with variation',
  'Smooth and flowing',
  'Emphasized and dramatic',
];

const SAMPLE_LINES = {
  'Natural': 'This is my normal speaking pattern.',
  'Monotone': 'This sentence has no variation in pitch.',
  'Expressive with variation': 'Wow, that was absolutely incredible!',
  'Smooth and flowing': 'The river moves gently beneath the golden sky.',
  'Emphasized and dramatic': "Now this... this is the moment we've been waiting for!",
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

  const openai = new OpenAI({ apiKey });

  const outDir = path.join(__dirname, '..', 'public', 'intonation-previews');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('🎙️ Generating Intonation previews using voice: onyx');
  console.log('📁 Output directory:', outDir);

  for (const opt of INTONATION_OPTIONS) {
    const fileName = `${toKebab(opt)}.mp3`;
    const filePath = path.join(outDir, fileName);
    const input = SAMPLE_LINES[opt];
    const instructions = opt.toLowerCase();

    try {
      console.log(`→ Creating preview for: ${opt} → ${fileName}`);
      const resp = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'onyx',
        input,
        speed: 1.0,
        instructions,
        response_format: 'mp3',
      });

      const audioBuffer = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(filePath, audioBuffer);
      console.log(`✅ Saved: ${fileName} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`❌ Failed for ${opt}:`, err?.message || err);
    }
  }

  console.log('✨ Intonation preview generation complete.');
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});


