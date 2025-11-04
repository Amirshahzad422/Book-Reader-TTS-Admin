import { NextRequest, NextResponse } from 'next/server';

// Demo mode - returns a pre-generated audio sample
export async function POST(request: NextRequest) {
  try {
    console.log('Demo mode: Generating sample audio...');
    
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create a simple audio buffer (silence) as demo
    // In a real demo, you'd serve a pre-recorded sample
    const sampleRate = 44100;
    const duration = 10; // 10 seconds
    const numSamples = sampleRate * duration;
    const audioBuffer = new ArrayBuffer(numSamples * 2);
    const view = new DataView(audioBuffer);

    // Generate a simple tone for demo purposes
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1; // 440Hz tone at low volume
      const intSample = Math.max(-32768, Math.min(32767, sample * 32767));
      view.setInt16(i * 2, intSample, true);
    }

    console.log('Demo audio generated successfully');

    // Return as Uint8Array
    const uint8 = new Uint8Array(audioBuffer);
    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': uint8.byteLength.toString(),
        'Content-Disposition': 'attachment; filename="demo-audio.wav"',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error in demo mode:', error);
    return NextResponse.json({ 
      error: 'Demo mode failed. Please try again.' 
    }, { status: 500 });
  }
}
