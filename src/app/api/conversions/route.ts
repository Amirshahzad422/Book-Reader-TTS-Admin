import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch conversions for user
    const { data: conversions, error } = await supabaseAdmin!
      .from('conversions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1) as { data: any[] | null; error: any };

    if (error) {
      console.error('Fetch conversions error:', error);
      return NextResponse.json({ error: `Failed to fetch conversions: ${error.message}` }, { status: 500 });
    }

    // Get count for pagination
    const { count } = await supabaseAdmin!
      .from('conversions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    // Generate signed URLs for files
    const conversionsWithUrls = await Promise.all(
      (conversions || []).map(async (conv: any) => {
        const pdfUrl = conv.pdf_path
          ? await supabaseAdmin!.storage.from('pdfs').createSignedUrl(conv.pdf_path, 3600)
          : null;
        const audioUrl = conv.audio_path
          ? await supabaseAdmin!.storage.from('audio').createSignedUrl(conv.audio_path, 3600)
          : null;

        return {
          ...conv,
          pdf_url: pdfUrl?.data?.signedUrl || null,
          audio_url: audioUrl?.data?.signedUrl || null
        };
      })
    );

    return NextResponse.json({
      conversions: conversionsWithUrls,
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Fetch conversions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversions' },
      { status: 500 }
    );
  }
}

