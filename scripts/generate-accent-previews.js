#!/usr/bin/env node
/*
  Generate Accent audio previews and save to public/accent-previews using OpenAI TTS

  Usage:
    OPENAI_API_KEY=sk-... node scripts/generate-accent-previews.js

  Notes:
    - Uses model 'gpt-4o-mini-tts'
    - Uses default voice ('fable')
*/
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const ACCENT_OPTIONS = [
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
  const outDir = path.join(__dirname, '..', 'public', 'accent-previews');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('🎙️ Generating Accent previews using voice: fable');
  console.log('📁 Output directory:', outDir);

  for (const accent of ACCENT_OPTIONS) {
    const fileName = `${toKebab(accent)}.mp3`;
    const filePath = path.join(outDir, fileName);
    const input = `This is a preview of the ${accent} accent.`;
    const instructions = `Use a ${accent} accent.`;
    try {
      console.log(`→ Creating preview for: ${accent} → ${fileName}`);
      const resp = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'fable',
        input,
        speed: 1.0,
        instructions,
        response_format: 'mp3',
      });
      const audioBuffer = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(filePath, audioBuffer);
      console.log(`✅ Saved: ${fileName} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`❌ Failed for ${accent}:`, err?.message || err);
    }
  }

  console.log('✨ Accent preview generation complete.');
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});
