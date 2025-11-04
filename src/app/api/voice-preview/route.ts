import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Define the OpenAI voice type
type OpenAIVoice = 'alloy' | 'ash' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer';

// Use single API key from environment
const API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Check if we have an API key
    if (!API_KEY) {
      return NextResponse.json({ 
        error: 'No OpenAI API key configured.' 
      }, { status: 500 });
    }

    const { text, voice } = await request.json();

    if (!text || !voice) {
      return NextResponse.json({ 
        error: 'Text and voice are required' 
      }, { status: 400 });
    }

    // Validate voice option
    const validVoices: OpenAIVoice[] = ['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer'];
    if (!validVoices.includes(voice as OpenAIVoice)) {
      return NextResponse.json({ 
        error: 'Invalid voice option' 
      }, { status: 400 });
    }

    console.log(`Generating voice preview for: ${voice}`);

    try {
      const openai = new OpenAI({
        apiKey: API_KEY,
      });

      // Generate short preview audio
      const mp3 = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts", // New advanced model
        voice: voice as OpenAIVoice,
        input: text,
        speed: 1.0, // Normal speed for previews
        response_format: "mp3",
      });

      // Convert to Uint8Array
      const audioUint8 = new Uint8Array(await mp3.arrayBuffer());

      console.log(`✅ Voice preview generated successfully: ${audioUint8.byteLength} bytes`);

      // Return audio file
      return new NextResponse(audioUint8, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioUint8.byteLength.toString(),
          'Cache-Control': 'public, max-age=3600', // Cache previews for 1 hour
        },
      });

    } catch (error) {
      console.error('❌ API call failed for voice preview:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error generating voice preview:', error);
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Quota and rate limiting
      if (errorMessage.includes('quota') || 
          errorMessage.includes('rate limit') || 
          errorMessage.includes('too many requests') ||
          errorMessage.includes('insufficient_quota') ||
          errorMessage.includes('all api keys have exceeded') ||
          errorMessage.includes('429')) {
        return NextResponse.json({ 
          error: 'Voice preview unavailable due to API quota limits. The main conversion will still work with billing setup.' 
        }, { status: 429 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to generate voice preview. Please try the main conversion instead.' 
    }, { status: 500 });
  }
}
