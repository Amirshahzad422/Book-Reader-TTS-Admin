#!/usr/bin/env node
/*
  Pre-generate Speed Preview audio and save to public/speed-preview using OpenAI TTS

  Usage:
    OPENAI_API_KEY=sk-... node scripts/generate-speed-preview.js

  Notes:
    - Uses model 'gpt-4o-mini-tts'
    - Voice: 'onyx'
    - Output: public/speed-preview/preview.mp3
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

  const outDir = path.join(__dirname, '..', 'public', 'speed-preview');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const fileName = 'preview.mp3';
  const filePath = path.join(outDir, fileName);

  const input = 'Experience the next generation of audiobook creation.\nOur system transforms written content into expressive, lifelike narration using advanced AI technology.';
  const instructions = 'Neutral professional narration, clear enunciation, natural pacing.';

  try {
    console.log(`→ Creating speed preview → ${fileName}`);
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
    console.error('❌ Failed to generate speed preview:', err?.message || err);
    process.exit(1);
  }

  console.log('✨ Speed preview generation complete.');
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});
