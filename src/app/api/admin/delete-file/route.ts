import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function DELETE(request: NextRequest) {
  const { bucket, path } = await request.json();

  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}