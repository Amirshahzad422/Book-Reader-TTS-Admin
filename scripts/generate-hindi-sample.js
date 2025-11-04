#!/usr/bin/env node
/*
  Generate a Hindi TTS sample and save to public/hindi-previews using OpenAI TTS

  Usage:
    OPENAI_API_KEY=sk-... node scripts/generate-hindi-sample.js

  Notes:
    - Uses model 'gpt-4o-mini-tts'
    - Voice can be changed; using 'onyx' by default
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

  const outDir = path.join(__dirname, '..', 'public', 'hindi-previews');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const fileName = 'namaste.mp3';
  const filePath = path.join(outDir, fileName);

  // Hindi sample line (neutral, clear pronunciation)
  const input = 'नमस्ते! यह एक हिंदी आवाज़ का नमूना है, ताकि आप गुणवत्ता जाँच सकें।';
  const instructions = 'Speak fluent Hindi with natural pronunciation, neutral tone, and clear enunciation.';

  try {
    console.log(`→ Creating Hindi sample → ${fileName}`);
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
    console.error('❌ Failed to generate Hindi sample:', err?.message || err);
    process.exit(1);
  }

  console.log('✨ Hindi TTS sample generation complete.');
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});
