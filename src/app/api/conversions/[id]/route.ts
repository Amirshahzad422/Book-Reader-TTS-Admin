import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await params;
    
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
    const conversionId = id;

    // Fetch conversion to verify ownership and get file paths
    const { data: conversion, error: fetchError } = await supabaseAdmin!
      .from('conversions')
      .select('pdf_path, audio_path')
      .eq('id', conversionId)
      .eq('user_id', userId)
      .single() as { data: { pdf_path: string | null; audio_path: string | null } | null; error: any };

    if (fetchError || !conversion) {
      return NextResponse.json({ error: 'Conversion not found' }, { status: 404 });
    }

    // Delete files from storage
    const filesToDelete: string[] = [];
    if (conversion.pdf_path) filesToDelete.push(conversion.pdf_path);
    if (conversion.audio_path) filesToDelete.push(conversion.audio_path);

    if (filesToDelete.length > 0) {
      // Delete PDFs
      const pdfFiles = filesToDelete.filter(f => f.includes('.pdf'));
      if (pdfFiles.length > 0) {
        await supabaseAdmin!.storage.from('pdfs').remove(pdfFiles);
      }

      // Delete audio files
      const audioFiles = filesToDelete.filter(f => f.includes('.mp3'));
      if (audioFiles.length > 0) {
        await supabaseAdmin!.storage.from('audio').remove(audioFiles);
      }
    }

    // Delete conversion record from database
    const { error: deleteError } = await supabaseAdmin!
      .from('conversions')
      .delete()
      .eq('id', conversionId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Delete conversion error:', deleteError);
      return NextResponse.json({ error: `Failed to delete conversion: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete conversion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete conversion' },
      { status: 500 }
    );
  }
}

