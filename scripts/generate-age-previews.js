#!/usr/bin/env node
/*
  Generate Age audio previews and save to public/age-previews using OpenAI TTS

  Usage:
    OPENAI_API_KEY=sk-... node scripts/generate-age-previews.js

  Notes:
    - Uses model 'gpt-4o-mini-tts'
    - Uses default voice ('fable')
*/
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const AGE_OPTIONS = [
  "Child voice",
  "Young voice",
  "Mature voice",
  "Elderly voice"
];

const EXAMPLES = {
  "Child voice": "Hi! Want to play a game with me?",
  "Young voice": "Guess what? I just finished my homework early!",
  "Mature voice": "Let's focus on achieving our goals for today.",
  "Elderly voice": "Back in my day, things were a little different, you know.",
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
  const outDir = path.join(__dirname, '..', 'public', 'age-previews');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  console.log('🎙️ Generating Age previews using voice: fable');
  console.log('📁 Output directory:', outDir);
  for (const age of AGE_OPTIONS) {
    const fileName = `${toKebab(age)}.mp3`;
    const filePath = path.join(outDir, fileName);
    const input = EXAMPLES[age] || `This is a preview for a ${age}.`;
    const instructions = `Speak with a ${age.toLowerCase()}.`;
    try {
      console.log(`→ Creating preview for: ${age} → ${fileName}`);
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
      console.error(`❌ Failed for ${age}:`, err?.message || err);
    }
  }
  console.log('✨ Age preview generation complete.');
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});
