#!/usr/bin/env node
/*
  Generate Tone audio previews and save to public/tone-previews using onyx voice

  Usage:
    OPENAI_API_KEY=sk-... node scripts/generate-tone-previews.js

  Notes:
    - Uses model 'gpt-4o-mini-tts'
    - Uses voice 'onyx' as requested
*/

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const TONE_OPTIONS = [
  'Natural',
  'Warm and friendly',
  'Confident and authoritative',
  'Gentle and soft',
  'Energetic and vibrant',
  'Calm and composed',
];

const SAMPLE_LINES = {
  'Natural': "I’m speaking with my regular tone.",
  'Warm and friendly': "It’s so nice to see you again!",
  'Confident and authoritative': "Here’s the plan — and we’re sticking to it.",
  'Gentle and soft': "Everything will be okay, just take it slow.",
  'Energetic and vibrant': "Let’s make this the best one yet!",
  'Calm and composed': "We’ll handle this one step at a time.",
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

  const outDir = path.join(__dirname, '..', 'public', 'tone-previews');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('🎙️ Generating Tone previews using voice: onyx');
  console.log('📁 Output directory:', outDir);

  for (const tone of TONE_OPTIONS) {
    const fileName = `${toKebab(tone)}.mp3`;
    const filePath = path.join(outDir, fileName);
    const input = SAMPLE_LINES[tone];
    const instructions = tone.toLowerCase();

    try {
      console.log(`→ Creating preview for: ${tone} → ${fileName}`);
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
      console.error(`❌ Failed for ${tone}:`, err?.message || err);
    }
  }

  console.log('✨ Tone preview generation complete.');
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});



