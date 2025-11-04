#!/usr/bin/env node
/*
  Generate Donald Trump Impression audio preview and save to public/impression-previews using OpenAI TTS

  Usage:
    OPENAI_API_KEY=sk-... node scripts/generate-impression-previews.js

  Notes:
    - Uses model 'gpt-4o-mini-tts'
    - Uses default voice ('fable')
*/
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY is not set. Please provide it in the environment.');
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey });
  const outDir = path.join(__dirname, '..', 'public', 'impression-previews');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const impression = 'Movie Trailer Voice';
  const fileName = `movie-trailer-voice.mp3`;
  const filePath = path.join(outDir, fileName);
  const input = "In a world where voices come to life, only one can be heard.";
  const instructions = "Use a deep, dramatic movie trailer narration style. Insert the exact phrase 'text-to-speech' exactly once (one time only), after a brief dramatic pause. Emphasize the phrase strongly. Do not repeat it more than once and do not include it unless instructed here.";
  try {
    console.log(`→ Creating preview for: ${impression} → ${fileName}`);
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
    console.error(`❌ Failed for Movie Trailer Voice:`, err?.message || err);
  }
  console.log('✨ Impression preview generation complete.');
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});
