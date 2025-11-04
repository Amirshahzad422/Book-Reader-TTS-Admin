import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from database (lookup by email to ensure we have the UUID)
    // This handles cases where session.user.id might be a provider ID instead of UUID
    let userId = session.user.id;
    
    // Check if userId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      // Not a UUID, look up by email
      const { data: dbUser, error: lookupError } = await supabaseAdmin!
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .maybeSingle() as { data: { id: string } | null; error: any };
      
      if (lookupError || !dbUser) {
        console.error('User lookup error:', lookupError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      userId = dbUser.id;
    }
    const body = await request.json();
    const { pdfFile, audioBlob, pdfFilename, voiceSettings, textLength } = body;

    if (!pdfFile && !audioBlob) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Generate conversion ID
    const conversionId = crypto.randomUUID();
    const userFolder = `${userId}/${conversionId}`;

    let pdfPath: string | null = null;
    let audioPath: string | null = null;
    let pdfSize = 0;
    let audioSize = 0;
    let audioDuration: number | null = null;

    // Upload PDF if provided
    if (pdfFile) {
      try {
        // Extract base64 data (remove data:application/pdf;base64, prefix if present)
        const base64Data = pdfFile.includes(',') ? pdfFile.split(',')[1] : pdfFile;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        pdfPath = `${userFolder}/${pdfFilename || 'document.pdf'}`;
        
        const { data: pdfData, error: pdfError } = await supabaseAdmin!.storage
          .from('pdfs')
          .upload(pdfPath, bytes, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (pdfError) {
          console.error('PDF upload error:', pdfError);
          return NextResponse.json({ error: `Failed to upload PDF: ${pdfError.message}` }, { status: 500 });
        }

        pdfSize = bytes.byteLength;
      } catch (error) {
        console.error('PDF processing error:', error);
        return NextResponse.json({ error: 'Failed to process PDF file' }, { status: 500 });
      }
    }

    // Upload audio if provided
    if (audioBlob) {
      try {
        // Extract base64 data (remove data:audio/mpeg;base64, prefix if present)
        const base64Data = audioBlob.includes(',') ? audioBlob.split(',')[1] : audioBlob;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Calculate audio duration
        try {
          const musicMetadata = await import('music-metadata');
          // Convert Uint8Array to Buffer for music-metadata
          const buffer = Buffer.from(bytes);
          const metadata = await musicMetadata.parseBuffer(buffer);
          audioDuration = metadata.format.duration || null;
        } catch (durationError) {
          // If duration calculation fails, continue without it
          console.warn('Could not calculate audio duration:', durationError);
          audioDuration = null;
        }
        
        audioPath = `${userFolder}/output.mp3`;
        
        const { data: audioData, error: audioError } = await supabaseAdmin!.storage
          .from('audio')
          .upload(audioPath, bytes, {
            contentType: 'audio/mpeg',
            upsert: false
          });

        if (audioError) {
          console.error('Audio upload error:', audioError);
          return NextResponse.json({ error: `Failed to upload audio: ${audioError.message}` }, { status: 500 });
        }

        audioSize = bytes.byteLength;
      } catch (error) {
        console.error('Audio processing error:', error);
        return NextResponse.json({ error: 'Failed to process audio file' }, { status: 500 });
      }
    }

    // Save conversion record to database
    const { data: conversion, error: dbError } = await supabaseAdmin!
      .from('conversions')
      .insert({
        id: conversionId,
        user_id: userId,
        pdf_path: pdfPath || '', // Required field, use empty string if no PDF
        audio_path: audioPath,
        pdf_filename: pdfFilename || 'document.pdf',
        pdf_size: pdfSize,
        audio_size: audioPath ? audioSize : null,
        voice: voiceSettings?.voice || 'fable',
        voice_settings: voiceSettings || {},
        text_length: textLength || null,
        audio_duration: audioDuration,
        status: 'completed',
        completed_at: new Date().toISOString()
      } as any)
      .select()
      .single() as { data: any; error: any };

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded files if DB insert fails
      if (pdfPath) {
        await supabaseAdmin!.storage.from('pdfs').remove([pdfPath]);
      }
      if (audioPath) {
        await supabaseAdmin!.storage.from('audio').remove([audioPath]);
      }
      return NextResponse.json({ error: `Failed to save conversion: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      conversion: {
        id: conversion.id,
        pdf_path: conversion.pdf_path,
        audio_path: conversion.audio_path,
        created_at: conversion.created_at
      }
    });
  } catch (error) {
    console.error('Save conversion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save conversion' },
      { status: 500 }
    );
  }
}

